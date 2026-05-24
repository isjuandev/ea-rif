import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const FEE_RATE = 0.0329;
const FEE_FIXED_PER_TRANSACTION = 800;

type ReportTotals = {
  soldNumbersCount: number;
  transactionsCount: number;
  grossCop: number;
  feeCop: number;
  netCop: number;
};

type ReportByDay = {
  date: string;
  soldNumbersCount: number;
  transactionsCount: number;
  grossCop: number;
  feeCop: number;
  netCop: number;
};

function toBogotaDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function emptyReportTotals(): ReportTotals {
  return {
    soldNumbersCount: 0,
    transactionsCount: 0,
    grossCop: 0,
    feeCop: 0,
    netCop: 0,
  };
}

export async function GET(request: Request) {
  if (!(await isAdminSessionAuthorized(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { config } = await getEditableRifaConfig();

  if (!supabase) {
    return NextResponse.json({
      soldNumbers: [],
      soldCount: 0,
      soldPercentage: 0,
      totalTickets: config.totalTickets,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      reportTotals: emptyReportTotals(),
      reportByDay: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { count, error: countError } = await supabase
    .from("rifa_tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "sold");

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("rifa_tickets")
    .select("number,buyer_name,buyer_whatsapp,buyer_email,sold_at,purchase_id")
    .eq("status", "sold")
    .order("sold_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: purchases, error: purchasesError } = await supabase
    .from("rifa_purchases")
    .select("amount_cop,ticket_count,created_at")
    .eq("status", "sold")
    .order("created_at", { ascending: true });

  if (purchasesError) return NextResponse.json({ error: purchasesError.message }, { status: 500 });

  const totals = (purchases ?? []).reduce(
    (acc, row) => {
      const gross = Number(row.amount_cop) || 0;
      const tickets = Number(row.ticket_count) || 0;
      acc.grossCop += gross;
      acc.soldNumbersCount += tickets;
      acc.transactionsCount += 1;
      return acc;
    },
    emptyReportTotals(),
  );

  totals.feeCop = Math.round(totals.grossCop * FEE_RATE + totals.transactionsCount * FEE_FIXED_PER_TRANSACTION);
  totals.netCop = totals.grossCop - totals.feeCop;

  const byDayMap = new Map<string, ReportByDay>();

  for (const row of purchases ?? []) {
    if (!row.created_at) continue;
    const dateKey = toBogotaDateKey(row.created_at);
    const gross = Number(row.amount_cop) || 0;
    const tickets = Number(row.ticket_count) || 0;
    const current = byDayMap.get(dateKey) ?? {
      date: dateKey,
      soldNumbersCount: 0,
      transactionsCount: 0,
      grossCop: 0,
      feeCop: 0,
      netCop: 0,
    };

    current.soldNumbersCount += tickets;
    current.transactionsCount += 1;
    current.grossCop += gross;
    byDayMap.set(dateKey, current);
  }

  const reportByDay = Array.from(byDayMap.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((item) => {
      const feeCop = Math.round(item.grossCop * FEE_RATE + item.transactionsCount * FEE_FIXED_PER_TRANSACTION);
      return { ...item, feeCop, netCop: item.grossCop - feeCop };
    });

  const soldCount = count ?? 0;
  const soldPercentage = config.totalTickets > 0 ? Math.round((soldCount / config.totalTickets) * 100) : 0;
  const totalPages = soldCount > 0 ? Math.ceil(soldCount / pageSize) : 0;

  return NextResponse.json({
    soldNumbers: data ?? [],
    soldCount,
    soldPercentage,
    totalTickets: config.totalTickets,
    page,
    pageSize,
    totalPages,
    reportTotals: totals,
    reportByDay,
  });
}

import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

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
  });
}

import { getEditableRifaConfig, saveEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const FEE_RATE = 0.0329;
const FEE_FIXED_PER_TRANSACTION = 800;

export type ReportTotals = {
  soldNumbersCount: number;
  transactionsCount: number;
  grossCop: number;
  feeCop: number;
  netCop: number;
};

export type ReportByDay = {
  date: string;
  soldNumbersCount: number;
  transactionsCount: number;
  grossCop: number;
  feeCop: number;
  netCop: number;
};

export type ReportSummary = {
  reportTotals: ReportTotals;
  reportByDay: ReportByDay[];
  cycleId: string;
  cycleReportDownloads: number;
  lastReportDownloadAt: string | null;
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

export async function getAdminReportSummary(): Promise<ReportSummary> {
  const supabase = getSupabaseAdmin();
  const { config } = await getEditableRifaConfig();

  if (!supabase) {
    return {
      reportTotals: emptyReportTotals(),
      reportByDay: [],
      cycleId: config.currentCycleId,
      cycleReportDownloads: config.currentCycleReportDownloads,
      lastReportDownloadAt: config.lastReportDownloadAt,
    };
  }

  const { data: purchases, error } = await supabase
    .from("rifa_purchases")
    .select("amount_cop,ticket_count,created_at")
    .eq("status", "sold")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const reportTotals = (purchases ?? []).reduce(
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

  reportTotals.feeCop = Math.round(reportTotals.grossCop * FEE_RATE + reportTotals.transactionsCount * FEE_FIXED_PER_TRANSACTION);
  reportTotals.netCop = reportTotals.grossCop - reportTotals.feeCop;

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

  return {
    reportTotals,
    reportByDay,
    cycleId: config.currentCycleId,
    cycleReportDownloads: config.currentCycleReportDownloads,
    lastReportDownloadAt: config.lastReportDownloadAt,
  };
}

export async function registerReportDownload() {
  const { config } = await getEditableRifaConfig();
  const updated = await saveEditableRifaConfig({
    ...config,
    currentCycleReportDownloads: (config.currentCycleReportDownloads ?? 0) + 1,
    lastReportDownloadAt: new Date().toISOString(),
  });

  return {
    cycleId: updated.currentCycleId,
    cycleReportDownloads: updated.currentCycleReportDownloads,
    lastReportDownloadAt: updated.lastReportDownloadAt,
  };
}

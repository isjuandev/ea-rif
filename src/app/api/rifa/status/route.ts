import { NextResponse } from "next/server";
import { getNextLotteryDrawDate } from "@/lib/lottery-results";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { config: rifaConfig } = await getEditableRifaConfig();
  const drawDate = await getNextLotteryDrawDate(rifaConfig.lotterySlug, rifaConfig).catch(() => null);

  if (!supabase) {
    return NextResponse.json({
      totalTickets: rifaConfig.totalTickets,
      soldTickets: rifaConfig.fallbackSoldTickets,
      availableTickets: rifaConfig.totalTickets - rifaConfig.fallbackSoldTickets,
      drawDate: drawDate ?? new Date(Date.now() + 1000).toISOString(),
      lotteryName: rifaConfig.lotteryName,
      lotterySlug: rifaConfig.lotterySlug,
      configured: false,
    });
  }

  const { count: soldCount, error: soldError } = await supabase
    .from("rifa_tickets")
    .select("number", { count: "exact", head: true })
    .eq("status", "sold");

  if (soldError) {
    return NextResponse.json({ error: soldError.message }, { status: 500 });
  }

  const { count: availableCount, error: availableError } = await supabase
    .from("rifa_tickets")
    .select("number", { count: "exact", head: true })
    .eq("status", "available");

  if (availableError) {
    return NextResponse.json({ error: availableError.message }, { status: 500 });
  }

  const soldTickets = soldCount ?? 0;
  const availableTickets = availableCount ?? Math.max(rifaConfig.totalTickets - soldTickets, 0);

  return NextResponse.json({
    totalTickets: rifaConfig.totalTickets,
    soldTickets,
    availableTickets,
    drawDate: drawDate ?? new Date(Date.now() + 1000).toISOString(),
    lotteryName: rifaConfig.lotteryName,
    lotterySlug: rifaConfig.lotterySlug,
    configured: true,
  });
}

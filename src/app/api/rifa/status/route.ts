import { NextResponse } from "next/server";
import { getNextDrawDate } from "@/lib/draw-date";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { config: rifaConfig } = await getEditableRifaConfig();
  const drawDate = getNextDrawDate(new Date(), rifaConfig);

  if (!supabase) {
    return NextResponse.json({
      totalTickets: rifaConfig.totalTickets,
      soldTickets: rifaConfig.fallbackSoldTickets,
      availableTickets: rifaConfig.totalTickets - rifaConfig.fallbackSoldTickets,
      drawDate,
      lotteryName: rifaConfig.lotteryName,
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
    drawDate,
    lotteryName: rifaConfig.lotteryName,
    configured: true,
  });
}

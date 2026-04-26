import { NextResponse } from "next/server";
import { rifaConfig } from "@/config/rifa";
import { getNextDrawDate } from "@/lib/draw-date";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const drawDate = getNextDrawDate();

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

  const { count, error } = await supabase
    .from("rifa_tickets")
    .select("number", { count: "exact", head: true })
    .eq("status", "sold");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const soldTickets = count ?? 0;

  return NextResponse.json({
    totalTickets: rifaConfig.totalTickets,
    soldTickets,
    availableTickets: rifaConfig.totalTickets - soldTickets,
    drawDate,
    lotteryName: rifaConfig.lotteryName,
    configured: true,
  });
}

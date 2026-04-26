import { NextResponse } from "next/server";
import { rifaConfig } from "@/config/rifa";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ winners: [], configured: false });
  }

  const { data, error } = await supabase
    .from("rifa_winners")
    .select("draw_date, lottery_name, major_number, minor_numbers, source")
    .order("draw_date", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ winners: data ?? [], configured: true });
}

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_DRAW_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");

  if (!adminSecret || requestSecret !== adminSecret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 });
  }

  const body = (await request.json()) as {
    drawDate: string;
    majorNumber?: string;
    source?: string;
  };

  if (!body.drawDate) {
    return NextResponse.json({ error: "drawDate es requerido." }, { status: 400 });
  }

  if (body.majorNumber && !/^\d{4}$/.test(body.majorNumber)) {
    return NextResponse.json({ error: "majorNumber debe tener 4 cifras." }, { status: 400 });
  }

  const { data: minorNumbers, error: minorError } = await supabase.rpc("pick_minor_prize_numbers", {
    p_count: rifaConfig.minorPrizeCount,
    p_exclude_number: body.majorNumber ?? null,
  });

  if (minorError) {
    return NextResponse.json({ error: minorError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("rifa_winners")
    .insert({
      draw_date: body.drawDate,
      lottery_name: rifaConfig.lotteryName,
      major_number: body.majorNumber ?? null,
      minor_numbers: minorNumbers ?? [],
      source: body.source ?? null,
    })
    .select("draw_date, lottery_name, major_number, minor_numbers, source")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ winner: data });
}

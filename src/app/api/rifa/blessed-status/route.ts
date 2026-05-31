import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numbersParam = searchParams.get("numbers");
  if (!numbersParam) {
    return NextResponse.json({ soldNumbers: [] });
  }

  const numbers = numbersParam.split(",").filter(Boolean);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ soldNumbers: [] });
  }

  const { data } = await supabase
    .from("rifa_tickets")
    .select("number")
    .in("number", numbers)
    .eq("status", "sold");

  return NextResponse.json({
    soldNumbers: data?.map((t) => t.number) ?? [],
  });
}

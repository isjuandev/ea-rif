import { NextResponse } from "next/server";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numbersParam = searchParams.get("numbers");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ releasedNumbers: [], soldNumbers: [], threshold: 0 });
  }

  const { config: rifaConfig } = await getEditableRifaConfig();
  const threshold = rifaConfig.blessedReleaseThreshold ?? 0;

  let releasedNumbers: string[] = [];
  let soldNumbers: string[] = [];

  if (threshold > 0) {
    const blessedNumbers = numbersParam ? numbersParam.split(",").filter(Boolean) : [];

    const { data: releases } = await supabase
      .from("rifa_blessed_releases")
      .select("number, released_at, sold_at")
      .in("number", blessedNumbers.length > 0 ? blessedNumbers : [""]);

    if (releases) {
      releasedNumbers = releases.filter((r) => r.released_at).map((r) => r.number);
      soldNumbers = releases.filter((r) => r.sold_at).map((r) => r.number);
    }
  } else {
    // threshold = 0 → all blessed numbers are visible
    const numbers = numbersParam ? numbersParam.split(",").filter(Boolean) : [];
    releasedNumbers = numbers;

    if (numbers.length > 0) {
      const { data } = await supabase
        .from("rifa_tickets")
        .select("number")
        .in("number", numbers)
        .eq("status", "sold");

      soldNumbers = data?.map((t) => t.number) ?? [];
    }
  }

  return NextResponse.json({ releasedNumbers, soldNumbers, threshold });
}

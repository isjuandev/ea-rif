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
    return NextResponse.json({ soldNumbers: [], soldCount: 0, soldPercentage: 0, totalTickets: config.totalTickets });
  }

  const { data, error } = await supabase
    .from("rifa_tickets")
    .select("number,buyer_name,buyer_whatsapp,sold_at,purchase_id")
    .eq("status", "sold")
    .order("sold_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const soldCount = data?.length ?? 0;
  const soldPercentage = config.totalTickets > 0 ? Math.round((soldCount / config.totalTickets) * 100) : 0;

  return NextResponse.json({
    soldNumbers: data ?? [],
    soldCount,
    soldPercentage,
    totalTickets: config.totalTickets,
  });
}


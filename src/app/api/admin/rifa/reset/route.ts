import { NextResponse } from "next/server";
import { rifaConfig } from "@/config/rifa";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { getEditableRifaConfig, saveEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function runDeleteAll(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  table: string,
  whereColumn: string,
  whereValue: string,
) {
  const { error } = await supabase.from(table).delete().neq(whereColumn, whereValue);
  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  if (!(await isAdminSessionAuthorized(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no esta configurado en el servidor." }, { status: 503 });
  }

  try {
    const { config: currentConfig } = await getEditableRifaConfig();

    if ((currentConfig.currentCycleReportDownloads ?? 0) < 1) {
      return NextResponse.json(
        { error: "Debes descargar al menos un reporte financiero del ciclo actual antes de reiniciar la rifa." },
        { status: 400 },
      );
    }

    const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
    await runDeleteAll(supabase, "mercado_pago_payment_events", "id", ZERO_UUID);
    await runDeleteAll(supabase, "mercado_pago_payments", "id", ZERO_UUID);
    await runDeleteAll(supabase, "rifa_winners", "id", ZERO_UUID);
    await runDeleteAll(supabase, "rifa_purchases", "id", ZERO_UUID);

    const { error: resetTicketsError } = await supabase
      .from("rifa_tickets")
      .update({
        status: "available",
        purchase_id: null,
        buyer_name: null,
        buyer_whatsapp: null,
        buyer_email: null,
        sold_at: null,
      })
      .neq("number", "");

    if (resetTicketsError) {
      throw new Error(resetTicketsError.message);
    }

    const { error: regenerateError } = await supabase.rpc("regenerate_rifa_tickets_for_digits", {
      p_total_cifras: rifaConfig.totalCifras,
    });

    if (regenerateError) {
      throw new Error(regenerateError.message);
    }

    const nextCycleId = crypto.randomUUID();
    const nextConfig = await saveEditableRifaConfig({
      ...rifaConfig,
      currentCycleId: nextCycleId,
      currentCycleReportDownloads: 0,
      lastReportDownloadAt: null,
      nextDrawDateOverride: null,
      activityClosed: false,
      blessedNumbers: [],
      blessedPrizes: [],
      previousWinners: [],
      fallbackSoldTickets: 0,
    });

    return NextResponse.json({
      ok: true,
      message: "Rifa reiniciada. Configura nuevamente para iniciar un nuevo ciclo.",
      config: nextConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo reiniciar la rifa." }, { status: 500 });
  }
}

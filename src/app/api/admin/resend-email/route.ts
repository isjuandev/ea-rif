import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { sendTicketEmail } from "@/lib/email";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminSessionAuthorized(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 500 });
  }

  const { purchaseId } = await request.json();
  if (!purchaseId || typeof purchaseId !== "string") {
    return NextResponse.json({ error: "purchaseId es requerido." }, { status: 400 });
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("rifa_purchases")
    .select("buyer_name, buyer_email, package_name, amount_cop, ticket_numbers")
    .eq("id", purchaseId)
    .maybeSingle();

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  if (!purchase) {
    return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });
  }

  if (!purchase.buyer_email) {
    return NextResponse.json({ error: "La compra no tiene email registrado." }, { status: 400 });
  }

  const { config } = await getEditableRifaConfig();

  const email = await sendTicketEmail({
    to: purchase.buyer_email,
    name: purchase.buyer_name,
    packageName: purchase.package_name,
    price: purchase.amount_cop,
    numbers: purchase.ticket_numbers,
    eventName: config.eventName,
    lotteryName: config.lotteryName,
  });

  if (!email.sent) {
    return NextResponse.json({ error: email.error || "No se pudo reenviar el correo." }, { status: 502 });
  }

  await supabase.from("rifa_purchases").update({ email_sent_at: new Date().toISOString() }).eq("id", purchaseId);

  return NextResponse.json({ sent: true, messageId: email.messageId });
}

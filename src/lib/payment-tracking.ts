import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MercadoPagoEventSource = "payment_api" | "webhook" | "sync" | "system";

export async function upsertMercadoPagoPaymentRecord({
  payment,
  buyer,
}: {
  payment: any;
  buyer?: {
    name?: string;
    email?: string;
    whatsapp?: string;
  };
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !payment?.id) return;

  const metadata = payment.metadata ?? {};

  await supabase.from("mercado_pago_payments").upsert(
    {
      mp_payment_id: String(payment.id),
      external_reference: payment.external_reference ?? null,
      package_id: metadata.package_id || metadata.packageId || null,
      buyer_name: buyer?.name || metadata.buyer_name || metadata.buyerName || null,
      buyer_email: buyer?.email || metadata.buyer_email || metadata.buyerEmail || payment.payer?.email || null,
      buyer_whatsapp: buyer?.whatsapp || metadata.buyer_whatsapp || metadata.buyerWhatsapp || null,
      amount_cop: payment.transaction_amount ? Math.round(Number(payment.transaction_amount)) : null,
      payment_method_id: payment.payment_method_id ?? null,
      status: payment.status ?? null,
      status_detail: payment.status_detail ?? null,
      approved_at: payment.date_approved ?? null,
      last_seen_at: new Date().toISOString(),
      raw_payment: payment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "mp_payment_id" },
  );
}

export async function logMercadoPagoEvent({
  mpPaymentId,
  source,
  topic,
  action,
  status,
  statusDetail,
  payload,
}: {
  mpPaymentId?: string | null;
  source: MercadoPagoEventSource;
  topic?: string | null;
  action?: string | null;
  status?: string | null;
  statusDetail?: string | null;
  payload?: unknown;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("mercado_pago_payment_events").insert({
    mp_payment_id: mpPaymentId ?? null,
    event_source: source,
    topic: topic ?? null,
    action: action ?? null,
    status: status ?? null,
    status_detail: statusDetail ?? null,
    payload: payload ?? {},
  });
}

export async function linkRifaPurchaseToPayment({
  mpPaymentId,
  purchaseId,
}: {
  mpPaymentId: string;
  purchaseId?: string | null;
}) {
  if (!purchaseId) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from("mercado_pago_payments")
    .update({ rifa_purchase_id: purchaseId, updated_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
    .eq("mp_payment_id", mpPaymentId);
}

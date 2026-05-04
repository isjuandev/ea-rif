import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { fulfillApprovedMercadoPagoPayment } from "@/lib/mercadopago-fulfillment";
import { logMercadoPagoEvent, upsertMercadoPagoPaymentRecord } from "@/lib/payment-tracking";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const FINAL_DECLINED_STATUSES = new Set(["cancelled", "rejected", "refunded", "charged_back"]);
const STATUS_CHECK_THROTTLE_MS = 60_000;
const FINAL_FULFILLMENT_ERROR_PATTERNS = [
  "ticket_count must be between",
  "la cantidad de rifas es invalida",
  "el pago aprobado no coincide con el paquete comprado",
  "el pago aprobado no trae metadata suficiente",
];

async function getExistingPurchase(mpPaymentId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("rifa_purchases")
    .select("id,ticket_numbers")
    .eq("mercado_pago_payment_id", mpPaymentId)
    .maybeSingle();

  return data;
}

async function shouldLogStatusCheck(mpPaymentId: string, status?: string | null, statusDetail?: string | null) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return true;

  const { data } = await supabase
    .from("mercado_pago_payment_events")
    .select("status,status_detail,created_at")
    .eq("mp_payment_id", mpPaymentId)
    .eq("event_source", "sync")
    .eq("action", "status_check")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return true;
  if (data.status !== (status ?? null) || data.status_detail !== (statusDetail ?? null)) return true;

  const lastCreatedAt = Date.parse(String(data.created_at));
  if (!Number.isFinite(lastCreatedAt)) return true;
  return Date.now() - lastCreatedAt >= STATUS_CHECK_THROTTLE_MS;
}

function isFinalFulfillmentError(error: unknown) {
  const text = String((error as any)?.cause?.message || (error as any)?.message || "").toLowerCase();
  return FINAL_FULFILLMENT_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const paymentClient = getMercadoPagoPayment();

    if (!paymentClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const payment = await paymentClient.get({ id });
    const mpPaymentId = String(payment.id ?? id);

    await upsertMercadoPagoPaymentRecord({ payment });
    if (await shouldLogStatusCheck(mpPaymentId, payment.status ?? null, payment.status_detail ?? null)) {
      await logMercadoPagoEvent({
        mpPaymentId,
        source: "sync",
        topic: "payment",
        action: "status_check",
        status: payment.status ?? null,
        statusDetail: payment.status_detail ?? null,
        payload: { requestedId: id },
      });
    }

    if (payment.status === "approved") {
      const existingPurchase = await getExistingPurchase(mpPaymentId);

      if (existingPurchase) {
        return NextResponse.json({
          approved: true,
          final: true,
          paymentId: mpPaymentId,
          status: payment.status,
          statusDetail: payment.status_detail,
          purchaseId: existingPurchase.id,
          ticketNumbers: existingPurchase.ticket_numbers ?? [],
        });
      }

      let result;
      try {
        result = await fulfillApprovedMercadoPagoPayment(payment, "sync");
      } catch (fulfillmentError: any) {
        const final = isFinalFulfillmentError(fulfillmentError);
        return NextResponse.json(
          {
            approved: false,
            final,
            paymentId: mpPaymentId,
            status: payment.status,
            statusDetail: payment.status_detail,
            message: final
              ? "El pago fue aprobado pero no se pudo asignar boletas por una validacion del sistema."
              : "El pago fue aprobado, pero estamos reintentando la asignacion de boletas.",
            error: fulfillmentError?.cause?.message || fulfillmentError?.message || "Error procesando compra aprobada.",
          },
          { status: 200 },
        );
      }

      return NextResponse.json({
        approved: true,
        final: true,
        paymentId: mpPaymentId,
        status: payment.status,
        statusDetail: payment.status_detail,
        purchaseId: result.purchaseId,
        ticketNumbers: result.ticketNumbers,
      });
    }

    const final = FINAL_DECLINED_STATUSES.has(String(payment.status));

    return NextResponse.json({
      approved: false,
      final,
      paymentId: mpPaymentId,
      status: payment.status,
      statusDetail: payment.status_detail,
      message: final
        ? "Mercado Pago no aprobo el pago."
        : "El pago fue creado pero aún no esta aprobado.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.cause?.message || error?.message || "No se pudo consultar el estado del pago.",
        details: error?.cause ?? null,
      },
      { status: 500 },
    );
  }
}

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
    await logMercadoPagoEvent({
      mpPaymentId,
      source: "sync",
      topic: "payment",
      action: "status_check",
      status: payment.status ?? null,
      statusDetail: payment.status_detail ?? null,
      payload: { requestedId: id },
    });

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

      const result = await fulfillApprovedMercadoPagoPayment(payment, "sync");

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
        : "El pago fue creado pero aun no esta aprobado.",
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

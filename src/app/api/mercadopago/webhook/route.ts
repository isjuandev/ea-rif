import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { fulfillApprovedMercadoPagoPayment } from "@/lib/mercadopago-fulfillment";
import { logMercadoPagoEvent, upsertMercadoPagoPaymentRecord } from "@/lib/payment-tracking";

export const dynamic = "force-dynamic";

type MercadoPagoWebhook = {
  type?: string;
  action?: string;
  data?: {
    id?: string;
  };
};

function getPaymentId(requestUrl: string, body: MercadoPagoWebhook) {
  const url = new URL(requestUrl);
  return body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
}

async function safeLogMercadoPagoEvent(input: Parameters<typeof logMercadoPagoEvent>[0]) {
  await logMercadoPagoEvent(input).catch(() => undefined);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as MercadoPagoWebhook;
  const url = new URL(request.url);
  const topic = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
  const paymentId = getPaymentId(request.url, body);

  const paymentClient = getMercadoPagoPayment();

  if (!paymentClient) {
    await safeLogMercadoPagoEvent({
      mpPaymentId: paymentId || null,
      source: "webhook",
      topic: topic ?? null,
      action: body.action ?? "configuration_error",
      status: "error",
      payload: body,
    });
    return NextResponse.json({ error: "Mercado Pago no esta configurado." }, { status: 503 });
  }

  if (topic !== "payment" || !paymentId) {
    await safeLogMercadoPagoEvent({
      mpPaymentId: paymentId || null,
      source: "webhook",
      topic: topic ?? null,
      action: body.action ?? "ignored",
      status: "ignored",
      payload: body,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const payment = await paymentClient.get({ id: paymentId }).catch(async (error: any) => {
    await safeLogMercadoPagoEvent({
      mpPaymentId: String(paymentId),
      source: "webhook",
      topic,
      action: body.action ?? "payment_lookup_failed",
      status: "lookup_failed",
      payload: {
        notification: body,
        error: error?.cause ?? error?.message ?? error,
      },
    });
    return null;
  });

  if (!payment) {
    return NextResponse.json({
      received: true,
      ignored: true,
      paymentId: String(paymentId),
      reason: "payment_not_found_or_unavailable",
    });
  }

  const mpPaymentId = String(payment.id ?? paymentId);

  await upsertMercadoPagoPaymentRecord({ payment }).catch(() => undefined);
  await safeLogMercadoPagoEvent({
    mpPaymentId,
    source: "webhook",
    topic,
    action: body.action ?? "notification",
    status: payment.status ?? null,
    statusDetail: payment.status_detail ?? null,
    payload: body,
  });

  if (payment.status !== "approved") {
    return NextResponse.json({ received: true, paymentId: mpPaymentId, status: payment.status });
  }

  const result = await fulfillApprovedMercadoPagoPayment(payment, "webhook");

  return NextResponse.json({
    received: true,
    paymentId: mpPaymentId,
    purchaseId: result.purchaseId,
    ticketNumbers: result.ticketNumbers,
  });
}

export async function GET(request: Request) {
  return POST(request);
}

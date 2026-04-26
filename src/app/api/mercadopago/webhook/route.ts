import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { linkRifaPurchaseToPayment, logMercadoPagoEvent, upsertMercadoPagoPaymentRecord } from "@/lib/payment-tracking";
import { fulfillTicketPurchase } from "@/lib/tickets";

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

export async function POST(request: Request) {
  const paymentClient = getMercadoPagoPayment();

  if (!paymentClient) {
    return NextResponse.json({ error: "Mercado Pago no esta configurado." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as MercadoPagoWebhook;
  const url = new URL(request.url);
  const topic = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
  const paymentId = getPaymentId(request.url, body);

  if (topic !== "payment" || !paymentId) {
    await logMercadoPagoEvent({
      mpPaymentId: paymentId || null,
      source: "webhook",
      topic: topic ?? null,
      action: body.action ?? "ignored",
      status: "ignored",
      payload: body,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const payment = await paymentClient.get({ id: paymentId });
  const mpPaymentId = String(payment.id ?? paymentId);

  await upsertMercadoPagoPaymentRecord({ payment });
  await logMercadoPagoEvent({
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

  const metadata = payment.metadata ?? {};
  const packageId = metadata.package_id || metadata.packageId;
  const buyerName = metadata.buyer_name || metadata.buyerName;
  const buyerWhatsapp = metadata.buyer_whatsapp || metadata.buyerWhatsapp;
  const buyerEmail = metadata.buyer_email || metadata.buyerEmail || payment.payer?.email;

  if (!packageId || !buyerName || !buyerWhatsapp || !buyerEmail) {
    await logMercadoPagoEvent({
      mpPaymentId,
      source: "webhook",
      topic,
      action: "missing_metadata",
      status: "approved",
      statusDetail: "metadata_incomplete",
      payload: { metadata, payer: payment.payer },
    });
    return NextResponse.json({ error: "El pago aprobado no trae metadata suficiente." }, { status: 400 });
  }

  const result = await fulfillTicketPurchase({
    packageId,
    buyerName,
    buyerWhatsapp,
    buyerEmail,
    paymentMethod: "mercado_pago",
    mercadoPagoPaymentId: mpPaymentId,
  });

  await linkRifaPurchaseToPayment({
    mpPaymentId,
    purchaseId: result.purchaseId,
  });

  await logMercadoPagoEvent({
    mpPaymentId,
    source: "webhook",
    topic,
    action: "fulfillment",
    status: "sold",
    statusDetail: "tickets_assigned",
    payload: {
      purchaseId: result.purchaseId,
      ticketNumbers: result.ticketNumbers,
    },
  });

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

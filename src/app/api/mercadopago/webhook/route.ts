import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
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
    return NextResponse.json({ received: true, ignored: true });
  }

  const payment = await paymentClient.get({ id: paymentId });

  if (payment.status !== "approved") {
    return NextResponse.json({ received: true, status: payment.status });
  }

  const metadata = payment.metadata ?? {};
  const packageId = metadata.package_id || metadata.packageId;
  const buyerName = metadata.buyer_name || metadata.buyerName;
  const buyerWhatsapp = metadata.buyer_whatsapp || metadata.buyerWhatsapp;
  const buyerEmail = metadata.buyer_email || metadata.buyerEmail || payment.payer?.email;

  if (!packageId || !buyerName || !buyerWhatsapp || !buyerEmail) {
    return NextResponse.json({ error: "El pago aprobado no trae metadata suficiente." }, { status: 400 });
  }

  const result = await fulfillTicketPurchase({
    packageId,
    buyerName,
    buyerWhatsapp,
    buyerEmail,
    paymentMethod: "mercado_pago",
    mercadoPagoPaymentId: String(payment.id ?? paymentId),
  });

  return NextResponse.json({
    received: true,
    purchaseId: result.purchaseId,
    ticketNumbers: result.ticketNumbers,
  });
}

export async function GET(request: Request) {
  return POST(request);
}

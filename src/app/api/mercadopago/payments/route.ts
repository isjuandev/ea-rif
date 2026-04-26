import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { rifaConfig } from "@/config/rifa";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { linkRifaPurchaseToPayment, logMercadoPagoEvent, upsertMercadoPagoPaymentRecord } from "@/lib/payment-tracking";
import { fulfillTicketPurchase, normalizeWhatsApp } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type MercadoPagoPaymentPayload = {
  packageId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail: string;
  formData: {
    token?: string;
    issuer_id?: string | number;
    payment_method_id?: string;
    transaction_amount?: number;
    installments?: number;
    payer?: {
      email?: string;
      identification?: {
        type?: string;
        number?: string;
      };
    };
    transaction_details?: {
      financial_institution?: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    const paymentClient = getMercadoPagoPayment();

    if (!paymentClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const payload = (await request.json()) as MercadoPagoPaymentPayload;
    const selectedPackage = rifaConfig.packages.find((pack) => pack.id === payload.packageId);

    if (!selectedPackage) {
      return NextResponse.json({ error: "Paquete invalido." }, { status: 400 });
    }

    if (!payload.formData || !payload.buyerName || !payload.buyerEmail || normalizeWhatsApp(payload.buyerWhatsapp).length < 12) {
      return NextResponse.json({ error: "Datos del comprador incompletos." }, { status: 400 });
    }

    const amount = Number(payload.formData.transaction_amount ?? selectedPackage.price);

    if (amount !== selectedPackage.price) {
      return NextResponse.json({ error: "El valor del pago no coincide con el paquete." }, { status: 400 });
    }

    if (!payload.formData.payment_method_id) {
      return NextResponse.json({ error: "Mercado Pago no retorno payment_method_id." }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;

    const payment = await paymentClient.create({
      body: {
        token: payload.formData.token,
        issuer_id: payload.formData.issuer_id ? Number(payload.formData.issuer_id) : undefined,
        payment_method_id: payload.formData.payment_method_id,
        transaction_amount: selectedPackage.price,
        installments: payload.formData.installments ? Number(payload.formData.installments) : 1,
        description: `${rifaConfig.eventName} - ${selectedPackage.name}`,
        statement_descriptor: "RIFAS WALLPAPERS",
        external_reference: `${selectedPackage.id}:${randomUUID()}`,
        notification_url: `${origin}/api/mercadopago/webhook`,
        metadata: {
          package_id: selectedPackage.id,
          buyer_name: payload.buyerName,
          buyer_whatsapp: normalizeWhatsApp(payload.buyerWhatsapp),
          buyer_email: payload.buyerEmail,
        },
        payer: {
          email: payload.formData.payer?.email || payload.buyerEmail,
          identification: payload.formData.payer?.identification,
        },
        additional_info: {
          items: [
            {
              id: selectedPackage.id,
              title: `${rifaConfig.eventName} - ${selectedPackage.name}`,
              description: `${selectedPackage.wallpapers} wallpapers + ${selectedPackage.rifas} numeros de rifa`,
              quantity: 1,
              unit_price: selectedPackage.price,
            },
          ],
        },
        transaction_details: payload.formData.transaction_details,
      },
      requestOptions: {
        idempotencyKey: randomUUID(),
      },
    });

    await upsertMercadoPagoPaymentRecord({
      payment,
      buyer: {
        name: payload.buyerName,
        email: payload.buyerEmail,
        whatsapp: normalizeWhatsApp(payload.buyerWhatsapp),
      },
    });

    await logMercadoPagoEvent({
      mpPaymentId: payment.id ? String(payment.id) : null,
      source: "payment_api",
      topic: "payment",
      action: "create",
      status: payment.status ?? null,
      statusDetail: payment.status_detail ?? null,
      payload: {
        packageId: selectedPackage.id,
        transactionAmount: selectedPackage.price,
        externalReference: payment.external_reference ?? null,
      },
    });

    if (payment.status !== "approved") {
      return NextResponse.json({
        approved: false,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        message: "El pago fue creado pero aun no esta aprobado.",
      });
    }

    const result = await fulfillTicketPurchase({
      packageId: selectedPackage.id,
      buyerName: payload.buyerName,
      buyerWhatsapp: payload.buyerWhatsapp,
      buyerEmail: payload.buyerEmail,
      paymentMethod: "mercado_pago",
      mercadoPagoPaymentId: String(payment.id),
    });

    await linkRifaPurchaseToPayment({
      mpPaymentId: String(payment.id),
      purchaseId: result.purchaseId,
    });

    await logMercadoPagoEvent({
      mpPaymentId: String(payment.id),
      source: "payment_api",
      topic: "payment",
      action: "fulfillment",
      status: "sold",
      statusDetail: "tickets_assigned",
      payload: {
        purchaseId: result.purchaseId,
        ticketNumbers: result.ticketNumbers,
      },
    });

    return NextResponse.json({
      approved: true,
      paymentId: payment.id,
      status: payment.status,
      purchaseId: result.purchaseId,
      ticketNumbers: result.ticketNumbers,
    });
  } catch (error: any) {
    const cause =
      error?.cause?.message ||
      error?.cause?.error ||
      error?.message ||
      "Error interno al procesar pago con Mercado Pago.";

    return NextResponse.json(
      {
        error: cause,
        details: error?.cause ?? null,
      },
      { status: 500 },
    );
  }
}

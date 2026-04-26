import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { rifaConfig } from "@/config/rifa";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { fulfillApprovedMercadoPagoPayment } from "@/lib/mercadopago-fulfillment";
import { logMercadoPagoEvent, upsertMercadoPagoPaymentRecord } from "@/lib/payment-tracking";
import { normalizeWhatsApp } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const MERCADO_PAGO_MIN_CARD_AMOUNT = 1000;

type MercadoPagoPaymentPayload = {
  packageId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail: string;
  formData: {
    token?: string;
    issuer_id?: string | number;
    payment_method_id?: string;
    entity_type?: string;
    financial_institution?: string;
    transaction_amount?: number;
    installments?: number;
    payer?: {
      email?: string;
      entity_type?: string;
      identification?: {
        type?: string;
        number?: string;
      };
    };
    transaction_details?: {
      financial_institution?: string;
    };
    additional_info?: {
      payer?: {
        first_name?: string;
        last_name?: string;
      };
    };
  };
};

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: trimmed || "Cliente", lastName: "Rifa" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeEntityType(value?: string) {
  if (!value) return "individual";
  const normalized = value.toLowerCase();
  return normalized === "association" ? "association" : "individual";
}

function isPsePaymentMethod(paymentMethodId?: string) {
  return (paymentMethodId || "").toLowerCase() === "pse";
}

function extractEntityType(formData: MercadoPagoPaymentPayload["formData"]) {
  return formData.payer?.entity_type || formData.entity_type;
}

function extractIdentification(formData: MercadoPagoPaymentPayload["formData"]) {
  return {
    type: formData.payer?.identification?.type,
    number: formData.payer?.identification?.number,
  };
}

function extractFinancialInstitution(formData: MercadoPagoPaymentPayload["formData"]) {
  return formData.transaction_details?.financial_institution || formData.financial_institution;
}

function countLetters(value: string) {
  return (value.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

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

    const normalizedBuyerWhatsapp = normalizeWhatsApp(payload.buyerWhatsapp);
    const localBuyerWhatsapp = normalizedBuyerWhatsapp.startsWith("57") ? normalizedBuyerWhatsapp.slice(2) : normalizedBuyerWhatsapp;

    if (
      !payload.formData ||
      countLetters(payload.buyerName || "") < 4 ||
      localBuyerWhatsapp.length !== 10 ||
      !isValidEmail(payload.buyerEmail || "")
    ) {
      return NextResponse.json({ error: "Datos del comprador incompletos." }, { status: 400 });
    }

    const amount = Number(payload.formData.transaction_amount ?? selectedPackage.price);

    if (amount !== selectedPackage.price) {
      return NextResponse.json({ error: "El valor del pago no coincide con el paquete." }, { status: 400 });
    }

    if (selectedPackage.price < MERCADO_PAGO_MIN_CARD_AMOUNT) {
      return NextResponse.json(
        {
          error: `Mercado Pago solo esta disponible desde ${MERCADO_PAGO_MIN_CARD_AMOUNT} COP.`,
        },
        { status: 400 },
      );
    }

    if (!payload.formData.payment_method_id) {
      return NextResponse.json({ error: "Mercado Pago no retorno payment_method_id." }, { status: 400 });
    }

    const pse = isPsePaymentMethod(payload.formData.payment_method_id);
    const entityTypeRaw = extractEntityType(payload.formData);
    const identification = extractIdentification(payload.formData);
    const financialInstitution = extractFinancialInstitution(payload.formData);
    if (pse) {
      const hasEntityType = Boolean(entityTypeRaw);
      const hasIdType = Boolean(identification.type);
      const hasIdNumber = Boolean(identification.number);
      const hasBank = Boolean(financialInstitution);

      if (!hasEntityType) {
        return NextResponse.json({ error: "Para PSE, payer.entity_type es obligatorio (individual o association)." }, { status: 400 });
      }
      if (!hasIdType || !hasIdNumber) {
        return NextResponse.json({ error: "Para PSE, payer.identification.type y payer.identification.number son obligatorios." }, { status: 400 });
      }
      if (!hasBank) {
        return NextResponse.json({ error: "Para PSE, transaction_details.financial_institution es obligatorio." }, { status: 400 });
      }
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;
    const { firstName, lastName } = splitName(payload.buyerName);
    const payerEntityType = normalizeEntityType(entityTypeRaw);

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
        callback_url: `${origin}/pago/estado`,
        metadata: {
          package_id: selectedPackage.id,
          buyer_name: payload.buyerName,
          buyer_whatsapp: normalizeWhatsApp(payload.buyerWhatsapp),
          buyer_email: payload.buyerEmail,
        },
        payer: {
          email: payload.formData.payer?.email || payload.buyerEmail,
          entity_type: payerEntityType,
          first_name: payload.formData.additional_info?.payer?.first_name || firstName,
          last_name: payload.formData.additional_info?.payer?.last_name || lastName,
          identification,
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
        transaction_details: {
          financial_institution: financialInstitution,
        },
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
      const externalResourceUrl = payment.transaction_details?.external_resource_url ?? null;
      return NextResponse.json({
        approved: false,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalResourceUrl,
        statusUrl: payment.id ? `/pago/estado?id=${encodeURIComponent(String(payment.id))}` : "/pago/estado",
        message: "El pago fue creado pero aun no esta aprobado.",
      });
    }

    const result = await fulfillApprovedMercadoPagoPayment(payment, "payment_api");

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

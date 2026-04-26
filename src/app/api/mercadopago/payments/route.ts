import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { fulfillApprovedMercadoPagoPayment } from "@/lib/mercadopago-fulfillment";
import { logMercadoPagoEvent, upsertMercadoPagoPaymentRecord } from "@/lib/payment-tracking";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { normalizeWhatsApp } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const MERCADO_PAGO_MIN_CARD_AMOUNT = 1000;

function shouldSendMercadoPagoTestToken() {
  return process.env.MERCADO_PAGO_TEST_TOKEN === "true" || process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") === true;
}

type MercadoPagoPaymentPayload = {
  packageId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail: string;
  buyerAddress?: {
    zipCode?: string;
    streetName?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    federalUnit?: string;
  };
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
      ip_address?: string;
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

function validationError(message: string, detail: string, status = 400) {
  return NextResponse.json({ error: `${message} ${detail}` }, { status });
}

function formatMercadoPagoError(error: any) {
  const rawMessage = error?.cause?.message || error?.cause?.error || error?.message;
  const rawDetails = Array.isArray(error?.cause) ? error.cause : error?.cause?.cause;
  const detailMessages = Array.isArray(rawDetails)
    ? rawDetails
        .map((detail) => detail?.description || detail?.message || detail?.code)
        .filter(Boolean)
        .join(" ")
    : "";
  const combined = [rawMessage, detailMessages].filter(Boolean).join(" ");
  const lowerCombined = combined.toLowerCase();

  if (lowerCombined.includes("ip_address")) {
    return "No pudimos iniciar el pago por PSE porque Mercado Pago no recibio la IP del comprador. Si estas probando manualmente, envia formData.additional_info.ip_address; en produccion revisa que el proxy envie x-forwarded-for, x-real-ip o cf-connecting-ip.";
  }

  if (lowerCombined.includes("financial_institution")) {
    return "No pudimos iniciar el pago por PSE porque falta el banco o el codigo del banco no es valido. Vuelve a seleccionar la entidad financiera e intenta de nuevo.";
  }

  if (lowerCombined.includes("identification")) {
    return "No pudimos iniciar el pago por PSE porque el tipo o numero de documento no fue aceptado por Mercado Pago. Revisa que el documento tenga entre 1 y 15 caracteres y corresponda al tipo seleccionado.";
  }

  if (lowerCombined.includes("callback_url") || lowerCombined.includes("notification_url")) {
    return "No pudimos iniciar el pago por PSE porque la URL publica del sitio no esta configurada correctamente. Configura NEXT_PUBLIC_SITE_URL con una URL HTTPS publica.";
  }

  if (lowerCombined.includes("address") || lowerCombined.includes("zip_code") || lowerCombined.includes("street")) {
    return "No pudimos iniciar el pago por PSE porque Mercado Pago no acepto la direccion. Usa codigo postal de 5 digitos, calle de maximo 18 caracteres, numero de maximo 5, barrio, ciudad y departamento.";
  }

  if (lowerCombined.includes("internal_error")) {
    return "Mercado Pago devolvio internal_error al crear el pago PSE. Si estas usando credenciales TEST, verifica que el deploy tenga MERCADO_PAGO_TEST_TOKEN=true o un access token TEST- para enviar X-Test-Token:true; si ya esta activo, prueba con otro banco sandbox o genera el pago desde el checkout para que el Brick entregue todos los datos.";
  }

  return combined
    ? `Mercado Pago rechazo la solicitud de pago. Detalle: ${combined}`
    : "Mercado Pago rechazo la solicitud de pago. Revisa los datos del comprador y vuelve a intentarlo.";
}

function normalizePublicBaseUrl(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname || url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getPublicBaseUrl(request: Request) {
  const configuredUrl = normalizePublicBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredUrl) return configuredUrl;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedUrl = forwardedHost ? normalizePublicBaseUrl(`${forwardedProto}://${forwardedHost}`) : null;
  if (forwardedUrl) return forwardedUrl;

  return normalizePublicBaseUrl(request.headers.get("origin")) || normalizePublicBaseUrl(new URL(request.url).origin);
}

function sanitizeIpAddress(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
  return trimmed.replace(/^\[|\]$/g, "");
}

function isLikelyIpv4(value?: string | null) {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function firstIpv4(values: Array<string | null | undefined>) {
  return values.find((value) => isLikelyIpv4(value)) || null;
}

function getBuyerIpAddress(request: Request, formData: MercadoPagoPaymentPayload["formData"]) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedForIps = forwardedFor?.split(",").map((part) => sanitizeIpAddress(part)) ?? [];

  const forwarded = request.headers.get("forwarded");
  const forwardedIp = forwarded
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("for="))
    ?.slice(4)
    .replace(/^"|"$/g, "");

  return (
    firstIpv4([
      sanitizeIpAddress(request.headers.get("cf-connecting-ip")),
      sanitizeIpAddress(request.headers.get("x-real-ip")),
      sanitizeIpAddress(request.headers.get("true-client-ip")),
      ...forwardedForIps,
      sanitizeIpAddress(forwardedIp),
      sanitizeIpAddress(formData.additional_info?.ip_address),
    ]) ||
    sanitizeIpAddress(formData.additional_info?.ip_address) ||
    "127.0.0.1"
  );
}

function trimLength(value: string | undefined, maxLength: number) {
  return (value || "").trim().slice(0, maxLength);
}

function getPseAddress(address: MercadoPagoPaymentPayload["buyerAddress"]) {
  return {
    zip_code: trimLength(address?.zipCode?.replace(/\D/g, ""), 5) || "00000",
    street_name: trimLength(address?.streetName, 18),
    street_number: trimLength(address?.streetNumber, 5) || "1",
    neighborhood: trimLength(address?.neighborhood, 18) || "Centro",
    city: trimLength(address?.city, 18),
    federal_unit: trimLength(address?.federalUnit, 18),
  };
}

function getPsePhone(whatsapp: string) {
  const localNumber = normalizeWhatsApp(whatsapp).replace(/^57/, "").replace(/\D/g, "").slice(0, 10);
  return {
    area_code: localNumber.slice(0, 3),
    number: localNumber.slice(3, 10),
  };
}

export async function POST(request: Request) {
  try {
    const paymentClient = getMercadoPagoPayment();

    if (!paymentClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const payload = (await request.json()) as MercadoPagoPaymentPayload;
    const { config: rifaConfig } = await getEditableRifaConfig();
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
      return validationError(
        "Datos del comprador incompletos.",
        "Verifica que el nombre tenga al menos 4 letras, el WhatsApp tenga 10 digitos colombianos y el correo sea valido.",
      );
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
    const buyerIpAddress = pse ? getBuyerIpAddress(request, payload.formData) : null;
    const pseAddress = pse ? getPseAddress(payload.buyerAddress) : null;
    const psePhone = pse ? getPsePhone(payload.buyerWhatsapp) : null;

    if (pse) {
      const hasEntityType = Boolean(entityTypeRaw);
      const hasIdType = Boolean(identification.type);
      const hasIdNumber = Boolean(identification.number);
      const hasBank = Boolean(financialInstitution);
      const hasAddress =
        pseAddress?.zip_code.length === 5 &&
        Boolean(pseAddress.street_name) &&
        Boolean(pseAddress.street_number) &&
        Boolean(pseAddress.neighborhood) &&
        Boolean(pseAddress.city) &&
        Boolean(pseAddress.federal_unit);
      const hasPhone = psePhone?.area_code.length === 3 && Boolean(psePhone.number) && psePhone.number.length <= 7;

      if (!hasEntityType) {
        return validationError("Faltan datos para pagar por PSE.", "Selecciona el tipo de persona: individual o association.");
      }
      if (!hasIdType || !hasIdNumber) {
        return validationError("Faltan datos para pagar por PSE.", "Ingresa tipo y numero de documento del comprador.");
      }
      if (!hasBank) {
        return validationError("Faltan datos para pagar por PSE.", "Selecciona el banco desde el formulario de Mercado Pago.");
      }
      if (!buyerIpAddress) {
        return validationError(
          "No pudimos iniciar el pago por PSE porque falta la IP del comprador.",
          "Si estas probando manualmente, envia formData.additional_info.ip_address; en produccion revisa que el proxy envie x-forwarded-for, x-real-ip o cf-connecting-ip.",
        );
      }
      if (!hasAddress) {
        return validationError(
          "Faltan datos para pagar por PSE.",
          "Completa codigo postal de 5 digitos, direccion, barrio, ciudad y departamento.",
        );
      }
      if (!hasPhone) {
        return validationError("Faltan datos para pagar por PSE.", "Ingresa un WhatsApp colombiano valido de 10 digitos.");
      }
    }

    const publicBaseUrl = getPublicBaseUrl(request);

    if (!publicBaseUrl) {
      return NextResponse.json(
        {
          error: "Configura NEXT_PUBLIC_SITE_URL con la URL publica HTTPS del sitio para procesar pagos por PSE.",
        },
        { status: 500 },
      );
    }

    const { firstName, lastName } = splitName(payload.buyerName);
    const payerEntityType = normalizeEntityType(entityTypeRaw);
    const paymentBody = {
      payment_method_id: payload.formData.payment_method_id,
      transaction_amount: selectedPackage.price,
      description: `${rifaConfig.eventName} - ${selectedPackage.name}`,
      external_reference: `${selectedPackage.id}:${randomUUID()}`,
      notification_url: `${publicBaseUrl}/api/mercadopago/webhook`,
      callback_url: `${publicBaseUrl}/pago/estado`,
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
        address: pseAddress ?? undefined,
        phone: psePhone ?? undefined,
      },
      additional_info: {
        ip_address: buyerIpAddress ?? undefined,
      },
      transaction_details: {
        financial_institution: financialInstitution,
      },
      ...(!pse
        ? {
            token: payload.formData.token,
            issuer_id: payload.formData.issuer_id ? Number(payload.formData.issuer_id) : undefined,
            installments: payload.formData.installments ? Number(payload.formData.installments) : 1,
            statement_descriptor: "RIFAS WALLPAPERS",
            additional_info: {
              ip_address: buyerIpAddress ?? undefined,
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
          }
        : {}),
    };

    const testTokenEnabled = shouldSendMercadoPagoTestToken();
    const payment = await paymentClient
      .create({
        body: paymentBody,
        requestOptions: {
          idempotencyKey: randomUUID(),
          testToken: testTokenEnabled,
        },
      })
      .catch(async (error: any) => {
        await logMercadoPagoEvent({
          mpPaymentId: null,
          source: "payment_api",
          topic: "payment",
          action: "create_failed",
          status: "error",
          statusDetail: error?.cause?.message || error?.cause?.error || error?.message || null,
          payload: {
            packageId: selectedPackage.id,
            paymentMethodId: payload.formData.payment_method_id,
            pse,
            buyerIpAddress,
            financialInstitution,
            testTokenEnabled,
            accessTokenMode: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") ? "test" : "production_or_missing",
            error: error?.cause ?? error?.message ?? error,
          },
        });
        throw error;
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
    return NextResponse.json(
      {
        error: formatMercadoPagoError(error),
        details: error?.cause ?? null,
      },
      { status: 500 },
    );
  }
}

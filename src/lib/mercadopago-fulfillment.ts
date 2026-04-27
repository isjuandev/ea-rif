import { linkRifaPurchaseToPayment, logMercadoPagoEvent } from "@/lib/payment-tracking";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { fulfillTicketPurchase } from "@/lib/tickets";

export async function fulfillApprovedMercadoPagoPayment(payment: any, source: "payment_api" | "webhook" | "sync") {
  const mpPaymentId = String(payment.id);
  const metadata = payment.metadata ?? {};
  const packageId = metadata.package_id || metadata.packageId;
  const buyerName = metadata.buyer_name || metadata.buyerName;
  const buyerWhatsapp = metadata.buyer_whatsapp || metadata.buyerWhatsapp;
  const buyerEmail = metadata.buyer_email || metadata.buyerEmail || payment.payer?.email;

  if (!packageId || !buyerName || !buyerWhatsapp || !buyerEmail) {
    await logMercadoPagoEvent({
      mpPaymentId,
      source,
      topic: "payment",
      action: "missing_metadata",
      status: "approved",
      statusDetail: "metadata_incomplete",
      payload: { metadata, payer: payment.payer },
    });
    throw new Error("El pago aprobado no trae metadata suficiente.");
  }

  const { config: rifaConfig } = await getEditableRifaConfig();
  const selectedPackage = rifaConfig.packages.find((pack) => pack.id === packageId);
  const paidAmount = Number(payment.transaction_amount);

  if (!selectedPackage || paidAmount !== selectedPackage.price) {
    await logMercadoPagoEvent({
      mpPaymentId,
      source,
      topic: "payment",
      action: "amount_or_package_mismatch",
      status: "approved",
      statusDetail: "fulfillment_blocked",
      payload: {
        packageId,
        paidAmount,
        expectedAmount: selectedPackage?.price ?? null,
      },
    });
    throw new Error("El pago aprobado no coincide con el paquete comprado.");
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
    source,
    topic: "payment",
    action: "fulfillment",
    status: "sold",
    statusDetail: "tickets_assigned",
    payload: {
      purchaseId: result.purchaseId,
      ticketNumbers: result.ticketNumbers,
    },
  });

  return result;
}

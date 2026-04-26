import { rifaConfig } from "@/config/rifa";
import { sendTicketEmail } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type PaymentMethod = "mercado_pago";

export type FulfillTicketPurchaseInput = {
  packageId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail?: string;
  paymentMethod: PaymentMethod;
  mercadoPagoPaymentId?: string;
};

export function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("57")) return digits;
  return `57${digits}`;
}

export async function fulfillTicketPurchase(input: FulfillTicketPurchaseInput) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const selectedPackage = rifaConfig.packages.find((pack) => pack.id === input.packageId);

  if (!selectedPackage) {
    throw new Error("Paquete invalido.");
  }

  const buyerWhatsapp = normalizeWhatsApp(input.buyerWhatsapp);

  if (!input.buyerName || buyerWhatsapp.length < 12) {
    throw new Error("Datos del comprador incompletos.");
  }

  const { data, error } = await supabase.rpc("sell_random_rifa_tickets", {
    p_buyer_name: input.buyerName.trim(),
    p_buyer_whatsapp: buyerWhatsapp,
    p_buyer_email: input.buyerEmail?.trim() ?? "",
    p_package_id: selectedPackage.id,
    p_package_name: selectedPackage.name,
    p_ticket_count: selectedPackage.rifas,
    p_amount_cop: selectedPackage.price,
    p_payment_method: input.paymentMethod,
    p_mercado_pago_payment_id: input.mercadoPagoPaymentId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const purchase = Array.isArray(data) ? data[0] : data;
  const ticketNumbers = purchase?.ticket_numbers ?? [];
  const purchaseId = purchase?.purchase_id;

  if (input.buyerEmail && ticketNumbers.length > 0 && purchaseId) {
    try {
      const { data: purchaseRow } = await supabase
        .from("rifa_purchases")
        .select("email_sent_at")
        .eq("id", purchaseId)
        .maybeSingle();

      if (purchaseRow?.email_sent_at) {
        return {
          purchaseId,
          ticketNumbers,
          selectedPackage,
        };
      }

      const email = await sendTicketEmail({
        to: input.buyerEmail,
        name: input.buyerName,
        packageName: selectedPackage.name,
        price: selectedPackage.price,
        numbers: ticketNumbers,
      });

      if (email.sent) {
        await supabase.from("rifa_purchases").update({ email_sent_at: new Date().toISOString() }).eq("id", purchaseId);
      } else {
        console.error("Email no enviado", {
          purchaseId,
          to: input.buyerEmail,
          reason: email.error || "Motivo desconocido",
        });
      }
    } catch (error: any) {
      console.error("Error enviando email de compra", {
        purchaseId,
        to: input.buyerEmail,
        error: error?.message || error,
      });
    }
  }

  return {
    purchaseId,
    ticketNumbers,
    selectedPackage,
  };
}

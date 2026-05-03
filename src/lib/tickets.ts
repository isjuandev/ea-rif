import { sendBlessedNumberAlertEmail, sendTicketEmail } from "@/lib/email";
import { normalizeColombianCellphone } from "@/lib/phone";
import { getEditableRifaConfig } from "@/lib/rifa-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type PaymentMethod = "mercado_pago";

export type FulfillTicketPurchaseInput = {
  packageId?: string;
  packageName?: string;
  ticketCount?: number;
  amountCop?: number;
  buyerName: string;
  buyerCellphone?: string;
  buyerWhatsapp: string;
  buyerEmail?: string;
  paymentMethod: PaymentMethod;
  mercadoPagoPaymentId?: string;
};

export function normalizeWhatsApp(value: string) {
  return normalizeColombianCellphone(value);
}

export function validateBuyerFields(input: { buyerName: string; buyerWhatsapp?: string; buyerCellphone?: string; buyerEmail?: string }) {
  const buyerName = input.buyerName.trim();
  const buyerCellphone = normalizeColombianCellphone(input.buyerCellphone || input.buyerWhatsapp || "");
  const buyerWhatsapp = buyerCellphone;
  const buyerEmail = input.buyerEmail?.trim() ?? "";
  const nameParts = buyerName.split(/\s+/).filter(Boolean);

  if (buyerName.length < 4 || buyerName.length > 120 || nameParts.length < 2) {
    throw new Error("Ingresa nombre(s) y apellido del comprador.");
  }

  if (!buyerWhatsapp) {
    throw new Error("El celular debe ser colombiano válido e incluir indicativo +57.");
  }

  if (buyerEmail.length > 160) {
    throw new Error("El correo es demásiado largo.");
  }

  return { buyerName, buyerCellphone, buyerWhatsapp, buyerEmail };
}

export async function getAvailableTicketCount() {
  const supabase = getSupabaseAdmin();
  const { config: rifaConfig } = await getEditableRifaConfig();

  if (!supabase) {
    return rifaConfig.totalTickets - rifaConfig.fallbackSoldTickets;
  }

  const { count, error } = await supabase
    .from("rifa_tickets")
    .select("number", { count: "exact", head: true })
    .eq("status", "available");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function assertPackageAvailability(ticketCount: number) {
  const availableTickets = await getAvailableTicketCount();

  if (availableTickets < ticketCount) {
    throw new Error(`Solo quedan ${availableTickets} números disponibles para este paquete.`);
  }
}

export async function fulfillTicketPurchase(input: FulfillTicketPurchaseInput) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { config: rifaConfig } = await getEditableRifaConfig();
  const selectedPackage = input.packageId ? rifaConfig.packages.find((pack) => pack.id === input.packageId) ?? null : null;
  const resolvedTicketCount = input.ticketCount ?? selectedPackage?.rifas ?? null;
  const resolvedPackageName = input.packageName ?? selectedPackage?.name ?? "Compra personalizada";
  const resolvedAmountCop = input.amountCop ?? (resolvedTicketCount !== null ? resolvedTicketCount * rifaConfig.ticketPrice : null);

  if (resolvedTicketCount === null || !Number.isInteger(resolvedTicketCount) || resolvedTicketCount < 5 || resolvedTicketCount > 500) {
    throw new Error("La cantidad de rifas es invalida. Debe estar entre 5 y 500.");
  }

  if (resolvedAmountCop === null || !Number.isInteger(resolvedAmountCop) || resolvedAmountCop < 0) {
    throw new Error("El valor de la compra es inválido.");
  }

  const buyer = validateBuyerFields({
    buyerName: input.buyerName,
    buyerCellphone: input.buyerCellphone,
    buyerWhatsapp: input.buyerWhatsapp,
    buyerEmail: input.buyerEmail,
  });

  await assertPackageAvailability(resolvedTicketCount);

  const { data, error } = await supabase.rpc("sell_random_rifa_tickets", {
    p_buyer_name: buyer.buyerName,
    p_buyer_whatsapp: buyer.buyerWhatsapp,
    p_buyer_email: buyer.buyerEmail,
    p_package_id: selectedPackage?.id ?? "custom",
    p_package_name: resolvedPackageName,
    p_ticket_count: resolvedTicketCount,
    p_amount_cop: resolvedAmountCop,
    p_payment_method: input.paymentMethod,
    p_mercado_pago_payment_id: input.mercadoPagoPaymentId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const purchase = Array.isArray(data) ? data[0] : data;
  const ticketNumbers = purchase?.ticket_numbers ?? [];
  const purchaseId = purchase?.purchase_id;

  if (buyer.buyerEmail && ticketNumbers.length > 0 && purchaseId) {
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
        to: buyer.buyerEmail,
        name: buyer.buyerName,
        packageName: resolvedPackageName,
        price: resolvedAmountCop,
        numbers: ticketNumbers,
        lotteryName: rifaConfig.lotteryName,
      });

      if (email.sent) {
        await supabase.from("rifa_purchases").update({ email_sent_at: new Date().toISOString() }).eq("id", purchaseId);
      } else {
        console.error("Email no envíado", {
          purchaseId,
          to: buyer.buyerEmail,
          reason: email.error || "Motivo desconocido",
        });
      }
    } catch (error: any) {
      console.error("Error envíando email de compra", {
        purchaseId,
        to: buyer.buyerEmail,
        error: error?.message || error,
      });
    }
  }

  if (ticketNumbers.length > 0) {
    const blessed = (rifaConfig.blessedNumbers ?? []).filter((number) => ticketNumbers.includes(number));

    if (blessed.length > 0) {
      const recipients = [buyer.buyerEmail, "juandiegogarcia162@gmail.com", "carlos.serna.franco@gmail.com"].filter(Boolean) as string[];
      for (const to of recipients) {
        await sendBlessedNumberAlertEmail({
          to,
          buyerName: buyer.buyerName,
          buyerWhatsapp: buyer.buyerWhatsapp,
          blessedNumbers: blessed,
          allNumbers: ticketNumbers,
        }).catch(() => undefined);
      }
    }
  }

  return {
    purchaseId,
    ticketNumbers,
    selectedPackage,
  };
}

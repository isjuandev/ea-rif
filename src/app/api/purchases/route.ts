import { NextResponse } from "next/server";
import { rifaConfig } from "@/config/rifa";
import { sendTicketEmail } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type PurchasePayload = {
  packageId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail?: string;
  paymentMethod: "whatsapp" | "nequi" | "daviplata";
};

function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("57")) return digits;
  return `57${digits}`;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase no esta configurado en el servidor." }, { status: 503 });
  }

  const payload = (await request.json()) as PurchasePayload;
  const selectedPackage = rifaConfig.packages.find((pack) => pack.id === payload.packageId);

  if (!selectedPackage) {
    return NextResponse.json({ error: "Paquete invalido." }, { status: 400 });
  }

  if (!payload.buyerName || normalizeWhatsApp(payload.buyerWhatsapp).length < 12) {
    return NextResponse.json({ error: "Datos del comprador incompletos." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("sell_random_rifa_tickets", {
    p_buyer_name: payload.buyerName.trim(),
    p_buyer_whatsapp: normalizeWhatsApp(payload.buyerWhatsapp),
    p_buyer_email: payload.buyerEmail?.trim() ?? "",
    p_package_id: selectedPackage.id,
    p_package_name: selectedPackage.name,
    p_ticket_count: selectedPackage.rifas,
    p_amount_cop: selectedPackage.price,
    p_payment_method: payload.paymentMethod,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const purchase = Array.isArray(data) ? data[0] : data;
  const ticketNumbers = purchase?.ticket_numbers ?? [];
  const purchaseId = purchase?.purchase_id;

  if (payload.buyerEmail && ticketNumbers.length > 0) {
    const email = await sendTicketEmail({
      to: payload.buyerEmail,
      name: payload.buyerName,
      packageName: selectedPackage.name,
      price: selectedPackage.price,
      numbers: ticketNumbers,
    });

    if (email.sent && purchaseId) {
      await supabase.from("rifa_purchases").update({ email_sent_at: new Date().toISOString() }).eq("id", purchaseId);
    }
  }

  return NextResponse.json({
    purchaseId,
    ticketNumbers,
    message: "Compra registrada. Tus numeros fueron asignados.",
  });
}

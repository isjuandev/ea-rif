import { NextResponse } from "next/server";
import { fulfillTicketPurchase, type PaymentMethod } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type PurchasePayload = {
  packageId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail?: string;
  paymentMethod: PaymentMethod;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PurchasePayload;
    const result = await fulfillTicketPurchase(payload);

    return NextResponse.json({
      purchaseId: result.purchaseId,
      ticketNumbers: result.ticketNumbers,
      message: "Compra registrada. Tus numeros fueron asignados.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar la compra." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const paymentClient = getMercadoPagoPayment();
    if (!paymentClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const { id } = await context.params;
    const payment = await paymentClient.get({ id });
    return NextResponse.json({ payment });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.cause?.message || error?.message || "No se pudo consultar el pago." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getMercadoPagoPaymentMethod, shouldSendMercadoPagoTestToken } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const paymentMethodClient = getMercadoPagoPaymentMethod();
    if (!paymentMethodClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const methods = await paymentMethodClient.get({ requestOptions: { testToken: shouldSendMercadoPagoTestToken() } });
    return NextResponse.json({ methods });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.cause?.message || error?.message || "No se pudieron consultar los medios de pago." },
      { status: 500 },
    );
  }
}

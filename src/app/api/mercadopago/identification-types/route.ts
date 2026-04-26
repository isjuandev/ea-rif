import { NextResponse } from "next/server";
import { getMercadoPagoIdentificationType } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identificationTypeClient = getMercadoPagoIdentificationType();
    if (!identificationTypeClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const identificationTypes = await identificationTypeClient.list();
    return NextResponse.json({ identificationTypes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.cause?.message || error?.message || "No se pudieron consultar los tipos de documento." },
      { status: 500 },
    );
  }
}

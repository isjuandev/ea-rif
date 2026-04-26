import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const paymentClient = getMercadoPagoPayment();
    if (!paymentClient) {
      return NextResponse.json({ error: "Mercado Pago no esta configurado en el servidor." }, { status: 503 });
    }

    const url = new URL(request.url);
    const sort = (url.searchParams.get("sort") || "date_created") as "date_approved" | "date_created" | "date_last_updated" | "money_release_date";
    const criteria = (url.searchParams.get("criteria") || "desc") as "asc" | "desc";
    const externalReference = url.searchParams.get("external_reference") || undefined;
    const beginDate = url.searchParams.get("begin_date") || undefined;
    const endDate = url.searchParams.get("end_date") || undefined;
    const range = (url.searchParams.get("range") || undefined) as
      | "date_created"
      | "date_last_updated"
      | "date_approved"
      | "money_release_date"
      | undefined;

    const options: Record<string, string> = {
      sort,
      criteria,
    };
    if (externalReference) options.external_reference = externalReference;
    if (beginDate) options.begin_date = beginDate;
    if (endDate) options.end_date = endDate;
    if (range) options.range = range;

    const result = await paymentClient.search({ options });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.cause?.message || error?.message || "No se pudo buscar pagos." },
      { status: 500 },
    );
  }
}

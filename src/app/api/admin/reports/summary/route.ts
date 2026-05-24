import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { getAdminReportSummary } from "@/lib/admin-reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminSessionAuthorized(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const summary = await getAdminReportSummary();
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo generar el resumen." }, { status: 500 });
  }
}

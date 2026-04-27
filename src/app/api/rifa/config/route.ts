import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getEditableRifaConfig, saveEditableRifaConfig } from "@/lib/rifa-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { config, configured } = await getEditableRifaConfig();
  return NextResponse.json({ config, configured });
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const config = await saveEditableRifaConfig(payload?.config ?? payload);
    return NextResponse.json({ config, configured: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo guardar la configuracion." }, { status: 500 });
  }
}

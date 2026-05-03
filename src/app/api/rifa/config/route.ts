import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { getEditableRifaConfig, saveEditableRifaConfig } from "@/lib/rifa-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { config, configured } = await getEditableRifaConfig();
  return NextResponse.json({ config, configured });
}

export async function PUT(request: Request) {
  if (!(await isAdminSessionAuthorized(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const config = await saveEditableRifaConfig(payload?.config ?? payload);
    return NextResponse.json({ config, configured: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo guardar la configuración." }, { status: 500 });
  }
}

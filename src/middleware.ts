import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";

function unauthorized() {
  return new NextResponse("No autorizado.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rifa settings"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settingsearif2026/:path*"],
};

// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAdminPath(pathname)) return NextResponse.next();

  // 1) Optional UK-only lock
  const ukOnly = (process.env.ADMIN_UK_ONLY || "0") === "1";
  if (ukOnly) {
    // Vercel usually provides this header:
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-vercel-geo-country") ||
      "";

    if (country && country !== "GB") {
      return new NextResponse("Admin is UK-only.", { status: 403 });
    }
  }

  // 2) Require admin cookie
  const cookieToken = req.cookies.get("gim_admin")?.value || "";
  const expected = process.env.ADMIN_TOKEN || "";

  // Allow the auth endpoint itself (so you can login)
  if (pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  if (!expected) {
    return new NextResponse("Missing ADMIN_TOKEN env var", { status: 500 });
  }

  if (cookieToken !== expected) {
    // Let the /admin/orders page load so you can enter token and login
    if (pathname === "/admin/orders" || pathname === "/admin/orders/") {
      return NextResponse.next();
    }

    // Block API + other admin pages
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/collection/:path*",
    "/friends/:path*",
    "/trades/:path*",
    "/profile/:path*",
    "/user/:path*",
    "/admin/callback",
  ],
};

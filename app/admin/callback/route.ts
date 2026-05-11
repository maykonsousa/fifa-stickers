import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: admin } = await supabase
          .from("admins")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (admin) {
          return NextResponse.redirect(`${origin}/admin`);
        }
      }
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/admin/login?error=not_admin`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}

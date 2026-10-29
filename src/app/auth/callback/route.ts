import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the default Supabase "Magic Link" email (which links via
 * {{ .ConfirmationURL }} and comes back here with `?code=` under PKCE).
 * Used when the email template can't be customised to show {{ .Token }}.
 * Must be opened in the same browser that requested the sign-in email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // The proxy re-checks the allowlist on the next request.
      return NextResponse.redirect(new URL("/", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
}

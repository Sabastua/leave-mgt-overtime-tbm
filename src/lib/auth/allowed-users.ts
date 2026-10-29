/**
 * The only email addresses permitted to sign in to the Leave Management system.
 *
 * This list is enforced in the app (before an OTP is sent and on every request
 * in the proxy). It is ALSO enforced in the database by the trigger defined in
 * `supabase/migrations/0001_auth_allowlist.sql`, so keep the two in sync.
 */
export const ALLOWED_EMAILS = [
  "akiminda@safaricom.co.ke",
  "brkimani@safaricom.co.ke",
  "skavoi@safaricom.co.ke",
  "smacharia6@safaricom.co.ke",
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (ALLOWED_EMAILS as readonly string[]).includes(normalizeEmail(email));
}

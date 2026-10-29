/**
 * The only email addresses permitted to sign in to the Leave Management system.
 *
 * This list is enforced in the app and in the database by the trigger defined in
 * `supabase/migrations/0001_auth_allowlist.sql` (and updated in `0002_leave_management.sql`).
 */
export const ALLOWED_EMAILS = [
  "akiminda@safaricom.co.ke",
  "brkimani@safaricom.co.ke",
  "skavoi@safaricom.co.ke",
  "smacharia6@safaricom.co.ke",
] as const;

export type AllowedEmail = (typeof ALLOWED_EMAILS)[number];

export type UserRole = "approver" | "staff";

export type TeamMemberConfig = {
  email: AllowedEmail;
  fullName: string;
  role: UserRole;
  title: string;
};

export const TEAM_MEMBERS: Record<AllowedEmail, TeamMemberConfig> = {
  "akiminda@safaricom.co.ke": {
    email: "akiminda@safaricom.co.ke",
    fullName: "A. Kiminda",
    role: "approver",
    title: "Approver / Manager",
  },
  "brkimani@safaricom.co.ke": {
    email: "brkimani@safaricom.co.ke",
    fullName: "B. R. Kimani",
    role: "approver",
    title: "Approver / Manager",
  },
  "smacharia6@safaricom.co.ke": {
    email: "smacharia6@safaricom.co.ke",
    fullName: "Sabastian Macharia",
    role: "approver",
    title: "Approver / Manager",
  },
  "skavoi@safaricom.co.ke": {
    email: "skavoi@safaricom.co.ke",
    fullName: "S. Kavoi",
    role: "staff",
    title: "Team Member",
  },
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(
  email: string | null | undefined,
): email is AllowedEmail {
  if (!email) return false;
  return (ALLOWED_EMAILS as readonly string[]).includes(normalizeEmail(email));
}

export function getMemberConfig(
  email: string | null | undefined,
): TeamMemberConfig | null {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!isAllowedEmail(normalized)) return null;
  return TEAM_MEMBERS[normalized];
}

export function isApproverEmail(email: string | null | undefined): boolean {
  return getMemberConfig(email)?.role === "approver";
}

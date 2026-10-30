export type UserRole = "approver" | "staff";

export type AllowedUser = {
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export const ALLOWED_EMAILS = [
  "akiminda@safaricom.co.ke",
  "brkimani@safaricom.co.ke",
  "skavoi@safaricom.co.ke",
  "smacharia6@safaricom.co.ke",
] as const;

export type AllowedEmail = (typeof ALLOWED_EMAILS)[number];

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

export const FALLBACK_ALLOWED_EMAILS = ALLOWED_EMAILS;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Check if email is Safaricom domain or on the fallback list */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return (
    normalized.endsWith("@safaricom.co.ke") ||
    (ALLOWED_EMAILS as readonly string[]).includes(normalized)
  );
}

export function isApproverRole(role: string | null | undefined): boolean {
  return role === "approver";
}

export function isApproverEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  const cfg = (TEAM_MEMBERS as Record<string, TeamMemberConfig>)[normalized];
  return cfg?.role === "approver";
}

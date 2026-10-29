import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_EMAILS,
  getMemberConfig,
  isAllowedEmail,
  isApproverEmail,
  TEAM_MEMBERS,
} from "@/lib/auth/allowed-users";
import {
  computeUserBalances,
  DEFAULT_LEAVE_TYPES,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/leave/types";
import { signOut } from "./login/actions";
import { cancelLeaveRequest, reviewLeaveRequest } from "./actions/leave";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";

const STATUS_BADGE: Record<LeaveRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  cancelled: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const COLOR_ACCENT: Record<string, { bar: string; badge: string }> = {
  emerald: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800",
  },
  amber: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800",
  },
  purple: {
    bar: "bg-purple-500",
    badge: "bg-purple-50 text-purple-800",
  },
  blue: {
    bar: "bg-blue-500",
    badge: "bg-blue-50 text-blue-800",
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-[#f4f7f5]">
      <Suspense fallback={<DashboardSkeleton />}>
        <LeaveDashboard />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-white">
              L
            </div>
            <span className="font-bold text-gray-900">
              Safaricom Leave Management
            </span>
          </div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white p-5 shadow-xs"
            />
          ))}
        </div>
      </main>
    </div>
  );
}

async function LeaveDashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email =
    typeof claimsData?.claims?.email === "string"
      ? claimsData.claims.email.toLowerCase()
      : null;

  if (!email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  const member = getMemberConfig(email)!;
  const isApprover = isApproverEmail(email);

  // Fetch leave types and requests from Supabase (gracefully fall back if migration not yet run)
  const [{ data: dbLeaveTypes }, { data: dbRequests, error: requestsError }] =
    await Promise.all([
      supabase
        .from("leave_types")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const schemaReady = !requestsError;
  const leaveTypes: LeaveType[] =
    dbLeaveTypes && dbLeaveTypes.length > 0
      ? (dbLeaveTypes as LeaveType[])
      : DEFAULT_LEAVE_TYPES;

  const allRequests: LeaveRequest[] = (dbRequests as LeaveRequest[]) ?? [];
  const currentYear = new Date().getFullYear();

  const myBalances = computeUserBalances(
    leaveTypes,
    allRequests,
    email,
    currentYear,
  );
  const myRequests = allRequests.filter(
    (r) => r.user_email.toLowerCase() === email,
  );
  const pendingApprovals = allRequests.filter((r) => r.status === "pending");

  const leaveTypeMap = new Map(leaveTypes.map((t) => [t.code, t]));

  return (
    <div className="flex flex-1 flex-col">
      {/* Top navigation bar */}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-white shadow-xs">
              L
            </div>
            <div>
              <span className="font-bold text-gray-900">
                Leave Management
              </span>
              <span className="ml-2 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                {member.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {member.fullName}
              </p>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8">
        {/* Banner if SQL migration 0002 hasn't been executed in Supabase yet */}
        {!schemaReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              One-time database setup needed in Supabase
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Open your Supabase Dashboard → <strong>SQL Editor</strong> and run
              the contents of{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
                supabase/migrations/0002_leave_management.sql
              </code>{" "}
              to create the{" "}
              <code className="font-mono">leave_types</code> and{" "}
              <code className="font-mono">leave_requests</code> tables and
              enable instant password sign-in.
            </p>
          </div>
        )}

        {/* Section 1: My Leave Balances */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              My Leave Balances ({currentYear})
            </h1>
            <span className="text-xs text-gray-500">
              Working days (Mon–Fri)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {myBalances.map(({ leaveType, entitled, approved, pending, remaining }) => {
              const accent =
                COLOR_ACCENT[leaveType.color] ?? COLOR_ACCENT.emerald;
              const usedPct =
                entitled > 0
                  ? Math.min(100, Math.round(((approved + pending) / entitled) * 100))
                  : 0;

              return (
                <div
                  key={leaveType.code}
                  className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {leaveType.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${accent.badge}`}
                      >
                        {entitled}d / yr
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
                      {remaining}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        days left
                      </span>
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${accent.bar}`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Approved: {approved}d</span>
                      <span>Pending: {pending}d</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Approver Queue (visible to the 3 Approvers) */}
        {isApprover && (
          <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Pending Approvals Queue
                </h2>
                <p className="text-xs text-gray-500">
                  As an approver, you can approve or reject leave applications
                  from the team.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                {pendingApprovals.length} pending
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <p className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-500">
                No pending leave requests waiting for approval.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingApprovals.map((req) => {
                  const applicant = getMemberConfig(req.user_email);
                  const lType = leaveTypeMap.get(req.leave_type);
                  const relief = req.handover_email
                    ? getMemberConfig(req.handover_email)
                    : null;

                  return (
                    <div
                      key={req.id}
                      className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {applicant?.fullName ?? req.user_email}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({req.user_email})
                          </span>
                          <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                            {lType?.name ?? req.leave_type}
                          </span>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
                            {req.working_days} working{" "}
                            {req.working_days === 1 ? "day" : "days"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-700">
                          📅 {req.start_date} → {req.end_date}
                          {relief && (
                            <span className="ml-3 text-gray-500">
                              🤝 Relief: {relief.fullName}
                            </span>
                          )}
                        </p>
                        {req.reason && (
                          <p className="text-xs text-gray-600">
                            &ldquo;{req.reason}&rdquo;
                          </p>
                        )}
                      </div>

                      <form
                        action={reviewLeaveRequest}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="request_id"
                          value={req.id}
                        />
                        <input
                          type="text"
                          name="reviewer_note"
                          placeholder="Optional comment…"
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                        <button
                          type="submit"
                          name="decision"
                          value="approved"
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                        >
                          Approve
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section 3: Apply for Leave + My Leave History */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <LeaveRequestForm
              currentUserEmail={email}
              leaveTypes={leaveTypes}
              balances={myBalances}
            />
          </div>

          <div className="space-y-6 lg:col-span-7">
            {/* My Leave Applications */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <h2 className="text-lg font-bold text-gray-900">
                My Leave Applications
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                Track the status of your submitted requests.
              </p>

              {myRequests.length === 0 ? (
                <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500">
                  You haven&apos;t submitted any leave requests yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myRequests.map((req) => {
                    const lType = leaveTypeMap.get(req.leave_type);
                    const reviewer = req.reviewed_by
                      ? getMemberConfig(req.reviewed_by)
                      : null;

                    return (
                      <div
                        key={req.id}
                        className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {lType?.name ?? req.leave_type}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE[req.status]}`}
                            >
                              {req.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {req.working_days} working{" "}
                              {req.working_days === 1 ? "day" : "days"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {req.start_date} → {req.end_date}
                          </p>
                          {req.reason && (
                            <p className="text-xs text-gray-500">
                              {req.reason}
                            </p>
                          )}
                          {reviewer && (
                            <p className="text-xs text-gray-400">
                              Reviewed by {reviewer.fullName}
                              {req.reviewer_note
                                ? `: "${req.reviewer_note}"`
                                : ""}
                            </p>
                          )}
                        </div>

                        {req.status === "pending" && (
                          <form action={cancelLeaveRequest}>
                            <input
                              type="hidden"
                              name="request_id"
                              value={req.id}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Team Balances Summary Table */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <h2 className="text-lg font-bold text-gray-900">
                Team Leave Balances ({currentYear})
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                Remaining working days across the 4 authorised team members.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="py-2 pr-3 font-semibold">Team Member</th>
                      <th className="px-2 py-2 font-semibold">Role</th>
                      {leaveTypes.map((lt) => (
                        <th
                          key={lt.code}
                          className="px-2 py-2 text-right font-semibold"
                        >
                          {lt.name.replace(" Leave", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ALLOWED_EMAILS.map((memberEmail) => {
                      const info = TEAM_MEMBERS[memberEmail];
                      const bals = computeUserBalances(
                        leaveTypes,
                        allRequests,
                        memberEmail,
                        currentYear,
                      );
                      return (
                        <tr key={memberEmail}>
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-gray-900">
                              {info.fullName}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {memberEmail}
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                info.role === "approver"
                                  ? "bg-brand/10 text-brand-dark"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {info.role === "approver" ? "Approver" : "Staff"}
                            </span>
                          </td>
                          {bals.map((b) => (
                            <td
                              key={b.leaveType.code}
                              className="px-2 py-2.5 text-right font-mono font-semibold text-gray-800"
                            >
                              {b.remaining}
                              <span className="font-normal text-gray-400">
                                /{b.entitled}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

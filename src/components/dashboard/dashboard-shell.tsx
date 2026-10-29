"use client";

import { useState } from "react";
import type { LeaveType, LeaveRequest, LeaveBalanceSummary } from "@/lib/leave/types";
import type { OvertimeRecord, OvertimeStats } from "@/lib/overtime/types";
import type { TeamMemberConfig } from "@/lib/auth/allowed-users";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { OvertimeRequestForm } from "@/components/overtime/overtime-request-form";
import { reviewLeaveRequest, cancelLeaveRequest } from "@/app/actions/leave";
import { reviewOvertimeRequest, cancelOvertimeRequest } from "@/app/actions/overtime";
import { signOut } from "@/app/login/actions";
import { ALLOWED_EMAILS, TEAM_MEMBERS } from "@/lib/auth/allowed-users";
import { computeUserBalances } from "@/lib/leave/types";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  cancelled: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const COLOR_ACCENT: Record<string, { bar: string; badge: string }> = {
  emerald: { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800" },
  amber: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-800" },
  purple: { bar: "bg-purple-500", badge: "bg-purple-50 text-purple-800" },
  blue: { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-800" },
};

type Props = {
  currentUserEmail: string;
  member: TeamMemberConfig;
  isApprover: boolean;
  leaveTypes: LeaveType[];
  allLeaveRequests: LeaveRequest[];
  allOvertimeRecords: OvertimeRecord[];
  myBalances: LeaveBalanceSummary[];
  myOvertimeStats: OvertimeStats;
  currentYear: number;
  schemaReady: boolean;
};

export function DashboardShell({
  currentUserEmail,
  member,
  isApprover,
  leaveTypes,
  allLeaveRequests,
  allOvertimeRecords,
  myBalances,
  myOvertimeStats,
  currentYear,
  schemaReady,
}: Props) {
  const [activeTab, setActiveTab] = useState<"leave" | "overtime" | "team">("leave");

  const myLeaveRequests = allLeaveRequests.filter(
    (r) => r.user_email.toLowerCase() === currentUserEmail
  );
  const pendingLeaveApprovals = allLeaveRequests.filter((r) => r.status === "pending");

  const myOvertimeRecords = allOvertimeRecords.filter(
    (r) => r.user_email.toLowerCase() === currentUserEmail
  );
  const pendingOvertimeApprovals = allOvertimeRecords.filter((r) => r.status === "pending");

  const leaveTypeMap = new Map(leaveTypes.map((t) => [t.code, t]));

  return (
    <div className="flex flex-1 flex-col">
      {/* Top Header */}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-white shadow-xs">
              L
            </div>
            <div>
              <span className="font-bold text-gray-900">Leave &amp; Overtime System</span>
              <span className="ml-2 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                {member.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{member.fullName}</p>
              <p className="text-xs text-gray-500">{currentUserEmail}</p>
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

        {/* Tab Navigation */}
        <div className="mx-auto max-w-6xl px-4">
          <nav className="-mb-px flex space-x-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab("leave")}
              className={`border-b-2 py-3 px-1 transition ${
                activeTab === "leave"
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              🏖️ Leave Management
              {pendingLeaveApprovals.length > 0 && isApprover && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  {pendingLeaveApprovals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("overtime")}
              className={`border-b-2 py-3 px-1 transition ${
                activeTab === "overtime"
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              ⏱️ Overtime Claims
              {pendingOvertimeApprovals.length > 0 && isApprover && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">
                  {pendingOvertimeApprovals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("team")}
              className={`border-b-2 py-3 px-1 transition ${
                activeTab === "team"
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              👥 Team Calendar &amp; Balances
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8">
        {!schemaReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Notice: Database Setup</p>
            <p className="mt-1 text-xs text-amber-800">
              Run <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">0003_overtime_management.sql</code> in your Supabase SQL Editor if you encounter table errors.
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: LEAVE MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === "leave" && (
          <div className="space-y-8">
            {/* Balances Section */}
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                  My Leave Balances ({currentYear})
                </h1>
                <span className="text-xs text-gray-500">Working days (Mon–Fri)</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {myBalances.map(({ leaveType, entitled, approved, pending, remaining }) => {
                  const accent = COLOR_ACCENT[leaveType.color] ?? COLOR_ACCENT.emerald;
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
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${accent.badge}`}>
                            {entitled}d / yr
                          </span>
                        </div>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
                          {remaining}{" "}
                          <span className="text-sm font-normal text-gray-500">days left</span>
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

            {/* Approver Queue for Leave */}
            {isApprover && (
              <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Pending Leave Approvals</h2>
                    <p className="text-xs text-gray-500">
                      Review and approve or decline requests from the team.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                    {pendingLeaveApprovals.length} pending
                  </span>
                </div>

                {pendingLeaveApprovals.length === 0 ? (
                  <p className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-500">
                    No pending leave requests waiting for approval.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pendingLeaveApprovals.map((req) => {
                      const applicant = TEAM_MEMBERS[req.user_email as keyof typeof TEAM_MEMBERS];
                      const lType = leaveTypeMap.get(req.leave_type);
                      const relief = req.handover_email
                        ? TEAM_MEMBERS[req.handover_email as keyof typeof TEAM_MEMBERS]
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
                              <span className="text-xs text-gray-500">({req.user_email})</span>
                              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                                {lType?.name ?? req.leave_type}
                              </span>
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
                                {req.working_days} working {req.working_days === 1 ? "day" : "days"}
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
                              <p className="text-xs text-gray-600">&ldquo;{req.reason}&rdquo;</p>
                            )}
                          </div>

                          <form
                            action={reviewLeaveRequest}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input type="hidden" name="request_id" value={req.id} />
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

            {/* Apply & History */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <LeaveRequestForm
                  currentUserEmail={currentUserEmail}
                  leaveTypes={leaveTypes}
                  balances={myBalances}
                />
              </div>

              <div className="lg:col-span-7">
                <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
                  <h2 className="text-lg font-bold text-gray-900">My Leave Applications</h2>
                  <p className="mb-4 text-xs text-gray-500">Track all your submitted leave requests.</p>

                  {myLeaveRequests.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500">
                      No leave requests submitted yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {myLeaveRequests.map((req) => {
                        const lType = leaveTypeMap.get(req.leave_type);
                        const reviewer = req.reviewed_by
                          ? TEAM_MEMBERS[req.reviewed_by as keyof typeof TEAM_MEMBERS]
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
                                  {req.working_days} working {req.working_days === 1 ? "day" : "days"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {req.start_date} → {req.end_date}
                              </p>
                              {req.reason && (
                                <p className="text-xs text-gray-500">&ldquo;{req.reason}&rdquo;</p>
                              )}
                              {reviewer && (
                                <p className="text-xs text-gray-400">
                                  Reviewed by {reviewer.fullName}
                                  {req.reviewer_note ? `: "${req.reviewer_note}"` : ""}
                                </p>
                              )}
                            </div>

                            {req.status === "pending" && (
                              <form action={cancelLeaveRequest}>
                                <input type="hidden" name="request_id" value={req.id} />
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
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: OVERTIME TRACKER */}
        {/* ============================================================== */}
        {activeTab === "overtime" && (
          <div className="space-y-8">
            {/* Overtime KPI Cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  Approved Overtime
                </span>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {myOvertimeStats.totalHoursApproved} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <span className="mt-1 block text-xs text-emerald-600">Total approved this year</span>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  Pending Approval
                </span>
                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {myOvertimeStats.totalHoursPending} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <span className="mt-1 block text-xs text-gray-400">Awaiting manager review</span>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  Paid Overtime
                </span>
                <p className="mt-2 text-3xl font-bold text-blue-700">
                  {myOvertimeStats.paidHoursApproved} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <span className="mt-1 block text-xs text-gray-400">Approved for remuneration</span>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  TOIL / Comp Time
                </span>
                <p className="mt-2 text-3xl font-bold text-purple-700">
                  {myOvertimeStats.toilHoursApproved} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <span className="mt-1 block text-xs text-gray-400">Time Off in Lieu accrued</span>
              </div>
            </section>

            {/* Approver Queue for Overtime */}
            {isApprover && (
              <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Pending Overtime Claims</h2>
                    <p className="text-xs text-gray-500">
                      Approve or reject extra hours claimed by team members.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
                    {pendingOvertimeApprovals.length} pending
                  </span>
                </div>

                {pendingOvertimeApprovals.length === 0 ? (
                  <p className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-500">
                    No overtime claims awaiting approval.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pendingOvertimeApprovals.map((claim) => {
                      const claimant = TEAM_MEMBERS[claim.user_email as keyof typeof TEAM_MEMBERS];
                      return (
                        <div
                          key={claim.id}
                          className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {claimant?.fullName ?? claim.user_email}
                              </span>
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">
                                {claim.hours} hours
                              </span>
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                {claim.compensatory_choice === "time_off_in_lieu" ? "TOIL" : "Paid"}
                              </span>
                              {claim.ticket_ref && (
                                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono text-purple-700">
                                  {claim.ticket_ref}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-700">
                              📅 Worked on {claim.overtime_date}
                            </p>
                            <p className="text-xs text-gray-600">&ldquo;{claim.task_summary}&rdquo;</p>
                          </div>

                          <form
                            action={reviewOvertimeRequest}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input type="hidden" name="record_id" value={claim.id} />
                            <input
                              type="text"
                              name="reviewer_note"
                              placeholder="Approval comment…"
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

            {/* Overtime Form + Claims History */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <OvertimeRequestForm />
              </div>

              <div className="lg:col-span-7">
                <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
                  <h2 className="text-lg font-bold text-gray-900">My Overtime History</h2>
                  <p className="mb-4 text-xs text-gray-500">Record of hours submitted and their review status.</p>

                  {myOvertimeRecords.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500">
                      No overtime logged yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {myOvertimeRecords.map((item) => {
                        const reviewer = item.reviewed_by
                          ? TEAM_MEMBERS[item.reviewed_by as keyof typeof TEAM_MEMBERS]
                          : null;

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">
                                  {item.hours} hrs on {item.overtime_date}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE[item.status]}`}
                                >
                                  {item.status}
                                </span>
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 font-medium">
                                  {item.compensatory_choice === "time_off_in_lieu" ? "TOIL" : "Paid"}
                                </span>
                                {item.ticket_ref && (
                                  <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                    {item.ticket_ref}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{item.task_summary}</p>
                              {reviewer && (
                                <p className="text-xs text-gray-400">
                                  Reviewed by {reviewer.fullName}
                                  {item.reviewer_note ? `: "${item.reviewer_note}"` : ""}
                                </p>
                              )}
                            </div>

                            {item.status === "pending" && (
                              <form action={cancelOvertimeRequest}>
                                <input type="hidden" name="record_id" value={item.id} />
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
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TEAM CALENDAR & BALANCES */}
        {/* ============================================================== */}
        {activeTab === "team" && (
          <div className="space-y-8">
            {/* Team Leave Calendar Schedule */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Team Leave Schedule</h2>
              <p className="mb-4 text-xs text-gray-500">
                Approved and scheduled time-off across the team to plan work coverage.
              </p>

              {allLeaveRequests.filter((r) => r.status === "approved").length === 0 ? (
                <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500">
                  No upcoming approved leave scheduled yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {allLeaveRequests
                    .filter((r) => r.status === "approved")
                    .map((item) => {
                      const person = TEAM_MEMBERS[item.user_email as keyof typeof TEAM_MEMBERS];
                      const lType = leaveTypeMap.get(item.leave_type);
                      const relief = item.handover_email
                        ? TEAM_MEMBERS[item.handover_email as keyof typeof TEAM_MEMBERS]
                        : null;

                      return (
                        <div key={item.id} className="flex flex-col justify-between py-3 sm:flex-row sm:items-center">
                          <div>
                            <span className="font-semibold text-gray-900">
                              {person?.fullName ?? item.user_email}
                            </span>
                            <span className="ml-2 rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                              {lType?.name ?? item.leave_type}
                            </span>
                            <p className="mt-1 text-xs text-gray-600">
                              📅 {item.start_date} → {item.end_date} ({item.working_days} working days)
                            </p>
                          </div>
                          {relief && (
                            <span className="mt-2 text-xs text-gray-500 sm:mt-0">
                              Relief / Handover: <strong className="text-gray-700">{relief.fullName}</strong>
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {/* Team Balances Table */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <h2 className="text-lg font-bold text-gray-900">Team Leave Entitlements Summary ({currentYear})</h2>
              <p className="mb-4 text-xs text-gray-500">
                Remaining working days for each team member.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="py-2.5 pr-3 font-semibold">Team Member</th>
                      <th className="px-2 py-2.5 font-semibold">Role</th>
                      {leaveTypes.map((lt) => (
                        <th key={lt.code} className="px-2 py-2.5 text-right font-semibold">
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
                        allLeaveRequests,
                        memberEmail,
                        currentYear
                      );
                      return (
                        <tr key={memberEmail}>
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-gray-900">{info.fullName}</div>
                            <div className="text-[11px] text-gray-400">{memberEmail}</div>
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
                              <span className="font-normal text-gray-400">/{b.entitled}</span>
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
        )}
      </main>
    </div>
  );
}

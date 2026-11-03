"use client";

import { useState } from "react";
import type { LeaveType, LeaveRequest, LeaveBalanceSummary } from "@/lib/leave/types";
import type { OvertimeRecord, OvertimeStats } from "@/lib/overtime/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { OvertimeRequestForm } from "@/components/overtime/overtime-request-form";
import { TeamCalendar } from "@/components/calendar/team-calendar";
import { AdminOverview } from "@/components/admin/admin-overview";
import { TeamManagement } from "@/components/team/team-management";
import { ChangePasswordModal } from "@/components/dashboard/change-password-modal";
import { OvertimeReceiptModal } from "@/components/overtime/overtime-receipt-modal";
import { reviewLeaveRequest, cancelLeaveRequest } from "@/app/actions/leave";
import { reviewOvertimeRequest, cancelOvertimeRequest } from "@/app/actions/overtime";
import { signOut } from "@/app/login/actions";
import {
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/ui/icons";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  cancelled: "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20",
};

const COLOR_ACCENT: Record<string, { bar: string; badge: string }> = {
  emerald: { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800" },
  amber: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-800" },
  purple: { bar: "bg-purple-500", badge: "bg-purple-50 text-purple-800" },
  blue: { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-800" },
};

type Props = {
  currentUserEmail: string;
  currentMember: AllowedUser;
  isApprover: boolean;
  teamMembers: AllowedUser[];
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
  currentMember,
  isApprover,
  teamMembers,
  leaveTypes,
  allLeaveRequests,
  allOvertimeRecords,
  myBalances,
  myOvertimeStats,
  currentYear,
  schemaReady,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "leave" | "overtime" | "calendar" | "admin" | "team"
  >("leave");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<OvertimeRecord | null>(null);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>("all");
  const [overtimeStatusFilter, setOvertimeStatusFilter] = useState<string>("all");
  const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState("");

  const memberMap = new Map(teamMembers.map((m) => [m.email.toLowerCase(), m]));
  const leaveTypeMap = new Map(leaveTypes.map((t) => [t.code, t]));

  const myLeaveRequests = allLeaveRequests.filter(
    (r) => r.user_email.toLowerCase() === currentUserEmail
  );
  const filteredLeaveRequests = myLeaveRequests.filter((r) => {
    if (leaveStatusFilter !== "all" && r.status !== leaveStatusFilter) return false;
    if (leaveSearchQuery.trim()) {
      const q = leaveSearchQuery.toLowerCase();
      const type = leaveTypeMap.get(r.leave_type)?.name.toLowerCase() || "";
      const matchesType = type.includes(q) || r.leave_type.toLowerCase().includes(q);
      const matchesDates = r.start_date.includes(q) || r.end_date.includes(q);
      const matchesReason = (r.reason || "").toLowerCase().includes(q);
      const matchesRelief = (r.handover_email || "").toLowerCase().includes(q);
      return matchesType || matchesDates || matchesReason || matchesRelief;
    }
    return true;
  });
  const pendingLeaveApprovals = allLeaveRequests.filter((r) => r.status === "pending");

  const myOvertimeRecords = allOvertimeRecords.filter(
    (r) => r.user_email.toLowerCase() === currentUserEmail
  );
  const filteredOvertimeRecords = myOvertimeRecords.filter((r) => {
    if (overtimeStatusFilter === "all") return true;
    return r.status === overtimeStatusFilter;
  });
  const pendingOvertimeApprovals = allOvertimeRecords.filter((r) => r.status === "pending");

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
              <span className="font-bold text-gray-900">Leave &amp; Overtime Management</span>
              <span className="ml-2 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                {currentMember.role === "approver" ? "Approver / Manager" : "Team Member"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {currentMember.full_name || currentUserEmail}
              </p>
              <p className="text-xs text-gray-500">{currentUserEmail}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              title="Change your password"
            >
              Password
            </button>
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
          <nav className="-mb-px flex flex-wrap space-x-6 text-sm font-medium">
            {/* Tab 1: Leave Requests */}
            <button
              onClick={() => setActiveTab("leave")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                activeTab === "leave"
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Leave Requests</span>
              {pendingLeaveApprovals.length > 0 && isApprover && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  {pendingLeaveApprovals.length}
                </span>
              )}
            </button>

            {/* Tab 2: Overtime Claims */}
            <button
              onClick={() => setActiveTab("overtime")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                activeTab === "overtime"
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              <span>Overtime Claims</span>
              {pendingOvertimeApprovals.length > 0 && isApprover && (
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-900">
                  {pendingOvertimeApprovals.length}
                </span>
              )}
            </button>

            {/* Tab 3: Team Calendar */}
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                activeTab === "calendar"
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Team Calendar</span>
            </button>

            {/* Tab 4: Admin & Analytics (Approvers only) */}
            {isApprover && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                  activeTab === "admin"
                    ? "border-brand text-brand font-semibold"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <ChartBarIcon className="h-4 w-4" />
                <span>Admin &amp; Metrics</span>
                {(pendingLeaveApprovals.length > 0 || pendingOvertimeApprovals.length > 0) && (
                  <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                    {pendingLeaveApprovals.length + pendingOvertimeApprovals.length}
                  </span>
                )}
              </button>
            )}

            {/* Tab 5: Team Management (Approvers only) */}
            {isApprover && (
              <button
                onClick={() => setActiveTab("team")}
                className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                  activeTab === "team"
                    ? "border-brand text-brand font-semibold"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <UsersIcon className="h-4 w-4" />
                <span>Team Management</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8">
        {!schemaReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Notice: Database Setup</p>
            <p className="mt-1 text-xs text-amber-800">
              Run <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">0006_secure_admin_provisioning.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
        )}

        {/* TAB 1: LEAVE REQUESTS */}
        {activeTab === "leave" && (
          <div className="space-y-8">
            {/* My Leave Balances with Progress Bars */}
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
                  const remainingPercent =
                    entitled > 0 ? Math.round((remaining / entitled) * 100) : 0;

                  return (
                    <div
                      key={leaveType.code}
                      className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
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

                      {/* Progress Bar of Remaining Allowance */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                          <span>{approved}d taken</span>
                          <span className="font-semibold">{remainingPercent}% available</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              remainingPercent > 50
                                ? "bg-emerald-500"
                                : remainingPercent > 20
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${remainingPercent}%` }}
                          />
                        </div>
                        {pending > 0 && (
                          <div className="mt-1 text-right text-[10px] text-amber-700">
                            {pending}d pending approval
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Apply for Leave Form with Smart Date Range & Clash Check */}
            <LeaveRequestForm
              currentUserEmail={currentUserEmail}
              leaveTypes={leaveTypes}
              balances={myBalances}
              teamMembers={teamMembers}
              existingRequests={allLeaveRequests}
            />

            {/* Policy Reference Card */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <div className="flex items-center gap-2 mb-2">
                <InformationCircleIcon className="h-5 w-5 text-brand" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Safaricom Leave Policy Guidelines
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600">
                <div className="rounded-xl bg-white p-3 border border-gray-200">
                  <span className="font-bold text-gray-900 block">Annual Leave (21d)</span>
                  <span className="text-[11px] text-gray-500">
                    Plan in advance with your designated handover colleague. Weekends are automatically excluded.
                  </span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-gray-200">
                  <span className="font-bold text-gray-900 block">Sick Leave (14d)</span>
                  <span className="text-[11px] text-gray-500">
                    Medical and recovery leave. Submit medical slip for absence exceeding 2 consecutive days.
                  </span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-gray-200">
                  <span className="font-bold text-gray-900 block">Compassionate (5d)</span>
                  <span className="text-[11px] text-gray-500">
                    For family bereavement or urgent critical emergencies. Inform manager as soon as practical.
                  </span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-gray-200">
                  <span className="font-bold text-gray-900 block">Study / Exams (5d)</span>
                  <span className="text-[11px] text-gray-500">
                    Granted for recognized certifications, university exams, or pre-approved professional courses.
                  </span>
                </div>
              </div>
            </div>

            {/* My Leave Requests Table */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">My Leave History</h2>
                  <p className="text-xs text-gray-500">Track status, handover details, and manager reviews.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search leaves…"
                      value={leaveSearchQuery}
                      onChange={(e) => setLeaveSearchQuery(e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 shadow-2xs transition focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setLeaveStatusFilter(status)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                          leaveStatusFilter === status
                            ? "bg-brand text-white shadow-2xs"
                            : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredLeaveRequests.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {leaveStatusFilter === "all" && !leaveSearchQuery
                    ? "You have not submitted any leave requests yet."
                    : "No leave requests match your search or filter."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 pr-2 w-6"></th>
                        <th className="py-2.5 pr-4">Type</th>
                        <th className="px-3 py-2.5">Start</th>
                        <th className="px-3 py-2.5">End</th>
                        <th className="px-3 py-2.5">Working Days</th>
                        <th className="px-3 py-2.5">Relief Colleague</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLeaveRequests.map((r) => {
                        const type = leaveTypeMap.get(r.leave_type);
                        const handover = memberMap.get(r.handover_email?.toLowerCase() || "");
                        const isExpanded = expandedLeaveId === r.id;

                        return (
                          <tr key={r.id} className="group">
                            <td colSpan={8} className="p-0">
                              <div className="hover:bg-gray-50/60 transition flex flex-col">
                                <div className="flex items-center w-full px-2 py-3">
                                  <div className="w-6 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedLeaveId(isExpanded ? null : r.id)}
                                      className="rounded p-1 text-gray-400 hover:text-gray-700 transition"
                                      title={isExpanded ? "Collapse details" : "Expand details"}
                                    >
                                      {isExpanded ? (
                                        <ChevronUpIcon className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDownIcon className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>

                                  <div className="w-1/4 pr-4 font-semibold text-gray-900">
                                    {type?.name ?? r.leave_type}
                                  </div>

                                  <div className="w-24 px-3 font-mono text-gray-700">{r.start_date}</div>
                                  <div className="w-24 px-3 font-mono text-gray-700">{r.end_date}</div>
                                  <div className="w-24 px-3 font-semibold text-gray-900">{r.working_days}d</div>

                                  <div className="flex-1 px-3 text-gray-600 truncate">
                                    {handover ? handover.full_name : r.handover_email || "—"}
                                  </div>

                                  <div className="w-28 px-3">
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                        STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {r.status.toUpperCase()}
                                    </span>
                                  </div>

                                  <div className="w-20 px-3 text-right">
                                    {r.status === "pending" && (
                                      <form action={cancelLeaveRequest} className="inline">
                                        <input type="hidden" name="request_id" value={r.id} />
                                        <button
                                          type="submit"
                                          className="text-xs text-red-600 hover:text-red-800 font-semibold active:scale-95 transition"
                                        >
                                          Cancel
                                        </button>
                                      </form>
                                    )}
                                  </div>
                                </div>

                                {/* Expanded Detailed View */}
                                {isExpanded && (
                                  <div className="bg-gray-50/80 px-8 py-3.5 border-t border-gray-100 text-xs animate-in fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                                          Reason &amp; Handover Brief:
                                        </span>
                                        <p className="text-gray-800 bg-white p-2.5 rounded-lg border border-gray-200">
                                          {r.reason || "No specific handover notes recorded."}
                                        </p>
                                      </div>

                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                                          Manager Authorization &amp; Remarks:
                                        </span>
                                        <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">Reviewer:</span>
                                            <span className="font-semibold text-gray-900">
                                              {r.reviewed_by || "F. Mbuthia (Manager)"}
                                            </span>
                                          </div>
                                          {r.reviewed_at && (
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-gray-500">Decision Date:</span>
                                              <span className="font-mono text-gray-700">{r.reviewed_at.slice(0, 10)}</span>
                                            </div>
                                          )}
                                          {r.reviewer_note && (
                                            <div className="pt-1 border-t border-gray-100 text-gray-700">
                                              <span className="font-semibold text-gray-800">Remarks: </span>
                                              <span>{r.reviewer_note}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400 text-right">
                                      Submitted: {r.created_at ? r.created_at.slice(0, 19).replace("T", " ") : "—"}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: OVERTIME CLAIMS */}
        {activeTab === "overtime" && (
          <div className="space-y-8">
            {/* My Overtime Summary with Progress Bars */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Approved Hours ({currentYear})
                </span>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {myOvertimeStats.totalHoursApproved.toFixed(1)} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                    <span className="font-semibold text-blue-700">{myOvertimeStats.paidHoursApproved.toFixed(1)}h Paid</span>
                    <span className="font-semibold text-purple-700">{myOvertimeStats.toilHoursApproved.toFixed(1)}h TOIL</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 flex">
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${
                          myOvertimeStats.totalHoursApproved > 0
                            ? (myOvertimeStats.paidHoursApproved / myOvertimeStats.totalHoursApproved) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div
                      className="bg-purple-500"
                      style={{
                        width: `${
                          myOvertimeStats.totalHoursApproved > 0
                            ? (myOvertimeStats.toilHoursApproved / myOvertimeStats.totalHoursApproved) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Pending Claim Hours
                </span>
                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {myOvertimeStats.totalHoursPending.toFixed(1)} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">Awaiting approver review</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  TOIL Accumulated
                </span>
                <p className="mt-2 text-3xl font-bold text-purple-700">
                  {(myOvertimeStats.toilHoursApproved / 8).toFixed(1)}{" "}
                  <span className="text-sm font-normal text-gray-500">days equivalent</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">Calculated as 8 working hours = 1 day</p>
              </div>
            </section>

            {/* Overtime Request Form */}
            <OvertimeRequestForm
              currentUserEmail={currentUserEmail}
              currentUserName={currentMember.full_name || currentUserEmail}
            />

            {/* My Overtime Claims History Table */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900">My Overtime Claims</h2>
                <div className="flex items-center gap-1">
                  {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOvertimeStatusFilter(status)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                        overtimeStatusFilter === status
                          ? "bg-brand text-white shadow-2xs"
                          : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOvertimeRecords.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {overtimeStatusFilter === "all"
                    ? "You have not logged any overtime claims yet."
                    : `No ${overtimeStatusFilter} overtime claims found.`}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 pr-4">Date Worked</th>
                        <th className="px-3 py-2.5">Hours</th>
                        <th className="px-3 py-2.5">Preference</th>
                        <th className="px-3 py-2.5">Task &amp; Reference</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOvertimeRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50/50">
                          <td className="py-3 pr-4 font-mono font-medium text-gray-900">
                            {record.overtime_date}
                          </td>
                          <td className="px-3 py-3 font-semibold">{record.hours}h</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                record.compensatory_choice === "paid"
                                  ? "bg-blue-50 text-blue-800"
                                  : "bg-purple-50 text-purple-800"
                              }`}
                            >
                              {record.compensatory_choice.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">
                              {record.task_summary}
                            </div>
                            {record.ticket_ref && (
                              <div className="text-[11px] font-mono text-gray-400">
                                Ref: {record.ticket_ref}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                STATUS_BADGE[record.status] ?? "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {record.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptRecord(record)}
                                className="text-xs text-brand hover:text-brand-dark font-semibold transition"
                              >
                                Receipt
                              </button>
                              {record.status === "pending" && (
                                <form action={cancelOvertimeRequest} className="inline">
                                  <input type="hidden" name="record_id" value={record.id} />
                                  <button
                                    type="submit"
                                    className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: TEAM CALENDAR */}
        {activeTab === "calendar" && (
          <TeamCalendar
            teamMembers={teamMembers}
            leaveRequests={allLeaveRequests}
            leaveTypes={leaveTypes}
          />
        )}

        {/* TAB 4: ADMIN & METRICS (APPROVERS ONLY) */}
        {activeTab === "admin" && isApprover && (
          <AdminOverview
            teamMembers={teamMembers}
            leaveRequests={allLeaveRequests}
            leaveTypes={leaveTypes}
            overtimeRecords={allOvertimeRecords}
            currentYear={currentYear}
          />
        )}

        {/* TAB 5: TEAM MANAGEMENT (APPROVERS ONLY) */}
        {activeTab === "team" && isApprover && (
          <TeamManagement
            currentUserEmail={currentUserEmail}
            members={teamMembers}
          />
        )}

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />

        {/* Printable Overtime Receipt Modal */}
        {selectedReceiptRecord && (
          <OvertimeReceiptModal
            record={selectedReceiptRecord}
            employeeName={currentMember.full_name || currentUserEmail}
            onClose={() => setSelectedReceiptRecord(null)}
          />
        )}
      </main>
    </div>
  );
}

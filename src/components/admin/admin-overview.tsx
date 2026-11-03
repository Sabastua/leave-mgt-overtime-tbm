"use client";

import { useState } from "react";
import type { LeaveRequest, LeaveType } from "@/lib/leave/types";
import type { OvertimeRecord } from "@/lib/overtime/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import { computeUserBalances } from "@/lib/leave/types";
import { reviewLeaveRequest, batchReviewLeaveRequests } from "@/app/actions/leave";
import { reviewOvertimeRequest, batchReviewOvertimeRequests } from "@/app/actions/overtime";
import {
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from "@/components/ui/icons";

type Props = {
  teamMembers: AllowedUser[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  overtimeRecords: OvertimeRecord[];
  currentYear: number;
};

export function AdminOverview({
  teamMembers,
  leaveRequests,
  leaveTypes,
  overtimeRecords,
  currentYear,
}: Props) {
  const [memberSearch, setMemberSearch] = useState("");
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeMembers = teamMembers.filter((m) => m.is_active);
  const memberMap = new Map(teamMembers.map((m) => [m.email.toLowerCase(), m]));
  const leaveTypeMap = new Map(leaveTypes.map((t) => [t.code, t]));

  // Approval Center State
  const [approvalTab, setApprovalTab] = useState<"all" | "leaves" | "overtime">("all");
  const [selectedLeaveBatch, setSelectedLeaveBatch] = useState<string[]>([]);
  const [selectedOvertimeBatch, setSelectedOvertimeBatch] = useState<string[]>([]);
  const [leaveNotes, setLeaveNotes] = useState<Record<string, string>>({});
  const [overtimeNotes, setOvertimeNotes] = useState<Record<string, string>>({});
  const [batchLeaveNote, setBatchLeaveNote] = useState("");
  const [batchOvertimeNote, setBatchOvertimeNote] = useState("");

  // 1. Pending Approvals
  const pendingLeaves = leaveRequests.filter((r) => r.status === "pending");
  const pendingOvertime = overtimeRecords.filter((r) => r.status === "pending");
  const totalPending = pendingLeaves.length + pendingOvertime.length;

  // 2. Active leaves right now (today falls between start_date and end_date)
  const currentActiveLeaves = leaveRequests.filter(
    (r) => r.status === "approved" && r.start_date <= todayStr && r.end_date >= todayStr
  );

  // 3. Calculate total team metrics for current year
  const approvedYearLeaves = leaveRequests.filter(
    (r) =>
      r.status === "approved" &&
      (r.start_date.startsWith(String(currentYear)) ||
        r.end_date.startsWith(String(currentYear)))
  );

  const totalLeaveDaysTaken = approvedYearLeaves.reduce(
    (sum, r) => sum + r.working_days,
    0
  );

  const approvedOvertime = overtimeRecords.filter((r) => r.status === "approved");
  const totalOvertimeHours = approvedOvertime.reduce(
    (sum, r) => sum + Number(r.hours),
    0
  );
  const paidOvertimeHours = approvedOvertime
    .filter((r) => r.compensatory_choice === "paid")
    .reduce((sum, r) => sum + Number(r.hours), 0);
  const toilOvertimeHours = approvedOvertime
    .filter((r) => r.compensatory_choice === "time_off_in_lieu")
    .reduce((sum, r) => sum + Number(r.hours), 0);

  // 4. Leave Type Distribution Breakdown
  const daysByType: Record<string, number> = {};
  leaveTypes.forEach((t) => {
    daysByType[t.code] = 0;
  });
  approvedYearLeaves.forEach((r) => {
    daysByType[r.leave_type] = (daysByType[r.leave_type] || 0) + r.working_days;
  });

  // 5. Monthly trend (months 1 to 12)
  const monthlyDays = Array(12).fill(0);
  approvedYearLeaves.forEach((r) => {
    const monthIndex = new Date(r.start_date).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyDays[monthIndex] += r.working_days;
    }
  });
  const maxMonthDays = Math.max(...monthlyDays, 1);

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Filter team members in entitlements table
  const filteredMembers = activeMembers.filter((m) => {
    if (!memberSearch) return true;
    const term = memberSearch.toLowerCase();
    return (
      m.email.toLowerCase().includes(term) ||
      (m.full_name && m.full_name.toLowerCase().includes(term))
    );
  });

  // CSV Export functions
  function exportLeaveCSV() {
    const headers = [
      "Request ID",
      "Employee Name",
      "Employee Email",
      "Leave Type",
      "Start Date",
      "End Date",
      "Working Days",
      "Handover Person",
      "Status",
      "Reason",
      "Reviewed By",
      "Reviewed At",
    ];

    const rows = leaveRequests.map((r) => {
      const member = memberMap.get(r.user_email.toLowerCase());
      const type = leaveTypeMap.get(r.leave_type);
      return [
        r.id,
        `"${member?.full_name || ""}"`,
        r.user_email,
        type?.name || r.leave_type,
        r.start_date,
        r.end_date,
        r.working_days,
        r.handover_email || "",
        r.status,
        `"${(r.reason || "").replace(/"/g, '""')}"`,
        r.reviewed_by || "",
        r.reviewed_at || "",
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Safaricom_Leave_Report_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportOvertimeCSV() {
    const headers = [
      "Record ID",
      "Employee Name",
      "Employee Email",
      "Date Worked",
      "Hours",
      "Compensatory Choice",
      "Ticket Reference",
      "Task Summary",
      "Status",
      "Reviewed By",
      "Reviewed At",
    ];

    const rows = overtimeRecords.map((r) => {
      const member = memberMap.get(r.user_email.toLowerCase());
      return [
        r.id,
        `"${member?.full_name || ""}"`,
        r.user_email,
        r.overtime_date,
        r.hours,
        r.compensatory_choice,
        r.ticket_ref || "",
        `"${(r.task_summary || "").replace(/"/g, '""')}"`,
        r.status,
        r.reviewed_by || "",
        r.reviewed_at || "",
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Safaricom_Overtime_Report_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-8">
      {/* Top Controls & Exports */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Metrics &amp; Analytics</h1>
          <p className="text-xs text-gray-500">
            Real-time department leave balances, team utilization, and approval workflows
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportLeaveCSV}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
            title="Download full leave requests report as CSV"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
            <span>Export Leaves</span>
          </button>
          <button
            onClick={exportOvertimeCSV}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
            title="Download full overtime claims report as CSV"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
            <span>Export Overtime</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* On Leave Today */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              On Leave Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {currentActiveLeaves.length}
            </span>
            <span className="text-xs text-gray-500">of {activeMembers.length} members</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {currentActiveLeaves.length === 0
              ? "All team members are in office"
              : `${currentActiveLeaves.map((l) => memberMap.get(l.user_email.toLowerCase())?.full_name?.split(" ")[0] || l.user_email.split("@")[0]).join(", ")} out`}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Pending Approvals
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClockIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">
              {totalPending}
            </span>
            <span className="text-xs text-gray-500">requests</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {pendingLeaves.length} leave, {pendingOvertime.length} overtime
          </p>
        </div>

        {/* Total Working Days Taken */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Days Taken ({currentYear})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {totalLeaveDaysTaken}
            </span>
            <span className="text-xs text-gray-500">working days</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Team leave total across all types
          </p>
        </div>

        {/* Overtime Logged */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Approved Overtime
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ClockIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {totalOvertimeHours.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500">hrs</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {paidOvertimeHours.toFixed(1)}h Paid • {toilOvertimeHours.toFixed(1)}h TOIL
          </p>
        </div>
      </div>

      {/* Active & Ongoing Leaves with Duration Progress Bars */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Currently On Leave &amp; Duration Progress
            </h2>
            <p className="text-xs text-gray-500">
              Active leaves with elapsed time vs total approved leave duration
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {currentActiveLeaves.length} Active Now
          </span>
        </div>

        {currentActiveLeaves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
            No team members are currently away on leave today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {currentActiveLeaves.map((leave) => {
              const member = memberMap.get(leave.user_email.toLowerCase());
              const type = leaveTypeMap.get(leave.leave_type);
              const handover = memberMap.get(leave.handover_email?.toLowerCase() || "");

              // Calculate elapsed calendar days
              const start = new Date(leave.start_date);
              const end = new Date(leave.end_date);
              const today = new Date(todayStr);

              const totalSpanMs = Math.max(end.getTime() - start.getTime(), 1);
              const elapsedSpanMs = Math.max(today.getTime() - start.getTime(), 0);
              const percentElapsed = Math.min(
                100,
                Math.max(0, Math.round((elapsedSpanMs / totalSpanMs) * 100))
              );

              return (
                <div
                  key={leave.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {member?.full_name || leave.user_email}
                      </h3>
                      <p className="text-xs text-gray-500">{leave.user_email}</p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                      {type?.name || leave.leave_type}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">
                        Leave Duration ({leave.working_days} working days)
                      </span>
                      <span className="font-bold text-brand">{percentElapsed}% elapsed</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${percentElapsed}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                      <span>Started: {leave.start_date}</span>
                      <span>Ends: {leave.end_date}</span>
                    </div>
                  </div>

                  {/* Relief / Handover */}
                  {leave.handover_email && (
                    <div className="mt-3 text-xs text-gray-600">
                      <span className="font-semibold text-gray-700">Relief Person:</span>{" "}
                      {handover ? handover.full_name : leave.handover_email}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Leave Days Taken Chart */}
        <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Monthly Leave Distribution ({currentYear})
              </h2>
              <p className="text-xs text-gray-500">Total working days taken per month</p>
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="mt-6 flex h-44 items-end gap-2 border-b border-gray-200 pb-2">
            {monthlyDays.map((days, idx) => {
              const heightPercent = Math.round((days / maxMonthDays) * 100);
              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-gray-600">
                    {days > 0 ? days : ""}
                  </span>
                  <div className="w-full rounded-t bg-gray-100 h-28 flex items-end">
                    <div
                      className="w-full rounded-t bg-brand transition-all duration-500"
                      style={{ height: `${Math.max(heightPercent, days > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">
                    {MONTH_NAMES[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leave Type Breakdown & Overtime Ratio */}
        <section className="space-y-6">
          {/* Leave Type Distribution */}
          <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <h2 className="text-base font-bold text-gray-900">Leave Types Breakdown</h2>
            <p className="mb-4 text-xs text-gray-500">
              Proportion of leave days used by category
            </p>

            <div className="space-y-3">
              {leaveTypes.map((type) => {
                const days = daysByType[type.code] || 0;
                const percent =
                  totalLeaveDaysTaken > 0
                    ? Math.round((days / totalLeaveDaysTaken) * 100)
                    : 0;

                return (
                  <div key={type.code}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{type.name}</span>
                      <span className="font-mono text-gray-600">
                        {days} days ({percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overtime Compensatory Ratio */}
          <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <h2 className="text-base font-bold text-gray-900">Overtime Compensation Choice</h2>
            <p className="mb-4 text-xs text-gray-500">Paid payout vs Time Off In Lieu (TOIL)</p>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-blue-700">
                  Paid: {paidOvertimeHours.toFixed(1)}h (
                  {totalOvertimeHours > 0
                    ? Math.round((paidOvertimeHours / totalOvertimeHours) * 100)
                    : 0}
                  %)
                </span>
                <span className="text-purple-700">
                  TOIL: {toilOvertimeHours.toFixed(1)}h (
                  {totalOvertimeHours > 0
                    ? Math.round((toilOvertimeHours / totalOvertimeHours) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-blue-500"
                  style={{
                    width: `${
                      totalOvertimeHours > 0
                        ? (paidOvertimeHours / totalOvertimeHours) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-purple-500"
                  style={{
                    width: `${
                      totalOvertimeHours > 0
                        ? (toilOvertimeHours / totalOvertimeHours) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Team Entitlements & Balances Table with Search and Progress Bars */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Team Leave Entitlements &amp; Remaining Days ({currentYear})
            </h2>
            <p className="text-xs text-gray-500">
              Allowance balances for all active team members
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search member..."
              className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-3 pr-4">Team Member</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3 min-w-[160px]">Annual Leave (21d)</th>
                <th className="px-3 py-3 text-right">Sick (14d)</th>
                <th className="px-3 py-3 text-right">Compassionate (5d)</th>
                <th className="px-3 py-3 text-right">Study (5d)</th>
                <th className="px-3 py-3 text-right">Total Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const bals = computeUserBalances(
                  leaveTypes,
                  leaveRequests,
                  member.email,
                  currentYear
                );

                const annualBal = bals.find((b) => b.leaveType.code === "annual");
                const annualRemaining = annualBal?.remaining ?? 21;
                const annualEntitled = annualBal?.entitled ?? 21;
                const annualPercent = Math.round(
                  (annualRemaining / annualEntitled) * 100
                );

                const sickBal = bals.find((b) => b.leaveType.code === "sick");
                const compassionateBal = bals.find(
                  (b) => b.leaveType.code === "compassionate"
                );
                const studyBal = bals.find((b) => b.leaveType.code === "study");

                const memberTotalTaken = bals.reduce((sum, b) => sum + b.approved, 0);

                return (
                  <tr key={member.email} className="hover:bg-gray-50/50">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-gray-900">
                        {member.full_name || member.email}
                      </div>
                      <div className="text-[11px] text-gray-400">{member.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          member.role === "approver"
                            ? "bg-brand/10 text-brand-dark"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.role === "approver" ? "Approver" : "Staff"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-gray-900">
                          {annualRemaining}{" "}
                          <span className="font-normal text-gray-400">
                            /{annualEntitled} left
                          </span>
                        </span>
                        <span className="text-gray-400">{annualPercent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${
                            annualPercent > 50
                              ? "bg-emerald-500"
                              : annualPercent > 20
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${annualPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">
                      {sickBal?.remaining ?? 14}
                      <span className="font-normal text-gray-400">/14</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">
                      {compassionateBal?.remaining ?? 5}
                      <span className="font-normal text-gray-400">/5</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">
                      {studyBal?.remaining ?? 5}
                      <span className="font-normal text-gray-400">/5</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-gray-900">
                      {memberTotalTaken}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manager Approval & Review Center */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-white text-xs font-black">
                M
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                Manager Approval Center
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              1-Click Decisions, Quick-Canned Feedback Presets &amp; Multi-Select Batch Approvals
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setApprovalTab("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                approvalTab === "all"
                  ? "bg-brand text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All Pending ({totalPending})
            </button>
            <button
              type="button"
              onClick={() => setApprovalTab("leaves")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                approvalTab === "leaves"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              Leaves ({pendingLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => setApprovalTab("overtime")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                approvalTab === "overtime"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              Overtime ({pendingOvertime.length})
            </button>
          </div>
        </div>

        {totalPending === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
            All clear! No pending leave requests or overtime claims awaiting review.
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. LEAVE APPROVALS QUEUE */}
            {(approvalTab === "all" || approvalTab === "leaves") && pendingLeaves.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                      Pending Leave Requests ({pendingLeaves.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedLeaveBatch.length === pendingLeaves.length) {
                          setSelectedLeaveBatch([]);
                        } else {
                          setSelectedLeaveBatch(pendingLeaves.map((r) => r.id));
                        }
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      {selectedLeaveBatch.length === pendingLeaves.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  {/* Batch Actions Bar for Leaves */}
                  {selectedLeaveBatch.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-2 border border-amber-200 animate-in fade-in">
                      <span className="text-xs font-bold text-amber-900">
                        {selectedLeaveBatch.length} Selected
                      </span>
                      <form action={batchReviewLeaveRequests} className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="hidden"
                          name="request_ids"
                          value={selectedLeaveBatch.join(",")}
                        />
                        <input
                          type="text"
                          name="reviewer_note"
                          value={batchLeaveNote}
                          onChange={(e) => setBatchLeaveNote(e.target.value)}
                          placeholder="Batch review note…"
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
                        />
                        <button
                          type="submit"
                          name="decision"
                          value="approved"
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          <span>Approve ({selectedLeaveBatch.length})</span>
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-red-700 active:scale-95"
                        >
                          <XCircleIcon className="h-3.5 w-3.5" />
                          <span>Reject ({selectedLeaveBatch.length})</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Individual Leave Cards */}
                <div className="space-y-3">
                  {pendingLeaves.map((request) => {
                    const requester = memberMap.get(request.user_email.toLowerCase());
                    const type = leaveTypeMap.get(request.leave_type);
                    const handover = memberMap.get(request.handover_email?.toLowerCase() || "");
                    const isSelected = selectedLeaveBatch.includes(request.id);

                    // Compute live balance context for manager
                    const applicantBalances = computeUserBalances(
                      leaveTypes,
                      leaveRequests,
                      request.user_email,
                      currentYear
                    );
                    const bal = applicantBalances.find((b) => b.leaveType.code === request.leave_type);

                    const cannedPresets = [
                      "Approved, relief confirmed",
                      "Approved per team schedule",
                      "Approved, enjoy your leave",
                      "Rejected: Team coverage constraint",
                    ];

                    return (
                      <div
                        key={request.id}
                        className={`rounded-2xl border p-4 transition-all duration-200 ${
                          isSelected
                            ? "border-amber-400 bg-amber-50/70 ring-1 ring-amber-400/30"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeaveBatch((prev) => [...prev, request.id]);
                                } else {
                                  setSelectedLeaveBatch((prev) =>
                                    prev.filter((id) => id !== request.id)
                                  );
                                }
                              }}
                              className="mt-1 h-4 w-4 rounded accent-brand cursor-pointer"
                            />

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">
                                  {requester?.full_name || request.user_email}
                                </span>
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                  {type?.name || request.leave_type}
                                </span>
                                {bal && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                                    {bal.remaining}d available
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-gray-600">
                                <span className="font-mono font-semibold">{request.start_date}</span> to{" "}
                                <span className="font-mono font-semibold">{request.end_date}</span> (
                                <strong className="text-gray-900">{request.working_days} working days</strong>)
                              </p>

                              {request.handover_email && (
                                <p className="mt-0.5 text-xs text-gray-500">
                                  <span className="font-semibold text-gray-600">Relief Colleague:</span>{" "}
                                  {handover ? handover.full_name : request.handover_email}
                                </p>
                              )}

                              {request.reason && (
                                <p className="mt-1.5 text-xs italic text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono text-[11px]">
                                  &quot;{request.reason}&quot;
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Canned Remarks & Decision Actions */}
                          <div className="flex flex-col gap-2 w-full lg:w-auto lg:items-end">
                            {/* Canned feedback presets */}
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400">
                                Canned:
                              </span>
                              {cannedPresets.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() =>
                                    setLeaveNotes((prev) => ({ ...prev, [request.id]: preset }))
                                  }
                                  className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-200 transition"
                                >
                                  {preset.split(":")[0]}
                                </button>
                              ))}
                            </div>

                            {/* Review Form */}
                            <form action={reviewLeaveRequest} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="request_id" value={request.id} />
                              <input
                                type="text"
                                name="reviewer_note"
                                value={leaveNotes[request.id] || ""}
                                onChange={(e) =>
                                  setLeaveNotes((prev) => ({
                                    ...prev,
                                    [request.id]: e.target.value,
                                  }))
                                }
                                placeholder="Decision remarks…"
                                className="w-full sm:w-56 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
                              />
                              <button
                                type="submit"
                                name="decision"
                                value="approved"
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="submit"
                                name="decision"
                                value="rejected"
                                className="flex items-center gap-1 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-red-700 active:scale-95"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                <span>Reject</span>
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. OVERTIME APPROVALS QUEUE */}
            {(approvalTab === "all" || approvalTab === "overtime") && pendingOvertime.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                      Pending Overtime Claims ({pendingOvertime.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedOvertimeBatch.length === pendingOvertime.length) {
                          setSelectedOvertimeBatch([]);
                        } else {
                          setSelectedOvertimeBatch(pendingOvertime.map((r) => r.id));
                        }
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      {selectedOvertimeBatch.length === pendingOvertime.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  {/* Batch Actions Bar for Overtime */}
                  {selectedOvertimeBatch.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 p-2 border border-blue-200 animate-in fade-in">
                      <span className="text-xs font-bold text-blue-900">
                        {selectedOvertimeBatch.length} Selected
                      </span>
                      <form action={batchReviewOvertimeRequests} className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="hidden"
                          name="record_ids"
                          value={selectedOvertimeBatch.join(",")}
                        />
                        <input
                          type="text"
                          name="reviewer_note"
                          value={batchOvertimeNote}
                          onChange={(e) => setBatchOvertimeNote(e.target.value)}
                          placeholder="Batch review note…"
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
                        />
                        <button
                          type="submit"
                          name="decision"
                          value="approved"
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          <span>Approve ({selectedOvertimeBatch.length})</span>
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-red-700 active:scale-95"
                        >
                          <XCircleIcon className="h-3.5 w-3.5" />
                          <span>Reject ({selectedOvertimeBatch.length})</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Individual Overtime Cards */}
                <div className="space-y-3">
                  {pendingOvertime.map((record) => {
                    const requester = memberMap.get(record.user_email.toLowerCase());
                    const isSelected = selectedOvertimeBatch.includes(record.id);

                    const cannedPresets = [
                      "Approved per shift rota",
                      "Approved, verified against ticket",
                      "Approved, emergency support confirmed",
                      "Rejected: Hours require clarification",
                    ];

                    return (
                      <div
                        key={record.id}
                        className={`rounded-2xl border p-4 transition-all duration-200 ${
                          isSelected
                            ? "border-blue-400 bg-blue-50/70 ring-1 ring-blue-400/30"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOvertimeBatch((prev) => [...prev, record.id]);
                                } else {
                                  setSelectedOvertimeBatch((prev) =>
                                    prev.filter((id) => id !== record.id)
                                  );
                                }
                              }}
                              className="mt-1 h-4 w-4 rounded accent-brand cursor-pointer"
                            />

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">
                                  {requester?.full_name || record.user_email}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    record.compensatory_choice === "paid"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {record.compensatory_choice === "paid" ? "PAID PAYROLL" : "TOIL CREDIT"}
                                </span>
                                <span className="font-mono text-xs font-extrabold text-gray-900">
                                  {record.hours} Hours
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-gray-600">
                                Date Worked: <span className="font-mono font-semibold">{record.overtime_date}</span>
                                {record.ticket_ref && (
                                  <span className="ml-2 font-mono text-[11px] text-gray-500">
                                    Ref: {record.ticket_ref}
                                  </span>
                                )}
                              </p>

                              <p className="mt-1.5 text-xs italic text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono text-[11px] whitespace-pre-wrap">
                                &quot;{record.task_summary}&quot;
                              </p>
                            </div>
                          </div>

                          {/* Quick Canned Remarks & Decision Actions */}
                          <div className="flex flex-col gap-2 w-full lg:w-auto lg:items-end">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400">
                                Canned:
                              </span>
                              {cannedPresets.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() =>
                                    setOvertimeNotes((prev) => ({ ...prev, [record.id]: preset }))
                                  }
                                  className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-200 transition"
                                >
                                  {preset.split(":")[0]}
                                </button>
                              ))}
                            </div>

                            <form action={reviewOvertimeRequest} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="record_id" value={record.id} />
                              <input
                                type="text"
                                name="reviewer_note"
                                value={overtimeNotes[record.id] || ""}
                                onChange={(e) =>
                                  setOvertimeNotes((prev) => ({
                                    ...prev,
                                    [record.id]: e.target.value,
                                  }))
                                }
                                placeholder="Decision remarks…"
                                className="w-full sm:w-56 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
                              />
                              <button
                                type="submit"
                                name="decision"
                                value="approved"
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="submit"
                                name="decision"
                                value="rejected"
                                className="flex items-center gap-1 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-red-700 active:scale-95"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                <span>Reject</span>
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

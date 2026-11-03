"use client";

import { useState, useMemo } from "react";
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
  FunnelIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeMembers = useMemo(() => teamMembers.filter((m) => m.is_active), [teamMembers]);
  const memberMap = useMemo(() => new Map(teamMembers.map((m) => [m.email.toLowerCase(), m])), [teamMembers]);
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map((t) => [t.code, t])), [leaveTypes]);

  // Approval Center State
  const [approvalTab, setApprovalTab] = useState<"all" | "leaves" | "overtime">("all");
  const [selectedLeaveBatch, setSelectedLeaveBatch] = useState<string[]>([]);
  const [selectedOvertimeBatch, setSelectedOvertimeBatch] = useState<string[]>([]);
  const [leaveNotes, setLeaveNotes] = useState<Record<string, string>>({});
  const [overtimeNotes, setOvertimeNotes] = useState<Record<string, string>>({});
  const [batchLeaveNote, setBatchLeaveNote] = useState("");
  const [batchOvertimeNote, setBatchOvertimeNote] = useState("");

  // Chart Metric Toggle
  const [chartMetric, setChartMetric] = useState<"leaves" | "overtime" | "combined">("leaves");
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Member Balances Search & Sort
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState<"least_remaining" | "most_taken" | "name">("least_remaining");

  // Payroll Report Generator State
  const firstDayOfMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const [reportStartDate, setReportStartDate] = useState(firstDayOfMonth);
  const [reportEndDate, setReportEndDate] = useState(todayStr);
  const [reportMemberFilter, setReportMemberFilter] = useState<string>("all");
  const [reportTypeFilter, setReportTypeFilter] = useState<"all" | "overtime_paid" | "overtime_toil" | "leaves">("all");

  // 1. Pending Approvals
  const pendingLeaves = useMemo(() => leaveRequests.filter((r) => r.status === "pending"), [leaveRequests]);
  const pendingOvertime = useMemo(() => overtimeRecords.filter((r) => r.status === "pending"), [overtimeRecords]);
  const totalPending = pendingLeaves.length + pendingOvertime.length;

  // 2. Active leaves right now (today falls between start_date and end_date)
  const currentActiveLeaves = useMemo(
    () =>
      leaveRequests.filter(
        (r) => r.status === "approved" && r.start_date <= todayStr && r.end_date >= todayStr
      ),
    [leaveRequests, todayStr]
  );

  // 3. Approved items for current year
  const approvedYearLeaves = useMemo(
    () =>
      leaveRequests.filter(
        (r) =>
          r.status === "approved" &&
          (r.start_date.startsWith(String(currentYear)) ||
            r.end_date.startsWith(String(currentYear)))
      ),
    [leaveRequests, currentYear]
  );

  const totalLeaveDaysTaken = useMemo(
    () => approvedYearLeaves.reduce((sum, r) => sum + r.working_days, 0),
    [approvedYearLeaves]
  );

  const approvedOvertime = useMemo(
    () => overtimeRecords.filter((r) => r.status === "approved"),
    [overtimeRecords]
  );

  const totalOvertimeHours = useMemo(
    () => approvedOvertime.reduce((sum, r) => sum + Number(r.hours), 0),
    [approvedOvertime]
  );

  const paidOvertimeHours = useMemo(
    () =>
      approvedOvertime
        .filter((r) => r.compensatory_choice === "paid")
        .reduce((sum, r) => sum + Number(r.hours), 0),
    [approvedOvertime]
  );

  const toilOvertimeHours = useMemo(
    () =>
      approvedOvertime
        .filter((r) => r.compensatory_choice === "time_off_in_lieu")
        .reduce((sum, r) => sum + Number(r.hours), 0),
    [approvedOvertime]
  );

  // 4. Monthly trends calculation (Jan - Dec)
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthlyData = useMemo(() => {
    const data = Array(12)
      .fill(null)
      .map(() => ({ leaveDays: 0, overtimeHours: 0, paidHours: 0, toilHours: 0 }));

    approvedYearLeaves.forEach((r) => {
      const monthIndex = new Date(r.start_date).getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        data[monthIndex].leaveDays += r.working_days;
      }
    });

    approvedOvertime.forEach((r) => {
      const monthIndex = new Date(r.overtime_date).getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        const h = Number(r.hours) || 0;
        data[monthIndex].overtimeHours += h;
        if (r.compensatory_choice === "paid") {
          data[monthIndex].paidHours += h;
        } else {
          data[monthIndex].toilHours += h;
        }
      }
    });

    return data;
  }, [approvedYearLeaves, approvedOvertime]);

  const maxMonthlyLeave = Math.max(...monthlyData.map((d) => d.leaveDays), 1);
  const maxMonthlyOvertime = Math.max(...monthlyData.map((d) => d.overtimeHours), 1);

  // 5. Leave Type Distribution Breakdown
  const daysByType = useMemo(() => {
    const counts: Record<string, number> = {};
    leaveTypes.forEach((t) => {
      counts[t.code] = 0;
    });
    approvedYearLeaves.forEach((r) => {
      counts[r.leave_type] = (counts[r.leave_type] || 0) + r.working_days;
    });
    return counts;
  }, [leaveTypes, approvedYearLeaves]);

  // Total leave liability across all active members
  const teamLiability = useMemo(() => {
    let totalEntitled = 0;
    let totalTaken = 0;
    let totalRemaining = 0;

    activeMembers.forEach((member) => {
      const bals = computeUserBalances(leaveTypes, leaveRequests, member.email, currentYear);
      bals.forEach((b) => {
        totalEntitled += b.entitled;
        totalTaken += b.approved;
        totalRemaining += b.remaining;
      });
    });

    return { totalEntitled, totalTaken, totalRemaining };
  }, [activeMembers, leaveTypes, leaveRequests, currentYear]);

  // Filter & sort team members
  const processedMembers = useMemo(() => {
    const list = activeMembers.map((member) => {
      const bals = computeUserBalances(leaveTypes, leaveRequests, member.email, currentYear);
      const annualBal = bals.find((b) => b.leaveType.code === "annual");
      const annualRemaining = annualBal?.remaining ?? 21;
      const annualEntitled = annualBal?.entitled ?? 21;
      const totalTaken = bals.reduce((sum, b) => sum + b.approved, 0);
      const totalRemaining = bals.reduce((sum, b) => sum + b.remaining, 0);

      // Overtime for this member
      const memberOt = approvedOvertime.filter(
        (r) => r.user_email.toLowerCase() === member.email.toLowerCase()
      );
      const totalOtHours = memberOt.reduce((sum, r) => sum + Number(r.hours), 0);

      return {
        member,
        bals,
        annualRemaining,
        annualEntitled,
        annualPercent: Math.round((annualRemaining / annualEntitled) * 100),
        totalTaken,
        totalRemaining,
        totalOtHours,
      };
    });

    // Search filter
    const filtered = list.filter((item) => {
      if (!memberSearch.trim()) return true;
      const term = memberSearch.toLowerCase();
      return (
        item.member.email.toLowerCase().includes(term) ||
        (item.member.full_name && item.member.full_name.toLowerCase().includes(term))
      );
    });

    // Sort
    if (memberSort === "least_remaining") {
      filtered.sort((a, b) => a.annualRemaining - b.annualRemaining);
    } else if (memberSort === "most_taken") {
      filtered.sort((a, b) => b.totalTaken - a.totalTaken);
    } else if (memberSort === "name") {
      filtered.sort((a, b) => (a.member.full_name || a.member.email).localeCompare(b.member.full_name || b.member.email));
    }

    return filtered;
  }, [activeMembers, leaveTypes, leaveRequests, currentYear, memberSearch, memberSort, approvedOvertime]);

  // Filtered dataset for Payroll Generator Preview
  const matchedPayrollRecords = useMemo(() => {
    const otList = overtimeRecords.filter((r) => {
      if (r.status !== "approved") return false;
      if (r.overtime_date < reportStartDate || r.overtime_date > reportEndDate) return false;
      if (reportMemberFilter !== "all" && r.user_email.toLowerCase() !== reportMemberFilter.toLowerCase()) return false;
      if (reportTypeFilter === "overtime_paid" && r.compensatory_choice !== "paid") return false;
      if (reportTypeFilter === "overtime_toil" && r.compensatory_choice !== "time_off_in_lieu") return false;
      if (reportTypeFilter === "leaves") return false;
      return true;
    });

    const lvList = leaveRequests.filter((r) => {
      if (r.status !== "approved") return false;
      if (r.start_date > reportEndDate || r.end_date < reportStartDate) return false;
      if (reportMemberFilter !== "all" && r.user_email.toLowerCase() !== reportMemberFilter.toLowerCase()) return false;
      if (reportTypeFilter === "overtime_paid" || reportTypeFilter === "overtime_toil") return false;
      return true;
    });

    return {
      overtime: otList,
      leaves: lvList,
      totalOtHours: otList.reduce((s, r) => s + Number(r.hours), 0),
      totalPaidOtHours: otList.filter((r) => r.compensatory_choice === "paid").reduce((s, r) => s + Number(r.hours), 0),
      totalToilOtHours: otList.filter((r) => r.compensatory_choice === "time_off_in_lieu").reduce((s, r) => s + Number(r.hours), 0),
      totalLeaveDays: lvList.reduce((s, r) => s + r.working_days, 0),
    };
  }, [overtimeRecords, leaveRequests, reportStartDate, reportEndDate, reportMemberFilter, reportTypeFilter]);

  // CSV Generator function
  function generateFilteredPayrollCSV() {
    const headers = [
      "Record Type",
      "Record Reference",
      "Employee Name",
      "Employee Email",
      "Date / Period",
      "Quantity (Hours or Working Days)",
      "Compensation Mode / Leave Type",
      "Ticket Reference",
      "Audit Status",
      "Reviewed By (Approver)",
      "Approval Timestamp",
    ];

    const rows: string[][] = [];

    // Add Overtime records
    matchedPayrollRecords.overtime.forEach((r) => {
      const member = memberMap.get(r.user_email.toLowerCase());
      rows.push([
        "Overtime Claim",
        `"SAF-OT-${r.id.slice(0, 8).toUpperCase()}"`,
        `"${member?.full_name || ""}"`,
        r.user_email,
        r.overtime_date,
        String(r.hours),
        r.compensatory_choice === "paid" ? "Paid Payroll" : "TOIL Credit",
        r.ticket_ref ? `"${r.ticket_ref}"` : "",
        r.status,
        r.reviewed_by || "fmbuthia@safaricom.co.ke",
        r.reviewed_at || "",
      ]);
    });

    // Add Leave records
    matchedPayrollRecords.leaves.forEach((r) => {
      const member = memberMap.get(r.user_email.toLowerCase());
      const type = leaveTypeMap.get(r.leave_type);
      rows.push([
        "Leave Request",
        `"SAF-LV-${r.id.slice(0, 8).toUpperCase()}"`,
        `"${member?.full_name || ""}"`,
        r.user_email,
        `"${r.start_date} to ${r.end_date}"`,
        String(r.working_days),
        type?.name || r.leave_type,
        `"Relief: ${r.handover_email || "N/A"}"`,
        r.status,
        r.reviewed_by || "fmbuthia@safaricom.co.ke",
        r.reviewed_at || "",
      ]);
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Safaricom_Payroll_Report_${reportStartDate}_to_${reportEndDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Entitlements CSV Export
  function exportEntitlementsCSV() {
    const headers = [
      "Employee Name",
      "Employee Email",
      "Role",
      "Annual Entitled",
      "Annual Remaining",
      "Annual Taken",
      "Sick Remaining",
      "Sick Taken",
      "Compassionate Remaining",
      "Compassionate Taken",
      "Study Remaining",
      "Study Taken",
      "Total Approved Leave Days",
      "Total Approved Overtime Hours",
    ];

    const rows = processedMembers.map(({ member, bals, totalTaken, totalOtHours }) => {
      const annualBal = bals.find((b) => b.leaveType.code === "annual");
      const sickBal = bals.find((b) => b.leaveType.code === "sick");
      const compBal = bals.find((b) => b.leaveType.code === "compassionate");
      const studyBal = bals.find((b) => b.leaveType.code === "study");

      return [
        `"${member.full_name || ""}"`,
        member.email,
        member.role,
        String(annualBal?.entitled ?? 21),
        String(annualBal?.remaining ?? 21),
        String(annualBal?.approved ?? 0),
        String(sickBal?.remaining ?? 14),
        String(sickBal?.approved ?? 0),
        String(compBal?.remaining ?? 5),
        String(compBal?.approved ?? 0),
        String(studyBal?.remaining ?? 5),
        String(studyBal?.approved ?? 0),
        String(totalTaken),
        String(totalOtHours),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Safaricom_Team_Entitlements_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Calculate capacity percentage
  const activeDutyCount = activeMembers.length - currentActiveLeaves.length;
  const capacityPercent = activeMembers.length > 0 ? Math.round((activeDutyCount / activeMembers.length) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-black text-xs shadow-xs">
              M
            </span>
            <h1 className="text-xl font-bold text-gray-900">Admin Metrics &amp; Analytics Center</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Safaricom Technology Division • Operational capacity, overtime payroll expenditure, and leave liability
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const el = document.getElementById("payroll-report-generator");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-brand-dark active:scale-95"
          >
            <BanknotesIcon className="h-4 w-4" />
            <span>Payroll CSV Generator</span>
          </button>
          <button
            onClick={exportEntitlementsCSV}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
            title="Download full team entitlement balances as CSV"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
            <span>Team Entitlements CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (5 Strategic Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Active Capacity */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Active Capacity
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {capacityPercent}%
            </span>
            <span className="text-xs text-gray-500 font-medium">on duty</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {activeDutyCount} of {activeMembers.length} available today
          </p>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Pending Approvals
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClockIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              {totalPending}
            </span>
            <span className="text-xs text-gray-500 font-medium">requests</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {pendingLeaves.length} leave, {pendingOvertime.length} overtime
          </p>
        </div>

        {/* Card 3: Days Taken this Year */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Leaves Taken ({currentYear})
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {totalLeaveDaysTaken}
            </span>
            <span className="text-xs text-gray-500 font-medium">working days</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Avg {(totalLeaveDaysTaken / (activeMembers.length || 1)).toFixed(1)} days / member
          </p>
        </div>

        {/* Card 4: Overtime Expenditure */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Approved Overtime
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ClockIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {totalOvertimeHours.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500 font-medium">hours</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {paidOvertimeHours.toFixed(1)}h Paid • {toilOvertimeHours.toFixed(1)}h TOIL
          </p>
        </div>

        {/* Card 5: Unspent Team Liability */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Unspent Liability
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <BuildingOfficeIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {teamLiability.totalRemaining}
            </span>
            <span className="text-xs text-gray-500 font-medium">days left</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Across {activeMembers.length} active team members
          </p>
        </div>
      </div>

      {/* Currently On Leave & Ongoing Progress */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Currently On Leave &amp; Coverage Timeline
            </h2>
            <p className="text-xs text-gray-500">
              Active leaves with elapsed duration and assigned relief handover colleagues
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {currentActiveLeaves.length} Active Today
          </span>
        </div>

        {currentActiveLeaves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
            All team members are active and available in office today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">
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
                        Span ({leave.working_days} working days)
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
                      <span>From: {leave.start_date}</span>
                      <span>Until: {leave.end_date}</span>
                    </div>
                  </div>

                  {/* Relief Colleague */}
                  {leave.handover_email && (
                    <div className="mt-3 text-xs text-gray-600 border-t border-gray-100 pt-2">
                      <span className="font-semibold text-gray-700">Relief Colleague:</span>{" "}
                      {handover ? handover.full_name : leave.handover_email}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visual Analytics & Charts Center */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: Interactive Monthly Trends (Span 2 cols) */}
        <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-brand" />
                <h2 className="text-base font-bold text-gray-900">
                  Monthly Trends &amp; Utilization ({currentYear})
                </h2>
              </div>
              <p className="text-xs text-gray-500">
                Tracking seasonal leave peaks and overtime surges across months
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setChartMetric("leaves")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  chartMetric === "leaves"
                    ? "bg-white text-gray-900 shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Leave Days
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("overtime")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  chartMetric === "overtime"
                    ? "bg-white text-gray-900 shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Overtime Hours
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("combined")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  chartMetric === "combined"
                    ? "bg-white text-gray-900 shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Combined
              </button>
            </div>
          </div>

          {/* SVG Animated Bar Chart */}
          <div className="relative mt-6 pt-4">
            {/* Hover Tooltip Box */}
            {hoveredMonth !== null && (
              <div className="absolute top-0 right-4 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg animate-in fade-in">
                <span className="font-bold">{MONTH_NAMES[hoveredMonth]}: </span>
                {chartMetric === "leaves" && (
                  <span>{monthlyData[hoveredMonth].leaveDays} Working Days Taken</span>
                )}
                {chartMetric === "overtime" && (
                  <span>
                    {monthlyData[hoveredMonth].overtimeHours.toFixed(1)} OT Hours (
                    {monthlyData[hoveredMonth].paidHours.toFixed(1)}h Paid,{" "}
                    {monthlyData[hoveredMonth].toilHours.toFixed(1)}h TOIL)
                  </span>
                )}
                {chartMetric === "combined" && (
                  <span>
                    {monthlyData[hoveredMonth].leaveDays}d Leave •{" "}
                    {monthlyData[hoveredMonth].overtimeHours.toFixed(1)}h OT
                  </span>
                )}
              </div>
            )}

            <div className="flex h-52 items-end gap-2 sm:gap-3 border-b border-gray-200 pb-2">
              {monthlyData.map((data, idx) => {
                const leaveHeight = Math.round((data.leaveDays / maxMonthlyLeave) * 100);
                const otHeight = Math.round((data.overtimeHours / maxMonthlyOvertime) * 100);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="group relative flex flex-1 flex-col items-center gap-1.5 cursor-pointer"
                  >
                    {/* Bar top indicator */}
                    <span className="text-[10px] font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition">
                      {chartMetric === "leaves"
                        ? data.leaveDays > 0 ? `${data.leaveDays}d` : ""
                        : chartMetric === "overtime"
                        ? data.overtimeHours > 0 ? `${data.overtimeHours.toFixed(0)}h` : ""
                        : data.leaveDays + data.overtimeHours > 0 ? `${data.leaveDays}d` : ""}
                    </span>

                    {/* Bars Container */}
                    <div className="w-full h-36 flex items-end justify-center gap-1">
                      {chartMetric === "leaves" && (
                        <div
                          className="w-full max-w-[28px] rounded-t-lg bg-brand transition-all duration-500 group-hover:bg-brand-dark"
                          style={{
                            height: `${Math.max(leaveHeight, data.leaveDays > 0 ? 10 : 0)}%`,
                          }}
                        />
                      )}

                      {chartMetric === "overtime" && (
                        <div
                          className="w-full max-w-[28px] rounded-t-lg bg-blue-600 transition-all duration-500 group-hover:bg-blue-700"
                          style={{
                            height: `${Math.max(otHeight, data.overtimeHours > 0 ? 10 : 0)}%`,
                          }}
                        />
                      )}

                      {chartMetric === "combined" && (
                        <>
                          <div
                            className="w-1/2 max-w-[14px] rounded-t-lg bg-brand transition-all duration-500"
                            style={{
                              height: `${Math.max(leaveHeight, data.leaveDays > 0 ? 10 : 0)}%`,
                            }}
                            title={`Leave: ${data.leaveDays}d`}
                          />
                          <div
                            className="w-1/2 max-w-[14px] rounded-t-lg bg-blue-600 transition-all duration-500"
                            style={{
                              height: `${Math.max(otHeight, data.overtimeHours > 0 ? 10 : 0)}%`,
                            }}
                            title={`Overtime: ${data.overtimeHours}h`}
                          />
                        </>
                      )}
                    </div>

                    <span className="text-[10px] font-medium text-gray-600 group-hover:font-bold group-hover:text-gray-900">
                      {MONTH_NAMES[idx]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  <span>Leave Days Taken</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>Overtime Hours</span>
                </div>
              </div>
              <span className="text-[11px] italic">Hover bars to inspect exact metrics</span>
            </div>
          </div>
        </section>

        {/* Chart 2: Leave Types & Overtime Split (1 col) */}
        <section className="space-y-6">
          {/* Leave Type Distribution */}
          <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <h2 className="text-base font-bold text-gray-900">Leave Type Distribution</h2>
            <p className="mb-4 text-xs text-gray-500">
              Total working days consumed by category
            </p>

            <div className="space-y-3">
              {leaveTypes.map((type) => {
                const days = daysByType[type.code] || 0;
                const percent =
                  totalLeaveDaysTaken > 0
                    ? Math.round((days / totalLeaveDaysTaken) * 100)
                    : 0;

                const colorClass =
                  type.code === "annual"
                    ? "bg-emerald-500"
                    : type.code === "sick"
                    ? "bg-amber-500"
                    : type.code === "compassionate"
                    ? "bg-purple-500"
                    : "bg-blue-500";

                return (
                  <div key={type.code}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{type.name}</span>
                      <span className="font-mono text-gray-600">
                        {days}d ({percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${colorClass}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overtime Compensatory Ratio Card */}
          <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <h2 className="text-base font-bold text-gray-900">Compensation Choice Ratio</h2>
            <p className="mb-3 text-xs text-gray-500">Paid payout vs Time Off In Lieu (TOIL)</p>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                <span className="text-blue-700">
                  Paid: {paidOvertimeHours.toFixed(1)}h (
                  {totalOvertimeHours > 0
                    ? Math.round((paidOvertimeHours / totalOvertimeHours) * 100)
                    : 50}
                  %)
                </span>
                <span className="text-purple-700">
                  TOIL: {toilOvertimeHours.toFixed(1)}h (
                  {totalOvertimeHours > 0
                    ? Math.round((toilOvertimeHours / totalOvertimeHours) * 100)
                    : 50}
                  %)
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${
                      totalOvertimeHours > 0
                        ? (paidOvertimeHours / totalOvertimeHours) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-purple-500 transition-all duration-300"
                  style={{
                    width: `${
                      totalOvertimeHours > 0
                        ? (toilOvertimeHours / totalOvertimeHours) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                TOIL equivalent: ~{(toilOvertimeHours / 8).toFixed(1)} compensatory rest days banked
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Automated Payroll Report Generator (Date-Range & Filterable CSV) */}
      <section
        id="payroll-report-generator"
        className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5 border-2 border-brand/20"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
                P
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                Automated Payroll &amp; HR Report Generator
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Generate structured, audit-ready CSV exports for HR payroll processing within custom cut-off dates
            </p>
          </div>

          {/* Quick cycle presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">Cycles:</span>
            <button
              type="button"
              onClick={() => {
                setReportStartDate(firstDayOfMonth);
                setReportEndDate(todayStr);
              }}
              className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                const prevMonth = new Date().getMonth();
                const m = prevMonth === 0 ? 12 : prevMonth;
                const y = prevMonth === 0 ? currentYear - 1 : currentYear;
                const mStr = String(m).padStart(2, "0");
                const lastDay = new Date(y, m, 0).getDate();
                setReportStartDate(`${y}-${mStr}-01`);
                setReportEndDate(`${y}-${mStr}-${lastDay}`);
              }}
              className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => {
                // Safaricom standard 21st to 20th cut-off cycle
                const curMonth = new Date().getMonth() + 1;
                const prevM = curMonth === 1 ? 12 : curMonth - 1;
                const y = curMonth === 1 ? currentYear - 1 : currentYear;
                setReportStartDate(`${y}-${String(prevM).padStart(2, "0")}-21`);
                setReportEndDate(`${currentYear}-${String(curMonth).padStart(2, "0")}-20`);
              }}
              className="rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand/20 transition"
            >
              Cycle (21st - 20th)
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200 mb-5">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Start Date (Cut-off From)
            </label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              End Date (Cut-off To)
            </label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
            />
          </div>

          {/* Member Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Filter by Colleague
            </label>
            <select
              value={reportMemberFilter}
              onChange={(e) => setReportMemberFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
            >
              <option value="all">All Team Members ({activeMembers.length})</option>
              {activeMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          </div>

          {/* Report Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Record Category
            </label>
            <select
              value={reportTypeFilter}
              onChange={(e) => setReportTypeFilter(e.target.value as any)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
            >
              <option value="all">Unified (Overtime &amp; Leaves)</option>
              <option value="overtime_paid">Paid Overtime Claims Only</option>
              <option value="overtime_toil">TOIL Claims Only</option>
              <option value="leaves">Approved Leaves Only</option>
            </select>
          </div>
        </div>

        {/* Live Filter Summary & Download Action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-emerald-50/60 p-4 border border-emerald-200">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-gray-500">Cycle Range:</span>{" "}
              <strong className="text-gray-900 font-mono">
                {reportStartDate} &rarr; {reportEndDate}
              </strong>
            </div>
            <div>
              <span className="text-gray-500">Overtime Claims:</span>{" "}
              <strong className="text-blue-900 font-bold">
                {matchedPayrollRecords.overtime.length} ({matchedPayrollRecords.totalOtHours.toFixed(1)}h total)
              </strong>
            </div>
            <div>
              <span className="text-gray-500">Paid OT:</span>{" "}
              <strong className="text-emerald-900 font-bold">
                {matchedPayrollRecords.totalPaidOtHours.toFixed(1)}h
              </strong>
            </div>
            <div>
              <span className="text-gray-500">Leave Days:</span>{" "}
              <strong className="text-purple-900 font-bold">
                {matchedPayrollRecords.totalLeaveDays} working days
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={generateFilteredPayrollCSV}
            disabled={matchedPayrollRecords.overtime.length === 0 && matchedPayrollRecords.leaves.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>
              Download Payroll CSV ({matchedPayrollRecords.overtime.length + matchedPayrollRecords.leaves.length} records)
            </span>
          </button>
        </div>
      </section>

      {/* Team Entitlements & Balances Table with Search and Progress Bars */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Team Leave Entitlements &amp; Exhaustion Tracker ({currentYear})
            </h2>
            <p className="text-xs text-gray-500">
              Allowance balances and exhaustion rate for all {activeMembers.length} active team members
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sorting */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Sort:</span>
              <select
                value={memberSort}
                onChange={(e) => setMemberSort(e.target.value as any)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-2xs focus:border-brand focus:outline-none"
              >
                <option value="least_remaining">Least Annual Leave Left</option>
                <option value="most_taken">Most Days Taken</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member..."
                className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
              >
              </input>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-3 pr-4">Team Member</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3 min-w-[180px]">Annual Leave (21d)</th>
                <th className="px-3 py-3 text-right">Sick (14d)</th>
                <th className="px-3 py-3 text-right">Compassionate (5d)</th>
                <th className="px-3 py-3 text-right">Study (5d)</th>
                <th className="px-3 py-3 text-right">Leave Taken</th>
                <th className="px-3 py-3 text-right">OT Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedMembers.map(({ member, bals, annualRemaining, annualEntitled, annualPercent, totalTaken, totalOtHours }) => {
                const sickBal = bals.find((b) => b.leaveType.code === "sick");
                const compassionateBal = bals.find((b) => b.leaveType.code === "compassionate");
                const studyBal = bals.find((b) => b.leaveType.code === "study");

                return (
                  <tr key={member.email} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-gray-900">
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
                        <span
                          className={`font-semibold ${
                            annualRemaining <= 5
                              ? "text-red-600 font-bold"
                              : annualRemaining <= 10
                              ? "text-amber-600"
                              : "text-gray-500"
                          }`}
                        >
                          {annualPercent}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
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
                      {totalTaken}d
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-blue-700">
                      {totalOtHours > 0 ? `${totalOtHours.toFixed(1)}h` : "-"}
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
              Designated Approver: <strong className="text-gray-700">fmbuthia@safaricom.co.ke</strong> • 1-Click Decisions, Quick-Canned Feedback Presets &amp; Multi-Select Batch Approvals
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

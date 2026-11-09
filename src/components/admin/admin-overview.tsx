"use client";

import { useState, useMemo, useTransition } from "react";
import type { LeaveRequest, LeaveType } from "@/lib/leave/types";
import type { OvertimeRecord } from "@/lib/overtime/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import { computeUserBalances } from "@/lib/leave/types";
import { reviewLeaveRequest, batchReviewLeaveRequests, updateCarryForward } from "@/app/actions/leave";
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
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
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

  // Manager Governance Tabs: Pending Action Queue, Decision Audit Trail, Carry-Forward Governance
  const [governanceTab, setGovernanceTab] = useState<"pending" | "audit" | "carry_forward">("pending");

  // Decision Audit Trail State
  const [auditSearch, setAuditSearch] = useState("");
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<"all" | "leaves" | "overtime">("all");
  const [auditDecisionFilter, setAuditDecisionFilter] = useState<"all" | "approved" | "rejected">("all");

  // Carry-Forward Governance State
  const [isSavingCarry, startSavingCarry] = useTransition();
  const [adjustingMember, setAdjustingMember] = useState<{
    email: string;
    fullName: string;
    currentCarried: number;
    baseEntitled: number;
    totalEntitled: number;
  } | null>(null);
  const [adjustCarriedDays, setAdjustCarriedDays] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [carryForwardStatus, setCarryForwardStatus] = useState<{ message?: string; error?: string } | null>(null);

  // Step 3: Forward Coverage & Minimum Staffing Risk Radar State
  const [radarWindowDays, setRadarWindowDays] = useState<30 | 60>(30);
  const [minOnDutyStaff, setMinOnDutyStaff] = useState<number>(2);
  const [minCapacityThreshold, setMinCapacityThreshold] = useState<number>(70);
  const [selectedRadarDate, setSelectedRadarDate] = useState<string | null>(null);
  const [radarFilter, setRadarFilter] = useState<"all" | "risk_only">("all");

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

  // Reviewed items for Historical Decision Audit Trail
  const reviewedLeaves = useMemo(
    () => leaveRequests.filter((r) => r.status === "approved" || r.status === "rejected"),
    [leaveRequests]
  );
  const reviewedOvertime = useMemo(
    () => overtimeRecords.filter((r) => r.status === "approved" || r.status === "rejected"),
    [overtimeRecords]
  );
  const totalReviewed = reviewedLeaves.length + reviewedOvertime.length;

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
      const annualCarried = annualBal?.carriedForward ?? 0;
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
        annualCarried,
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
        r.reviewed_by || "Authorized Approver",
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
        r.reviewed_by || "Authorized Approver",
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

  // Unified Audit Trail calculation
  const unifiedAuditRecords = useMemo(() => {
    const records: Array<{
      id: string;
      category: "leave" | "overtime";
      userEmail: string;
      fullName: string;
      title: string;
      detail: string;
      quantity: string;
      status: "approved" | "rejected";
      reviewedBy: string | null;
      reviewedAt: string | null;
      reviewerNote: string | null;
      rawDate: string;
    }> = [];

    reviewedLeaves.forEach((r) => {
      const member = memberMap.get(r.user_email.toLowerCase());
      const type = leaveTypeMap.get(r.leave_type);
      records.push({
        id: r.id,
        category: "leave",
        userEmail: r.user_email,
        fullName: member?.full_name || r.user_email,
        title: type?.name || r.leave_type,
        detail: `${r.start_date} to ${r.end_date}`,
        quantity: `${r.working_days} working days`,
        status: r.status as "approved" | "rejected",
        reviewedBy: r.reviewed_by || "Designated Approver",
        reviewedAt: r.reviewed_at,
        reviewerNote: r.reviewer_note,
        rawDate: r.reviewed_at || r.created_at,
      });
    });

    reviewedOvertime.forEach((r) => {
      const member = memberMap.get(r.user_email.toLowerCase());
      const choiceLabel = r.compensatory_choice === "paid" ? "Paid Overtime" : "TOIL Credit";
      records.push({
        id: r.id,
        category: "overtime",
        userEmail: r.user_email,
        fullName: member?.full_name || r.user_email,
        title: `Overtime (${choiceLabel})`,
        detail: `Date: ${r.overtime_date}${r.ticket_ref ? ` • Ref: ${r.ticket_ref}` : ""}`,
        quantity: `${Number(r.hours).toFixed(1)} hours`,
        status: r.status as "approved" | "rejected",
        reviewedBy: r.reviewed_by || "Designated Approver",
        reviewedAt: r.reviewed_at,
        reviewerNote: r.reviewer_note,
        rawDate: r.reviewed_at || r.created_at,
      });
    });

    records.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    return records.filter((rec) => {
      if (auditCategoryFilter === "leaves" && rec.category !== "leave") return false;
      if (auditCategoryFilter === "overtime" && rec.category !== "overtime") return false;
      if (auditDecisionFilter !== "all" && rec.status !== auditDecisionFilter) return false;
      if (auditSearch.trim()) {
        const query = auditSearch.toLowerCase();
        const matchName = rec.fullName.toLowerCase().includes(query);
        const matchEmail = rec.userEmail.toLowerCase().includes(query);
        const matchNote = rec.reviewerNote?.toLowerCase().includes(query);
        const matchTitle = rec.title.toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchNote && !matchTitle) return false;
      }
      return true;
    });
  }, [reviewedLeaves, reviewedOvertime, memberMap, leaveTypeMap, auditCategoryFilter, auditDecisionFilter, auditSearch]);

  const handleExportAuditCSV = () => {
    const headers = [
      "Decision Timestamp",
      "Record Category",
      "Requester Name",
      "Safaricom Email",
      "Item Details",
      "Duration / Quantity",
      "Manager Decision",
      "Reviewed By",
      "Manager Remarks / Notes",
    ];
    const rows = unifiedAuditRecords.map((r) => [
      r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "N/A",
      r.category.toUpperCase(),
      `"${r.fullName.replace(/"/g, '""')}"`,
      r.userEmail,
      `"${r.detail.replace(/"/g, '""')}"`,
      r.quantity,
      r.status.toUpperCase(),
      `"${(r.reviewedBy || "Approver").replace(/"/g, '""')}"`,
      `"${(r.reviewerNote || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `safaricom_decision_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Carry-Forward Governance Summary
  const carryForwardSummary = useMemo(() => {
    const membersData = activeMembers.map((member) => {
      const bals = computeUserBalances(leaveTypes, leaveRequests, member.email, currentYear);
      const annualBal = bals.find((b) => b.leaveType.code === "annual");
      const baseEntitled = annualBal?.baseEntitled ?? 21;
      const carriedForward = annualBal?.carriedForward ?? 0;
      const totalEntitled = annualBal?.entitled ?? (baseEntitled + carriedForward);
      const approved = annualBal?.approved ?? 0;
      const remaining = annualBal?.remaining ?? (totalEntitled - approved);
      return {
        member,
        baseEntitled,
        carriedForward,
        totalEntitled,
        approved,
        remaining,
      };
    });

    const totalCarriedAcrossTeam = membersData.reduce((sum, m) => sum + m.carriedForward, 0);
    const membersWithRollover = membersData.filter((m) => m.carriedForward > 0).length;

    return {
      membersData,
      totalCarriedAcrossTeam,
      membersWithRollover,
    };
  }, [activeMembers, leaveTypes, leaveRequests, currentYear]);

  const handleSaveCarryForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMember) return;
    startSavingCarry(async () => {
      const formData = new FormData();
      formData.append("user_email", adjustingMember.email);
      formData.append("leave_type", "annual");
      formData.append("year", String(currentYear));
      formData.append("carried_days", String(adjustCarriedDays));
      formData.append("reason", adjustReason);
      const res = await updateCarryForward(formData);
      if (res?.error) {
        setCarryForwardStatus({ error: res.error });
      } else {
        setCarryForwardStatus({ message: res?.success || "Carry forward updated successfully." });
        setTimeout(() => {
          setAdjustingMember(null);
          setCarryForwardStatus(null);
        }, 1200);
      }
    });
  };

  // Step 3: Forward Coverage & Minimum Staffing Risk Radar Calculation (Next 30-60 Days)
  const forwardRadarData = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayOfWeek: string;
      displayDate: string;
      isWeekend: boolean;
      approvedLeaves: Array<{ requester: string; email: string; type: string; handover: string | null }>;
      pendingLeaves: Array<{ requester: string; email: string; type: string; handover: string | null }>;
      availableStaff: number;
      potentialStaff: number;
      capacityPercent: number;
      potentialCapacityPercent: number;
      isCritical: boolean;
      isPendingRisk: boolean;
      handoverClashes: Array<{ handoverEmail: string; handoverName: string; count: number; coveringFor: string[] }>;
    }> = [];

    const baseDate = new Date();

    for (let i = 0; i < radarWindowDays; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayNum = d.getDay();
      const isWeekend = dayNum === 0 || dayNum === 6;
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
      const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dayApproved = leaveRequests.filter(
        (r) => r.status === "approved" && r.start_date <= dateStr && r.end_date >= dateStr
      );
      const dayPending = leaveRequests.filter(
        (r) => r.status === "pending" && r.start_date <= dateStr && r.end_date >= dateStr
      );

      const approvedLeaves = dayApproved.map((r) => {
        const m = memberMap.get(r.user_email.toLowerCase());
        const t = leaveTypeMap.get(r.leave_type);
        return {
          requester: m?.full_name || r.user_email,
          email: r.user_email,
          type: t?.name || r.leave_type,
          handover: r.handover_email,
        };
      });

      const pendingLeaves = dayPending.map((r) => {
        const m = memberMap.get(r.user_email.toLowerCase());
        const t = leaveTypeMap.get(r.leave_type);
        return {
          requester: m?.full_name || r.user_email,
          email: r.user_email,
          type: t?.name || r.leave_type,
          handover: r.handover_email,
        };
      });

      const availableStaff = Math.max(0, activeMembers.length - approvedLeaves.length);
      const potentialStaff = Math.max(0, availableStaff - pendingLeaves.length);
      const capacityPercent = activeMembers.length > 0 ? Math.round((availableStaff / activeMembers.length) * 100) : 100;
      const potentialCapacityPercent = activeMembers.length > 0 ? Math.round((potentialStaff / activeMembers.length) * 100) : 100;

      // Check double-handover clashes on this day
      const handoverCounts = new Map<string, string[]>();
      [...dayApproved, ...dayPending].forEach((r) => {
        if (r.handover_email) {
          const lowerH = r.handover_email.toLowerCase();
          const list = handoverCounts.get(lowerH) || [];
          const reqMember = memberMap.get(r.user_email.toLowerCase());
          list.push(reqMember?.full_name || r.user_email);
          handoverCounts.set(lowerH, list);
        }
      });

      const handoverClashes: Array<{ handoverEmail: string; handoverName: string; count: number; coveringFor: string[] }> = [];
      handoverCounts.forEach((coveringFor, handoverEmail) => {
        if (coveringFor.length >= 2) {
          const m = memberMap.get(handoverEmail);
          handoverClashes.push({
            handoverEmail,
            handoverName: m?.full_name || handoverEmail,
            count: coveringFor.length,
            coveringFor,
          });
        }
      });

      const isCritical = !isWeekend && (availableStaff < minOnDutyStaff || capacityPercent < minCapacityThreshold);
      const isPendingRisk = !isWeekend && !isCritical && (potentialStaff < minOnDutyStaff || potentialCapacityPercent < minCapacityThreshold);

      days.push({
        dateStr,
        dayOfWeek,
        displayDate,
        isWeekend,
        approvedLeaves,
        pendingLeaves,
        availableStaff,
        potentialStaff,
        capacityPercent,
        potentialCapacityPercent,
        isCritical,
        isPendingRisk,
        handoverClashes,
      });
    }

    const criticalDaysCount = days.filter((d) => d.isCritical).length;
    const pendingRiskDaysCount = days.filter((d) => d.isPendingRisk).length;
    const clashDaysCount = days.filter((d) => d.handoverClashes.length > 0).length;

    return {
      days,
      criticalDaysCount,
      pendingRiskDaysCount,
      clashDaysCount,
    };
  }, [leaveRequests, activeMembers, memberMap, leaveTypeMap, radarWindowDays, minOnDutyStaff, minCapacityThreshold]);

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

      {/* Step 3: Forward Coverage & Minimum Staffing Risk Radar */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5" id="forward-coverage-risk-radar">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shadow-xs">
                <ShieldCheckIcon className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Forward Coverage &amp; Minimum Staffing Risk Radar
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Next {radarWindowDays} days forward projection • Proactively flags minimum staffing breaches, understaffing risks, and relief clashes
            </p>
          </div>

          {/* Radar Controls: Horizon, SLA Minimums, Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Window Toggle */}
            <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setRadarWindowDays(30)}
                className={`rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                  radarWindowDays === 30
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setRadarWindowDays(60)}
                className={`rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                  radarWindowDays === 60
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                60 Days
              </button>
            </div>

            {/* Minimum On-Duty Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F2F2F7] px-2.5 py-1 text-xs">
              <span className="font-semibold text-gray-500">Min On-Duty:</span>
              <select
                value={minOnDutyStaff}
                onChange={(e) => setMinOnDutyStaff(Number(e.target.value))}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value={1}>1 Engineer</option>
                <option value={2}>2 Engineers (SLA)</option>
                <option value={3}>3 Engineers</option>
                <option value={4}>4 Engineers</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setRadarFilter((f) => (f === "all" ? "risk_only" : "all"))}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                radarFilter === "risk_only"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FunnelIcon className="h-3.5 w-3.5" />
              <span>{radarFilter === "risk_only" ? "Showing Risks Only" : "Show All Days"}</span>
            </button>
          </div>
        </div>

        {/* SLA Status Summary Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
          <div
            className={`rounded-xl border p-3.5 transition ${
              forwardRadarData.criticalDaysCount > 0
                ? "border-red-200 bg-red-50/70 text-red-900"
                : "border-gray-200 bg-gray-50/60 text-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Critical SLA Breaches
              </span>
              <ExclamationTriangleIcon
                className={`h-4 w-4 ${
                  forwardRadarData.criticalDaysCount > 0 ? "text-red-600" : "text-gray-400"
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono">
                {forwardRadarData.criticalDaysCount}
              </span>
              <span className="text-xs font-medium">days under minimum staffing</span>
            </div>
            <p className="mt-1 text-[11px] opacity-80">
              Approved leaves cause staffing to fall below {minOnDutyStaff} engineers
            </p>
          </div>

          <div
            className={`rounded-xl border p-3.5 transition ${
              forwardRadarData.pendingRiskDaysCount > 0
                ? "border-amber-200 bg-amber-50/70 text-amber-900"
                : "border-gray-200 bg-gray-50/60 text-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Pending Approval Warnings
              </span>
              <ClockIcon
                className={`h-4 w-4 ${
                  forwardRadarData.pendingRiskDaysCount > 0 ? "text-amber-600" : "text-gray-400"
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono">
                {forwardRadarData.pendingRiskDaysCount}
              </span>
              <span className="text-xs font-medium">days at potential risk</span>
            </div>
            <p className="mt-1 text-[11px] opacity-80">
              If pending leave requests are approved, staffing SLA will be breached
            </p>
          </div>

          <div
            className={`rounded-xl border p-3.5 transition ${
              forwardRadarData.clashDaysCount > 0
                ? "border-purple-200 bg-purple-50/70 text-purple-900"
                : "border-gray-200 bg-gray-50/60 text-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Double Handover Conflicts
              </span>
              <UsersIcon
                className={`h-4 w-4 ${
                  forwardRadarData.clashDaysCount > 0 ? "text-purple-600" : "text-gray-400"
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono">
                {forwardRadarData.clashDaysCount}
              </span>
              <span className="text-xs font-medium">relief clash dates</span>
            </div>
            <p className="mt-1 text-[11px] opacity-80">
              One colleague assigned as relief for 2+ members simultaneously
            </p>
          </div>
        </div>

        {/* Forward Radar Horizon Strip / Matrix */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <span>Forward Timeline Radar ({radarWindowDays} Days Horizon)</span>
            <span className="text-[11px]">Click any date to inspect full daily on-duty roster</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">
            {forwardRadarData.days
              .filter((day) => {
                if (radarFilter === "risk_only") {
                  return day.isCritical || day.isPendingRisk || day.handoverClashes.length > 0;
                }
                return true;
              })
              .map((day) => {
                const isSelected = selectedRadarDate === day.dateStr;
                let borderClass = "border-gray-200 bg-white hover:border-gray-300";
                let badgeClass = "bg-gray-100 text-gray-600";
                let statusLabel = "Healthy";

                if (day.isCritical) {
                  borderClass = "border-red-400 bg-red-50/50 hover:border-red-500 ring-1 ring-red-400/30";
                  badgeClass = "bg-red-100 text-red-800 font-bold";
                  statusLabel = "Breach";
                } else if (day.isPendingRisk) {
                  borderClass = "border-amber-300 bg-amber-50/40 hover:border-amber-400 ring-1 ring-amber-300/30";
                  badgeClass = "bg-amber-100 text-amber-800 font-bold";
                  statusLabel = "Risk";
                } else if (day.handoverClashes.length > 0) {
                  borderClass = "border-purple-300 bg-purple-50/40 hover:border-purple-400 ring-1 ring-purple-300/30";
                  badgeClass = "bg-purple-100 text-purple-800 font-bold";
                  statusLabel = "Clash";
                } else if (day.isWeekend) {
                  borderClass = "border-gray-100 bg-gray-50/60";
                  badgeClass = "bg-gray-100 text-gray-400";
                  statusLabel = "Weekend";
                }

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedRadarDate(isSelected ? null : day.dateStr)}
                    className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-95 ${borderClass} ${
                      isSelected ? "ring-2 ring-brand" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-semibold uppercase">{day.dayOfWeek}</span>
                        <span className={`rounded-sm px-1 py-0.2 text-[9px] ${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900 mt-0.5">
                        {day.displayDate}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-baseline justify-between text-[11px] font-mono">
                        <span className="font-extrabold text-gray-900">
                          {day.availableStaff}/{activeMembers.length}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {day.capacityPercent}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            day.isCritical
                              ? "bg-red-500"
                              : day.isPendingRisk
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${day.capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Selected Day Inspector Modal / Drawer */}
        {selectedRadarDate && (() => {
          const inspectedDay = forwardRadarData.days.find((d) => d.dateStr === selectedRadarDate);
          if (!inspectedDay) return null;

          const onDutyMembers = activeMembers.filter(
            (m) =>
              !inspectedDay.approvedLeaves.some((l) => l.email.toLowerCase() === m.email.toLowerCase()) &&
              !inspectedDay.pendingLeaves.some((l) => l.email.toLowerCase() === m.email.toLowerCase())
          );

          return (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-brand" />
                  <span className="font-bold text-gray-900 text-sm">
                    Staffing Roster Breakdown for {inspectedDay.dayOfWeek}, {inspectedDay.dateStr}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      inspectedDay.isCritical
                        ? "bg-red-100 text-red-800"
                        : inspectedDay.isPendingRisk
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {inspectedDay.availableStaff} of {activeMembers.length} Available On Duty ({inspectedDay.capacityPercent}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRadarDate(null)}
                  className="rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Close Inspector
                </button>
              </div>

              {/* Handover Overload Alerts */}
              {inspectedDay.handoverClashes.length > 0 && (
                <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-2.5 text-xs text-purple-900">
                  <span className="font-bold block">Relief Overload Conflict Detected:</span>
                  {inspectedDay.handoverClashes.map((c) => (
                    <div key={c.handoverEmail} className="mt-0.5 text-[11px]">
                      • <strong>{c.handoverName}</strong> is assigned as relief for {c.count} team members ({c.coveringFor.join(", ")}) on this date.
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                {/* On Duty */}
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-1.5">
                    Active On Duty ({onDutyMembers.length})
                  </span>
                  <div className="space-y-1">
                    {onDutyMembers.length === 0 ? (
                      <span className="text-gray-400 italic">No engineers on active duty</span>
                    ) : (
                      onDutyMembers.map((m) => (
                        <div key={m.email} className="font-medium text-gray-800">
                          {m.full_name || m.email}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Approved Leaves */}
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <span className="font-bold text-gray-700 uppercase text-[10px] block mb-1.5">
                    On Approved Leave ({inspectedDay.approvedLeaves.length})
                  </span>
                  <div className="space-y-1.5">
                    {inspectedDay.approvedLeaves.length === 0 ? (
                      <span className="text-gray-400 italic">No approved leaves</span>
                    ) : (
                      inspectedDay.approvedLeaves.map((l) => (
                        <div key={l.email}>
                          <span className="font-semibold text-gray-900">{l.requester}</span>
                          <span className="text-[10px] text-gray-500 block">
                            {l.type} {l.handover ? `• Relief: ${memberMap.get(l.handover.toLowerCase())?.full_name || l.handover}` : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pending Requests */}
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <span className="font-bold text-amber-800 uppercase text-[10px] block mb-1.5">
                    Pending Leave Requests ({inspectedDay.pendingLeaves.length})
                  </span>
                  <div className="space-y-1.5">
                    {inspectedDay.pendingLeaves.length === 0 ? (
                      <span className="text-gray-400 italic">No pending requests</span>
                    ) : (
                      inspectedDay.pendingLeaves.map((l) => (
                        <div key={l.email}>
                          <span className="font-semibold text-amber-900">{l.requester}</span>
                          <span className="text-[10px] text-amber-700 block">
                            {l.type} {l.handover ? `• Relief: ${memberMap.get(l.handover.toLowerCase())?.full_name || l.handover}` : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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
              {processedMembers.map(({ member, bals, annualRemaining, annualEntitled, annualCarried, annualPercent, totalTaken, totalOtHours }) => {
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
                          {annualCarried > 0 && (
                            <span className="ml-1 text-[10px] text-emerald-700 font-medium">
                              (+{annualCarried}d)
                            </span>
                          )}
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

      {/* Manager Governance & Decision Suite */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5" id="manager-governance-center">
        {/* Top-level Suite Navigation Tabs */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-black shadow-xs">
                M
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                Manager Governance &amp; Decision Suite
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Approvals Queue, Decision Audit Trail &amp; Carry-Forward Leave Balance Administration
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setGovernanceTab("pending")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                governanceTab === "pending"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ClockIcon className="h-3.5 w-3.5" />
              <span>Pending Queue ({totalPending})</span>
            </button>

            <button
              type="button"
              onClick={() => setGovernanceTab("audit")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                governanceTab === "audit"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              <span>Decision Audit Trail ({totalReviewed})</span>
            </button>

            <button
              type="button"
              onClick={() => setGovernanceTab("carry_forward")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                governanceTab === "carry_forward"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              <span>Carry-Forward Desk ({activeMembers.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PENDING ACTION QUEUE */}
        {governanceTab === "pending" && (
          <div>
            {/* Filter Sub-Tabs for Pending Queue */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Filter Review Queue:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setApprovalTab("all")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition active:scale-95 ${
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
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition active:scale-95 ${
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
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition active:scale-95 ${
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
                                    {bal.carriedForward > 0 && ` (+${bal.carriedForward}d carried)`}
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
      </div>
    )}

    {/* TAB 2: HISTORICAL DECISION AUDIT TRAIL */}
    {governanceTab === "audit" && (
      <div className="space-y-4">
        {/* Audit Filter & Export Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search input with iPhone theme */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search requester, remarks, notes…"
                className="w-56 rounded-xl border border-black/10 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition focus:border-brand focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={auditCategoryFilter}
              onChange={(e) => setAuditCategoryFilter(e.target.value as any)}
              className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition focus:border-brand focus:outline-none"
            >
              <option value="all">All Categories ({totalReviewed})</option>
              <option value="leaves">Leaves ({reviewedLeaves.length})</option>
              <option value="overtime">Overtime ({reviewedOvertime.length})</option>
            </select>

            {/* Decision Filter */}
            <select
              value={auditDecisionFilter}
              onChange={(e) => setAuditDecisionFilter(e.target.value as any)}
              className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition focus:border-brand focus:outline-none"
            >
              <option value="all">All Decisions</option>
              <option value="approved">Approved Only</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportAuditCSV}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 active:scale-95"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5 text-gray-500" />
            <span>Export Audit CSV</span>
          </button>
        </div>

        {/* Audit Table */}
        {unifiedAuditRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
            No decision records found matching your audit search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Category &amp; Scope</th>
                  <th className="px-4 py-3">Duration / Units</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Reviewer &amp; Date</th>
                  <th className="px-4 py-3">Decision Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {unifiedAuditRecords.map((rec) => (
                  <tr key={`${rec.category}-${rec.id}`} className="hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{rec.fullName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{rec.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{rec.title}</span>
                      <div className="text-[11px] text-gray-500">{rec.detail}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                      {rec.quantity}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          rec.status === "approved"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {rec.status === "approved" ? (
                          <CheckCircleIcon className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircleIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span>{rec.status.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      <div className="font-semibold text-gray-800">{rec.reviewedBy || "Approver"}</div>
                      <div className="text-gray-400">
                        {rec.reviewedAt
                          ? new Date(rec.reviewedAt).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600 max-w-xs">
                      {rec.reviewerNote ? (
                        <span className="italic">"{rec.reviewerNote}"</span>
                      ) : (
                        <span className="text-gray-300">No remarks logged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    {/* TAB 3: CARRY-FORWARD GOVERNANCE & ROLLOVER DESK */}
    {governanceTab === "carry_forward" && (
      <div className="space-y-4">
        {/* Informational Guidance Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
          <InformationCircleIcon className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Annual Carry-Forward Governance &amp; Balance Administration</p>
            <p className="mt-0.5 text-blue-800/90 leading-relaxed">
              Unutilized leave days from prior calendar years automatically carry forward into employee annual entitlements.
              The Manager can inspect calculated unutilized days or record manual overrides per Safaricom HR authorizations.
            </p>
          </div>
        </div>

        {/* Metric Highlights */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
            <span className="text-[11px] uppercase font-bold text-gray-500 block">Total Carried Over</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              +{carryForwardSummary.totalCarriedAcrossTeam} days
            </span>
            <span className="text-[11px] text-gray-500">Across active team members</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
            <span className="text-[11px] uppercase font-bold text-gray-500 block">Members with Rollover</span>
            <span className="text-xl font-black text-brand-dark font-mono mt-1 block">
              {carryForwardSummary.membersWithRollover} / {activeMembers.length}
            </span>
            <span className="text-[11px] text-gray-500">Holding carried-forward days</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
            <span className="text-[11px] uppercase font-bold text-gray-500 block">Base Annual Allowance</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              21 days / yr
            </span>
            <span className="text-[11px] text-gray-500">Standard contractual entitlement</span>
          </div>
        </div>

        {/* Carry Forward Members Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Team Member</th>
                <th className="px-4 py-3 text-center">Base Days</th>
                <th className="px-4 py-3 text-center">Carried Forward</th>
                <th className="px-4 py-3 text-center">Total Entitled</th>
                <th className="px-4 py-3 text-center">Taken YTD</th>
                <th className="px-4 py-3 text-center">Remaining Balance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {carryForwardSummary.membersData.map(({ member, baseEntitled, carriedForward, totalEntitled, approved, remaining }) => (
                <tr key={member.email} className="hover:bg-gray-50/60 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">{member.full_name || member.email}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{member.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-gray-700">
                    {baseEntitled}d
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {carriedForward > 0 ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        +{carriedForward}d
                      </span>
                    ) : (
                      <span className="text-gray-400">0d</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-gray-900">
                    {totalEntitled}d
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-gray-600">
                    {approved}d
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">
                    {remaining}d
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustingMember({
                          email: member.email,
                          fullName: member.full_name || member.email,
                          currentCarried: carriedForward,
                          baseEntitled,
                          totalEntitled,
                        });
                        setAdjustCarriedDays(carriedForward);
                        setAdjustReason("");
                        setCarryForwardStatus(null);
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition active:scale-95"
                    >
                      Adjust Balance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal for Carry-Forward Balance Adjustment */}
        {adjustingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/10">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900">
                  Adjust Carried-Forward Leave Days
                </h3>
                <button
                  type="button"
                  onClick={() => setAdjustingMember(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCarryForward} className="mt-4 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 block">Colleague</span>
                  <span className="text-sm font-bold text-gray-900 block">{adjustingMember.fullName}</span>
                  <span className="text-xs text-gray-400 font-mono block">{adjustingMember.email}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-gray-500 block">Base Allowance:</span>
                    <span className="font-bold text-gray-800">{adjustingMember.baseEntitled} days</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Current Carried:</span>
                    <span className="font-bold text-emerald-700">+{adjustingMember.currentCarried} days</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="carried_days" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    New Carried-Forward Days
                  </label>
                  <input
                    id="carried_days"
                    name="carried_days"
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    required
                    value={adjustCarriedDays}
                    onChange={(e) => setAdjustCarriedDays(parseFloat(e.target.value) || 0)}
                    className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition focus:border-brand focus:bg-white focus:outline-none"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Total entitlement will be: <strong>{adjustingMember.baseEntitled + adjustCarriedDays} days</strong>
                  </span>
                </div>

                <div>
                  <label htmlFor="adjust_reason" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Authorization Reason / Justification
                  </label>
                  <input
                    id="adjust_reason"
                    name="adjust_reason"
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Approved prior-year unutilized rollover per policy"
                    className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>

                {carryForwardStatus?.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                    {carryForwardStatus.error}
                  </div>
                )}
                {carryForwardStatus?.message && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                    {carryForwardStatus.message}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setAdjustingMember(null)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCarry}
                    className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-dark transition disabled:opacity-60"
                  >
                    {isSavingCarry ? "Saving..." : "Save Carry-Forward"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )}
      </section>
    </div>
  );
}

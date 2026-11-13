"use client";

import { useActionState, useState, useEffect } from "react";
import { submitOvertimeRequest, type OvertimeActionState } from "@/app/actions/overtime";
import { CheckCircleIcon, InformationCircleIcon } from "@/components/ui/icons";
import {
  BASE_HOURLY_RATE,
  DEFAULT_DAILY_RATE,
  STANDARD_DAY_HOURS,
  ENTERPRISE_TIER_LABEL,
  PAYE_WITHHOLDING_RATE,
  detectDateRateCategory,
  formatKes,
  parseOvertimeRecordMeta,
  type OvertimeMultiplier,
  type OvertimeRateBasis,
  type OvertimeRecord,
  type OvertimeTimeMode,
} from "@/lib/overtime/types";

const initialState: OvertimeActionState = {};

type Props = {
  currentUserEmail?: string;
  currentUserName?: string;
  prefillClaim?: OvertimeRecord | null;
  onClearPrefill?: () => void;
  onOpenVoucher?: (record: OvertimeRecord) => void;
};

const MULTIPLIER_OPTIONS: { value: OvertimeMultiplier; label: string; tag: string }[] = [
  { value: 1.0, label: "1.0x", tag: "Flat Rate" },
  { value: 1.5, label: "1.5x", tag: "Standard" },
  { value: 2.0, label: "2.0x", tag: "Weekend" },
  { value: 2.5, label: "2.5x", tag: "Holiday" },
];

const QUICK_HOURS_CHIPS = [2, 4, 4.5, 6, 8, 12];

const TIME_WINDOW_PRESETS: {
  label: string;
  start: string;
  end: string;
  breakMins: number;
}[] = [
  { label: "Evening (17:00–21:00)", start: "17:00", end: "21:00", breakMins: 0 },
  { label: "Late Shift (17:00–21:30)", start: "17:00", end: "21:30", breakMins: 0 },
  { label: "Night Window (22:00–04:00)", start: "22:00", end: "04:00", breakMins: 30 },
  { label: "Day Shift (08:00–17:00)", start: "08:00", end: "17:00", breakMins: 60 },
];

function computeHoursFromTimeWindow(
  startTime: string,
  endTime: string,
  breakMinutes: number
): { netHours: number; isOvernight: boolean } {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
    return { netHours: 0, isOvernight: false };
  }
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  const isOvernight = endMins <= startMins;
  if (isOvernight) {
    endMins += 24 * 60;
  }
  const grossMins = Math.max(0, endMins - startMins);
  const netMins = Math.max(0, grossMins - breakMinutes);
  const netHours = Math.round((netMins / 60) * 2) / 2; // nearest 0.5h or 0.1h
  const exactTenth = Math.round((netMins / 60) * 10) / 10;
  return { netHours: exactTenth > 0 ? exactTenth : netHours, isOvernight };
}

export function OvertimeRequestForm({
  currentUserEmail = "",
  prefillClaim = null,
  onClearPrefill,
  onOpenVoucher,
}: Props) {
  const [state, action, pending] = useActionState(
    submitOvertimeRequest,
    initialState
  );

  const today = new Date().toISOString().slice(0, 10);
  const initialDateInfo = detectDateRateCategory(today);

  // Date & auto-detected category
  const [dateWorked, setDateWorked] = useState(today);
  const [autoDetectedNote, setAutoDetectedNote] = useState<string | null>(null);

  // Duration / Time Mode ("hours" | "time_range" | "full_day")
  const [timeMode, setTimeMode] = useState<OvertimeTimeMode>("hours");
  const [hours, setHours] = useState("4.5");
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("21:30");
  const [breakMinutes, setBreakMinutes] = useState(0);

  // Rate / Amount Paid Basis ("hourly" | "daily" | "custom_amount")
  const [rateBasis, setRateBasis] = useState<OvertimeRateBasis>("hourly");
  const [hourlyRateInput, setHourlyRateInput] = useState(String(BASE_HOURLY_RATE));
  const [dailyRateInput, setDailyRateInput] = useState(String(DEFAULT_DAILY_RATE));
  const [prorateDailyByHours, setProrateDailyByHours] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState("8437.50");

  // Multiplier & Task Details
  const [multiplier, setMultiplier] = useState<OvertimeMultiplier>(initialDateInfo.multiplier);
  const [taskSummary, setTaskSummary] = useState("Core Banking Migration Sprint");
  const [isPrefilled, setIsPrefilled] = useState(false);

  // Sync prefilled claim when user repeats a historical claim
  useEffect(() => {
    if (prefillClaim) {
      const meta = parseOvertimeRecordMeta(prefillClaim);
      const timer = setTimeout(() => {
        setHours(String(prefillClaim.hours));
        setMultiplier(meta.multiplier);
        setTaskSummary(meta.projectTitle);
        setDateWorked(today);
        setRateBasis(meta.rateBasis);
        if (meta.rateBasis === "daily") {
          setDailyRateInput(String(meta.unitRateKes));
        } else if (meta.rateBasis === "custom_amount") {
          setCustomAmountInput(String(meta.payoutKes));
        } else {
          setHourlyRateInput(String(meta.unitRateKes));
        }
        if (meta.timeRange && meta.timeRange.includes("–")) {
          const parts = meta.timeRange.match(/(\d{1,2}:\d{2})\s*–\s*(\d{1,2}:\d{2})/);
          if (parts) {
            setStartTime(parts[1]);
            setEndTime(parts[2]);
            setTimeMode("time_range");
          }
        }
        setIsPrefilled(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [prefillClaim, today]);

  // Derived hours based on timeMode
  const timeWindowCalc = computeHoursFromTimeWindow(startTime, endTime, breakMinutes);
  const parsedHours =
    timeMode === "time_range"
      ? timeWindowCalc.netHours
      : timeMode === "full_day"
      ? Math.max(0.5, parseFloat(hours) || STANDARD_DAY_HOURS)
      : Math.max(0, parseFloat(hours) || 0);

  const formattedTimeRange =
    timeMode === "time_range"
      ? `${startTime}–${endTime}`
      : timeMode === "full_day"
      ? "Full Day (08:00–17:00)"
      : "";

  // Derived monetary calculation
  const parsedHourlyRate = Math.max(0, parseFloat(hourlyRateInput) || 0);
  const parsedDailyRate = Math.max(0, parseFloat(dailyRateInput) || 0);
  const parsedCustomAmount = Math.max(0, parseFloat(customAmountInput) || 0);

  const activeUnitRate =
    rateBasis === "daily"
      ? parsedDailyRate
      : rateBasis === "custom_amount"
      ? parsedHours > 0
        ? Math.round((parsedCustomAmount / parsedHours) * 100) / 100
        : parsedCustomAmount
      : parsedHourlyRate;

  const estimatedPayout =
    rateBasis === "custom_amount"
      ? parsedCustomAmount
      : rateBasis === "daily"
      ? prorateDailyByHours
        ? Math.round((parsedHours / STANDARD_DAY_HOURS) * parsedDailyRate * multiplier * 100) / 100
        : Math.round(parsedDailyRate * multiplier * 100) / 100
      : Math.round(parsedHours * parsedHourlyRate * multiplier * 100) / 100;

  const netAfterTax = Math.round(estimatedPayout * (1 - PAYE_WITHHOLDING_RATE) * 100) / 100;
  const effectiveHourlyRate =
    parsedHours > 0 ? Math.round((estimatedPayout / parsedHours) * 100) / 100 : 0;

  const dateCategoryInfo = detectDateRateCategory(dateWorked);

  function handleDateChange(newDate: string) {
    setDateWorked(newDate);
    const detected = detectDateRateCategory(newDate);
    setMultiplier(detected.multiplier);
    setAutoDetectedNote(`Auto-set to ${detected.badgeText}`);
  }

  function handleSelectQuickDate(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const iso = d.toISOString().slice(0, 10);
    handleDateChange(iso);
  }

  function handleTimeModeChange(nextMode: OvertimeTimeMode) {
    setTimeMode(nextMode);
    if (nextMode === "full_day") {
      setHours(String(STANDARD_DAY_HOURS));
      setStartTime("08:00");
      setEndTime("17:00");
      setBreakMinutes(60);
    } else if (nextMode === "time_range") {
      const calc = computeHoursFromTimeWindow(startTime, endTime, breakMinutes);
      if (calc.netHours > 0) {
        setHours(String(calc.netHours));
      }
    }
  }

  function handleStepHours(delta: number) {
    const current = parseFloat(hours) || 0;
    const next = Math.min(24, Math.max(0.5, Math.round((current + delta) * 2) / 2));
    setHours(String(next));
  }

  function handleDismissPrefill() {
    setIsPrefilled(false);
    if (onClearPrefill) onClearPrefill();
  }

  function handleViewSubmittedVoucher() {
    if (!onOpenVoucher) return;
    const year = dateWorked.slice(0, 4) || String(new Date().getFullYear());
    const baseRef = `OT-${year}-${Math.floor(100 + Math.random() * 900)}`;
    const subtitle =
      multiplier === 2.5
        ? "Emergency Deployment"
        : multiplier === 2.0
        ? "Weekend Maintenance"
        : multiplier === 1.0
        ? "Flat Day/Shift Allowance"
        : "Night Shift Support";

    const ticketRef = `${baseRef}|PAY:${estimatedPayout}|RATE:${activeUnitRate}|BASIS:${rateBasis}${
      formattedTimeRange ? `|TIME:${formattedTimeRange}` : ""
    }|MULT:${multiplier.toFixed(1)}`;

    onOpenVoucher({
      id: baseRef,
      user_id: "",
      user_email: currentUserEmail,
      overtime_date: dateWorked,
      hours: parsedHours,
      task_summary: `${taskSummary || "Core Banking Migration Sprint"}\n${subtitle} (${multiplier.toFixed(1)}x)${
        formattedTimeRange ? ` • ${formattedTimeRange}` : ""
      }`,
      ticket_ref: ticketRef,
      compensatory_choice: "paid",
      status: "pending",
      reviewed_by: "Dr. Jane Wangari",
      reviewed_at: null,
      reviewer_note: null,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div
      id="overtime-claim-form-section"
      className="flex flex-col bg-surface-container-low rounded-xl p-6 lg:p-7 shadow-sm border border-surface-container-high/60"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-headline-md text-on-surface">Quick Overtime Log</h2>
          <p className="text-body-sm text-on-surface-variant">
            Log shift hours or time window &amp; day/hourly payout
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary-container/10 flex items-center justify-center text-primary shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-[18px] h-[18px]"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-5.97 4.06L14.09 6l1.41 1.41L16.91 6l1.06 1.06-1.41 1.41 1.41 1.41-1.06 1.06-1.41-1.4-1.41 1.41-1.06-1.06 1.41-1.41-1.41-1.42Zm-6.78.66h5v1.5h-5v-1.5ZM11.5 16h-2v2H8v-2H6v-1.5h2v-2h1.5v2h2V16Zm6.5 1.25h-5v-1.5h5v1.5Zm0-2.5h-5v-1.5h5v1.5Z" />
          </svg>
        </div>
      </div>

      {/* Prefill Notification Banner */}
      {isPrefilled && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary-container/10 p-3 text-xs text-on-surface">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong className="text-primary">Template Loaded:</strong> Adjust date, time, or amount and submit.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismissPrefill}
            className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="hours" value={String(parsedHours)} />
        <input type="hidden" name="time_range" value={formattedTimeRange} />
        <input type="hidden" name="rate_basis" value={rateBasis} />
        <input type="hidden" name="unit_rate" value={String(activeUnitRate)} />
        <input type="hidden" name="payout_kes" value={String(estimatedPayout)} />
        <input type="hidden" name="multiplier" value={multiplier.toFixed(1)} />
        <input type="hidden" name="compensatory_choice" value="paid" />

        {/* 1. Date of Overtime + Smart Day Detection */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label
              htmlFor="overtime_date"
              className="text-label-md font-medium text-on-surface"
            >
              1. Date of Overtime
            </label>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                dateCategoryInfo.category === "holiday"
                  ? "bg-amber-100 text-amber-900"
                  : dateCategoryInfo.category === "weekend"
                  ? "bg-[#009dd3]/15 text-[#00668a]"
                  : "bg-primary-container/15 text-primary"
              }`}
            >
              {dateCategoryInfo.badgeText}
            </span>
          </div>
          <input
            id="overtime_date"
            name="overtime_date"
            type="date"
            required
            value={dateWorked}
            onChange={(e) => handleDateChange(e.target.value)}
            className="ot-field w-full h-11 bg-surface-container px-4 rounded-xl text-on-surface text-body-md tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
          />
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectQuickDate(0)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  dateWorked === today
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickDate(-1)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition cursor-pointer"
              >
                Yesterday
              </button>
            </div>
            {autoDetectedNote && (
              <span className="text-[11px] text-primary font-medium">
                {autoDetectedNote}
              </span>
            )}
          </div>
        </div>

        {/* 2. Duration / Time Logged Mode */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface">
              2. Log Hours or Time Worked
            </label>
            <span className="text-label-sm font-semibold text-primary tabular-nums">
              {parsedHours} {parsedHours === 1 ? "hr" : "hrs"} logged
            </span>
          </div>

          {/* 3-Mode Switch: By Hours | Time Window | Full Day */}
          <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-xl">
            {(
              [
                { id: "hours", label: "By Hours" },
                { id: "time_range", label: "Time Window" },
                { id: "full_day", label: "Full Day" },
              ] as const
            ).map((tab) => {
              const active = timeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTimeModeChange(tab.id)}
                  className={`py-2 px-2 rounded-lg text-label-md font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-surface text-on-surface shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mode A: Direct Hours + Stepper + Quick Chips */}
          {timeMode === "hours" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepHours(-0.5)}
                  aria-label="Decrease hours by 0.5"
                  className="h-11 w-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-lg flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  &minus;
                </button>
                <div className="relative flex-1 flex items-center">
                  <input
                    id="ot-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="Enter hours"
                    className="ot-field w-full h-11 bg-surface-container px-4 pr-14 rounded-xl text-on-surface text-body-lg font-semibold tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
                  />
                  <span className="absolute right-3.5 text-on-surface-variant text-body-sm pointer-events-none">
                    hrs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepHours(0.5)}
                  aria-label="Increase hours by 0.5"
                  className="h-11 w-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-lg flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  +
                </button>
              </div>

              {/* Quick Hour Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {QUICK_HOURS_CHIPS.map((h) => {
                  const isCurrent = parseFloat(hours) === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(String(h))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tabular-nums transition cursor-pointer ${
                        isCurrent
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {h}h
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode B: Start Time -> End Time Window */}
          {timeMode === "time_range" && (
            <div className="flex flex-col gap-2.5 bg-surface-container/60 p-3.5 rounded-xl border border-surface-container-high">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="ot-start-time"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    id="ot-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="ot-field w-full h-10 bg-surface px-3 rounded-lg text-on-surface text-body-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ot-end-time"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1"
                  >
                    End Time {timeWindowCalc.isOvernight ? "(+1d)" : ""}
                  </label>
                  <input
                    id="ot-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="ot-field w-full h-10 bg-surface px-3 rounded-lg text-on-surface text-body-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Break Deduction + Calculated Hours Bar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-on-surface-variant">Break:</span>
                  {[0, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setBreakMinutes(mins)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition ${
                        breakMinutes === mins
                          ? "bg-primary text-on-primary"
                          : "bg-surface text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  = {timeWindowCalc.netHours} hrs net
                </span>
              </div>

              {/* Quick Time Window Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-surface-container-high">
                {TIME_WINDOW_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStartTime(preset.start);
                      setEndTime(preset.end);
                      setBreakMinutes(preset.breakMins);
                    }}
                    className="px-2 py-1 rounded-lg bg-surface hover:bg-surface-container-high text-[11px] font-medium text-on-surface-variant hover:text-on-surface transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode C: Full Day Overtime */}
          {timeMode === "full_day" && (
            <div className="flex flex-col gap-2 bg-surface-container/60 p-3.5 rounded-xl border border-surface-container-high">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-body-sm font-semibold text-on-surface">
                    Full Day Shift (08:00 – 17:00)
                  </div>
                  <div className="text-label-sm text-on-surface-variant">
                    Standard 8.0-hour day (or select full-day shift length)
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-primary-container/15 text-primary font-bold text-body-sm tabular-nums">
                  {parsedHours} hrs
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[8, 10, 12].map((dayHrs) => (
                  <button
                    key={dayHrs}
                    type="button"
                    onClick={() => setHours(String(dayHrs))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      parsedHours === dayHrs
                        ? "bg-primary text-on-primary"
                        : "bg-surface text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {dayHrs} hrs ({dayHrs === 8 ? "Standard Day" : "Extended Day"})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Amount Paid & Rate Basis (Per Hour | Per Day | Fixed Amount) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface">
              3. Amount Paid / Rate Basis
            </label>
            <span className="text-label-sm text-primary font-medium">
              {ENTERPRISE_TIER_LABEL}
            </span>
          </div>

          {/* 3-Tab Switch for Rate Basis */}
          <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-xl">
            {(
              [
                { id: "hourly", label: "Hourly Rate" },
                { id: "daily", label: "Day Rate" },
                { id: "custom_amount", label: "Exact Amount" },
              ] as const
            ).map((tab) => {
              const active = rateBasis === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === "custom_amount" && rateBasis !== "custom_amount") {
                      setCustomAmountInput(String(estimatedPayout));
                    }
                    setRateBasis(tab.id);
                  }}
                  className={`py-2 px-2 rounded-lg text-label-md font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-surface text-on-surface shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Basis A: Hourly Rate Input */}
          {rateBasis === "hourly" && (
            <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ot-hourly-rate"
                  className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold"
                >
                  Hourly Rate (KES / hr)
                </label>
                <div className="flex items-center gap-1">
                  {[1000, 1250, 1500, 2000].map((presetRate) => (
                    <button
                      key={presetRate}
                      type="button"
                      onClick={() => setHourlyRateInput(String(presetRate))}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                        parsedHourlyRate === presetRate
                          ? "bg-primary text-on-primary"
                          : "bg-surface text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {formatKes(presetRate)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-on-surface-variant text-body-sm font-medium pointer-events-none">
                  KES
                </span>
                <input
                  id="ot-hourly-rate"
                  type="number"
                  step="50"
                  min="100"
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(e.target.value)}
                  className="ot-field w-full h-10 bg-surface pl-12 pr-14 rounded-lg text-on-surface text-body-md font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute right-3.5 text-on-surface-variant text-label-sm pointer-events-none">
                  / hr
                </span>
              </div>
            </div>
          )}

          {/* Basis B: Daily Rate (Amount Paid for the Day) */}
          {rateBasis === "daily" && (
            <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ot-daily-rate"
                  className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold"
                >
                  Day Rate (KES / day)
                </label>
                <div className="flex items-center gap-1">
                  {[5000, 10000, 15000, 20000].map((presetDay) => (
                    <button
                      key={presetDay}
                      type="button"
                      onClick={() => setDailyRateInput(String(presetDay))}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                        parsedDailyRate === presetDay
                          ? "bg-primary text-on-primary"
                          : "bg-surface text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {formatKes(presetDay)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-on-surface-variant text-body-sm font-medium pointer-events-none">
                  KES
                </span>
                <input
                  id="ot-daily-rate"
                  type="number"
                  step="500"
                  min="500"
                  value={dailyRateInput}
                  onChange={(e) => setDailyRateInput(e.target.value)}
                  className="ot-field w-full h-10 bg-surface pl-12 pr-16 rounded-lg text-on-surface text-body-md font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute right-3.5 text-on-surface-variant text-label-sm pointer-events-none">
                  / day
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-0.5">
                <span>Calculation method:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProrateDailyByHours(false)}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      !prorateDailyByHours
                        ? "bg-primary text-on-primary"
                        : "bg-surface text-on-surface-variant"
                    }`}
                  >
                    Full Day Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setProrateDailyByHours(true)}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      prorateDailyByHours
                        ? "bg-primary text-on-primary"
                        : "bg-surface text-on-surface-variant"
                    }`}
                  >
                    Prorate ({parsedHours}h / 8h)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Basis C: Direct / Custom Total Amount Paid for the Day or Time */}
          {rateBasis === "custom_amount" && (
            <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ot-custom-amount"
                  className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold"
                >
                  Amount Paid for Day / Shift (KES)
                </label>
                <div className="flex items-center gap-1">
                  {[2500, 5000, 10000, 15000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmountInput(String(amt))}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                        parsedCustomAmount === amt
                          ? "bg-primary text-on-primary"
                          : "bg-surface text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {formatKes(amt)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-on-surface-variant text-body-sm font-medium pointer-events-none">
                  KES
                </span>
                <input
                  id="ot-custom-amount"
                  type="number"
                  step="100"
                  min="0"
                  value={customAmountInput}
                  onChange={(e) => setCustomAmountInput(e.target.value)}
                  placeholder="Enter total amount paid"
                  className="ot-field w-full h-10 bg-surface pl-12 pr-4 rounded-lg text-on-surface text-body-md font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="text-[11px] text-on-surface-variant flex justify-between">
                <span>Effective hourly equivalent:</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  KES {formatKes(effectiveHourlyRate, true)} / hr
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Multiplier Selector (shown when using Hourly or Daily Rate, or for tagging shift category) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface">
              Overtime Multiplier Category
            </label>
            {rateBasis === "custom_amount" && (
              <span className="text-[11px] text-on-surface-variant">
                Tags shift category
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MULTIPLIER_OPTIONS.map((opt) => {
              const isSelected = multiplier === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMultiplier(opt.value)}
                  className={`py-2.5 px-1.5 rounded-xl text-body-sm font-medium transition-all text-center cursor-pointer ${
                    isSelected
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {opt.label}
                  <br />
                  <span
                    className={`text-[10px] ${
                      isSelected ? "opacity-85" : "opacity-65"
                    }`}
                  >
                    {opt.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Reason / Project Tag */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="task_summary"
            className="text-label-md font-medium text-on-surface"
          >
            Project / Task Reference
          </label>
          <input
            id="task_summary"
            name="task_summary"
            type="text"
            required
            value={taskSummary}
            onChange={(e) => setTaskSummary(e.target.value)}
            placeholder="e.g. Core Banking Migration Sprint"
            className="ot-field w-full h-11 bg-surface-container px-4 rounded-xl text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
          />
        </div>

        {/* Instant Cash Payout Summary Box */}
        <div className="p-4 rounded-xl bg-primary-container/10 border border-primary/15 flex flex-col gap-2 mt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Total Amount for Day / Time
            </span>
            <span className="text-label-sm text-primary font-semibold">
              {formattedTimeRange ? formattedTimeRange : `${parsedHours} hrs`}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-body-sm text-on-surface-variant tabular-nums">
              {rateBasis === "custom_amount" ? (
                <>
                  Direct Payout &bull; {parsedHours} hrs (KES{" "}
                  {formatKes(effectiveHourlyRate)}/hr)
                </>
              ) : rateBasis === "daily" ? (
                <>
                  KES {formatKes(parsedDailyRate)}/day{" "}
                  {prorateDailyByHours ? `× (${parsedHours}/8h)` : ""} ×{" "}
                  <span id="current-mult">{multiplier.toFixed(1)}x</span>
                </>
              ) : (
                <>
                  KES {formatKes(parsedHourlyRate)}/hr × {parsedHours} hrs ×{" "}
                  <span id="current-mult">{multiplier.toFixed(1)}x</span>
                </>
              )}
            </span>
            <span
              className="font-headline-lg text-primary tabular-nums"
              id="payout-result"
            >
              KES {formatKes(estimatedPayout, true)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-primary/15 text-[11px] text-on-surface-variant">
            <span>Est. Net Disbursed (after 30% PAYE):</span>
            <span className="font-semibold text-on-surface tabular-nums">
              KES {formatKes(netAfterTax, true)}
            </span>
          </div>
        </div>

        {/* Error / Success Messages */}
        {state.error && (
          <div
            role="alert"
            className="rounded-xl border border-error/20 bg-error-container p-3 text-body-sm font-medium text-on-error-container"
          >
            {state.error}
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="rounded-xl border border-primary/20 bg-primary-container/15 p-3.5 text-body-sm text-on-surface"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-on-primary-container">
                  {state.success}
                </span>
              </div>
              {onOpenVoucher && (
                <button
                  type="button"
                  onClick={handleViewSubmittedVoucher}
                  className="text-label-sm font-semibold text-primary underline hover:opacity-80 cursor-pointer"
                >
                  View Voucher
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending || parsedHours <= 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-1 cursor-pointer active:scale-[0.99] disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-[18px] h-[18px]"
          >
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          <span>
            {pending
              ? "Submitting Claim…"
              : `Submit Claim (${parsedHours}h • KES ${formatKes(estimatedPayout)})`}
          </span>
        </button>
      </form>
    </div>
  );
}

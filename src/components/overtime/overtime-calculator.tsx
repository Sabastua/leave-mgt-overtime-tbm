"use client";

import { useState } from "react";
import { ClockIcon, CheckCircleIcon, InformationCircleIcon } from "@/components/ui/icons";

type Props = {
  onApplyHours: (hours: number, summaryNote?: string, pref?: "paid" | "time_off_in_lieu") => void;
};

type ShiftPreset = {
  name: string;
  start: string;
  end: string;
  breakMins: number;
  dayType: "weekday" | "weekend" | "holiday";
  desc: string;
};

const SHIFT_PRESETS: ShiftPreset[] = [
  {
    name: "Evening Support",
    start: "17:00",
    end: "21:00",
    breakMins: 0,
    dayType: "weekday",
    desc: "Post-working-hours operational support",
  },
  {
    name: "Night Change Window",
    start: "22:00",
    end: "04:00",
    breakMins: 30,
    dayType: "weekday",
    desc: "Critical core deployment / migration",
  },
  {
    name: "Weekend Standby (Full)",
    start: "09:00",
    end: "17:00",
    breakMins: 60,
    dayType: "weekend",
    desc: "Saturday / Sunday daytime coverage",
  },
  {
    name: "Weekend Incident Callout",
    start: "14:00",
    end: "18:00",
    breakMins: 0,
    dayType: "weekend",
    desc: "Urgent ticket triage or emergency fix",
  },
  {
    name: "Public Holiday Shift",
    start: "09:00",
    end: "17:00",
    breakMins: 60,
    dayType: "holiday",
    desc: "Official statutory holiday roster",
  },
];

export function OvertimeCalculator({ onApplyHours }: Props) {
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("21:00");
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [dayType, setDayType] = useState<"weekday" | "weekend" | "holiday">("weekday");
  const [chosenCompensation, setChosenCompensation] = useState<"paid" | "time_off_in_lieu">("paid");

  // Calculate gross and net hours
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let startTotalMins = startHour * 60 + startMin;
  let endTotalMins = endHour * 60 + endMin;

  // Handle overnight shift (e.g. 22:00 to 02:00)
  if (endTotalMins < startTotalMins) {
    endTotalMins += 24 * 60;
  }

  const grossMinutes = Math.max(0, endTotalMins - startTotalMins);
  const netMinutes = Math.max(0, grossMinutes - breakMinutes);
  const netHours = Math.round((netMinutes / 60) * 10) / 10; // 1 decimal place

  // Multipliers according to Safaricom CBA & Kenya labor laws
  // Weekday = 1.5x, Weekend & Public Holidays = 2.0x (double rate)
  const rateMultiplier = dayType === "weekday" ? 1.5 : 2.0;
  const equivalentPayHours = Math.round(netHours * rateMultiplier * 10) / 10;
  const equivalentToilDays = Math.round((equivalentPayHours / 8) * 10) / 10;

  function loadPreset(preset: ShiftPreset) {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setBreakMinutes(preset.breakMins);
    setDayType(preset.dayType);
  }

  function handleApply() {
    if (netHours > 0) {
      const dayTypeLabel =
        dayType === "weekday"
          ? "Weekday Shift (1.5x)"
          : dayType === "weekend"
          ? "Weekend Shift (2.0x Double Rate)"
          : "Public Holiday (2.0x Double Rate)";
      const note = `${startTime} to ${endTime} (${netHours}h net, ${dayTypeLabel}, Break: ${breakMinutes}m)`;
      onApplyHours(netHours, note, chosenCompensation);
    }
  }

  function handleReset() {
    setStartTime("17:00");
    setEndTime("21:00");
    setBreakMinutes(0);
    setDayType("weekday");
    setChosenCompensation("paid");
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-white p-5 shadow-xs transition-all duration-300 hover:shadow-md">
      {/* Top Header */}
      <div className="flex flex-col gap-2 border-b border-blue-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Smart Overtime Hours &amp; Rate Calculator
            </h3>
            <p className="text-[11px] text-gray-500">
              Calculate exact hours worked, statutory rate multipliers, and TOIL leave credits
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="self-end sm:self-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition active:scale-95"
        >
          Reset
        </button>
      </div>

      {/* Quick Shift Presets Bar */}
      <div className="mt-3.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
          Quick Shift Templates
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SHIFT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => loadPreset(preset)}
              className="group rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-left text-xs transition-all hover:border-blue-400 hover:bg-blue-50/80 active:scale-95"
            >
              <span className="font-semibold text-gray-900 group-hover:text-blue-800">
                {preset.name}
              </span>
              <span className="block text-[10px] text-gray-500">
                {preset.start}–{preset.end} ({preset.dayType})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Form Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Start Time */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-3.5 py-2.5 text-xs font-mono font-semibold text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            End Time {endTotalMins < startTotalMins ? "(Overnight +24h)" : ""}
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-3.5 py-2.5 text-xs font-mono font-semibold text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </div>

        {/* Break Duration Slider & Quick Pills */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
              Break Deduction
            </label>
            <span className="font-mono text-xs font-bold text-blue-700">
              {breakMinutes} mins
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={90}
            step={15}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>0m</span>
            <span>30m</span>
            <span>60m</span>
            <span>90m</span>
          </div>
        </div>

        {/* Shift Type / Multiplier */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            Shift Category
          </label>
          <select
            value={dayType}
            onChange={(e) => setDayType(e.target.value as any)}
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-3.5 py-2.5 text-xs font-semibold text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          >
            <option value="weekday">Weekday Shift (1.5x Rate)</option>
            <option value="weekend">Weekend Shift (2.0x Double Rate)</option>
            <option value="holiday">Public Holiday (2.0x Double Rate)</option>
          </select>
        </div>
      </div>

      {/* Live Value & Compensation Mode Comparison */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Paid Option Card */}
        <div
          onClick={() => setChosenCompensation("paid")}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
            chosenCompensation === "paid"
              ? "border-blue-400 bg-blue-50/80 shadow-xs ring-1 ring-blue-500/20"
              : "border-gray-200 bg-white hover:bg-gray-50/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900">
              Cash Payout (Overtime Rate)
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                chosenCompensation === "paid"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {chosenCompensation === "paid" ? "Selected" : "Select"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            {netHours}h actual work × {rateMultiplier.toFixed(1)}x multiplier =
          </p>
          <p className="mt-1 text-lg font-black font-mono text-blue-800">
            {equivalentPayHours} Pay Hours Equivalent
          </p>
        </div>

        {/* TOIL Option Card */}
        <div
          onClick={() => setChosenCompensation("time_off_in_lieu")}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
            chosenCompensation === "time_off_in_lieu"
              ? "border-purple-400 bg-purple-50/80 shadow-xs ring-1 ring-purple-500/20"
              : "border-gray-200 bg-white hover:bg-gray-50/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900">
              Time Off In Lieu (TOIL Leave Credit)
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                chosenCompensation === "time_off_in_lieu"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {chosenCompensation === "time_off_in_lieu" ? "Selected" : "Select"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            Credited toward paid compensatory rest days (8h = 1d):
          </p>
          <p className="mt-1 text-lg font-black font-mono text-purple-800">
            {equivalentToilDays} Days TOIL ({equivalentPayHours}h)
          </p>
        </div>
      </div>

      {/* Action Apply Bar */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white p-3.5 border border-blue-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">
              Net Claim Hours
            </span>
            <span className="text-lg font-bold font-mono text-gray-900">
              {netHours}h
            </span>
          </div>

          <div className="border-l border-gray-200 pl-4">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">
              Gross Shift
            </span>
            <span className="font-mono text-gray-700">
              {(grossMinutes / 60).toFixed(1)}h
            </span>
          </div>

          <div className="border-l border-gray-200 pl-4">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">
              Break Deducted
            </span>
            <span className="font-mono text-gray-700">
              {breakMinutes}m
            </span>
          </div>

          <div className="border-l border-gray-200 pl-4">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">
              Applied Rate
            </span>
            <span className="font-semibold text-blue-700">
              {rateMultiplier.toFixed(1)}x
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={netHours <= 0}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
        >
          <CheckCircleIcon className="h-4 w-4" />
          <span>Apply {netHours}h to Claim ({chosenCompensation === "paid" ? "Paid" : "TOIL"})</span>
        </button>
      </div>
    </div>
  );
}

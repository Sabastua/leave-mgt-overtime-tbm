"use client";

import { useState } from "react";
import { ClockIcon, CheckCircleIcon, ArrowPathIcon } from "@/components/ui/icons";

type Props = {
  onApplyHours: (hours: number, summaryNote?: string) => void;
};

export function OvertimeCalculator({ onApplyHours }: Props) {
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("21:00");
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [dayType, setDayType] = useState<"weekday" | "weekend" | "holiday">("weekday");

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
  const netHours = Math.round((netMinutes / 60) * 10) / 10; // Round to 1 decimal place

  // Multipliers according to Safaricom & Kenya labor standards
  const rateMultiplier = dayType === "weekday" ? 1.5 : 2.0;
  const equivalentHours = Math.round(netHours * rateMultiplier * 10) / 10;
  const equivalentToilDays = Math.round((equivalentHours / 8) * 10) / 10;

  function handleApply() {
    if (netHours > 0) {
      const dayTypeLabel =
        dayType === "weekday"
          ? "Weekday Shift (1.5x)"
          : dayType === "weekend"
          ? "Weekend Shift (2.0x)"
          : "Public Holiday (2.0x)";
      const note = `${startTime} to ${endTime} (${netHours}h, ${dayTypeLabel})`;
      onApplyHours(netHours, note);
    }
  }

  function handleReset() {
    setStartTime("17:00");
    setEndTime("21:00");
    setBreakMinutes(0);
    setDayType("weekday");
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-5 shadow-xs transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between pb-3 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <ClockIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Smart Overtime Hours Calculator
            </h3>
            <p className="text-[11px] text-gray-500">
              Calculate exact shift hours and compensatory multipliers automatically
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Start Time */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            End Time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
          />
        </div>

        {/* Break Duration */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            Deduct Break
          </label>
          <select
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
          >
            <option value={0}>No break (0m)</option>
            <option value={15}>15 mins break</option>
            <option value={30}>30 mins meal break</option>
            <option value={45}>45 mins break</option>
            <option value={60}>1 hour meal break</option>
          </select>
        </div>

        {/* Shift Type / Multiplier */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            Day Category
          </label>
          <select
            value={dayType}
            onChange={(e) => setDayType(e.target.value as any)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
          >
            <option value="weekday">Weekday (1.5x Rate)</option>
            <option value="weekend">Weekend (2.0x Double Rate)</option>
            <option value="holiday">Public Holiday (2.0x)</option>
          </select>
        </div>
      </div>

      {/* Results & Apply Action Bar */}
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
              Rate Multiplier
            </span>
            <span className="font-semibold text-blue-700">
              {rateMultiplier.toFixed(1)}x
            </span>
          </div>

          <div className="border-l border-gray-200 pl-4">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">
              Equivalent Value
            </span>
            <span className="font-semibold text-purple-700">
              {equivalentHours}h TOIL ({equivalentToilDays}d)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={netHours <= 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
        >
          <CheckCircleIcon className="h-4 w-4" />
          <span>Apply {netHours}h to Claim</span>
        </button>
      </div>
    </div>
  );
}

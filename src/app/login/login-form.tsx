"use client";

import { useActionState, useState, useEffect } from "react";
import { loginAction, type LoginState } from "./actions";
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon, CheckCircleIcon } from "@/components/ui/icons";

const initialState: LoginState = { email: "" };
const STORAGE_KEY = "safaricom_remembered_email";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState(state.email || "");
  const [rememberEmail, setRememberEmail] = useState(false);

  // Load remembered email on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const timer = setTimeout(() => {
          setEmailValue(saved);
          setRememberEmail(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Update localStorage when email or remember state changes
  const handleEmailChange = (val: string) => {
    setEmailValue(val);
    if (rememberEmail && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, val);
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberEmail(checked);
    if (typeof window !== "undefined") {
      if (checked && emailValue) {
        localStorage.setItem(STORAGE_KEY, emailValue);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const appendDomain = () => {
    const trimmed = emailValue.trim();
    if (!trimmed.includes("@") && trimmed.length > 0) {
      const fullEmail = `${trimmed}@safaricom.co.ke`;
      handleEmailChange(fullEmail);
    }
  };

  const showDomainSuggestion = emailValue.trim().length > 0 && !emailValue.includes("@");

  const error =
    state.error ?? (state === initialState ? initialError : undefined);

  return (
    <form action={action} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 animate-in fade-in"
        >
          {error}
        </div>
      )}

      {state.info && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in"
        >
          {state.info}
        </div>
      )}

      {/* Email Input */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="email"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700"
          >
            Safaricom Email
          </label>
          {emailValue.toLowerCase().endsWith("@safaricom.co.ke") && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <CheckCircleIcon className="h-3 w-3" />
              <span>Safaricom Corporate</span>
            </span>
          )}
        </div>
        <div className="relative mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={emailValue}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="username@safaricom.co.ke"
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-3 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 placeholder:text-gray-400 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </div>

        {/* 1-Tap Corporate Domain Assist */}
        {showDomainSuggestion && (
          <div className="mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-200">
            <span className="text-[11px] text-gray-500">Quick complete:</span>
            <button
              type="button"
              onClick={appendDomain}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
            >
              <span>+ @safaricom.co.ke</span>
            </button>
          </div>
        )}
      </div>

      {/* Password Input with Eye Toggle */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700"
          >
            Corporate Password
          </label>
        </div>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your corporate password"
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] pl-4 pr-11 py-3 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 placeholder:text-gray-400 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => handleRememberToggle(e.target.checked)}
            className="h-4 w-4 rounded accent-brand cursor-pointer"
          />
          <span>Remember my email</span>
        </label>
        <span className="text-[11px] text-gray-400 font-medium">Safaricom PLC</span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {pending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>Verifying Credentials...</span>
          </>
        ) : (
          <span>Sign In to Portal</span>
        )}
      </button>

      {/* Security Footer */}
      <div className="mt-4 rounded-xl bg-gray-50/80 p-2.5 border border-gray-100 flex items-center gap-2 text-[11px] text-gray-500">
        <ShieldCheckIcon className="h-4 w-4 text-brand shrink-0" />
        <span>
          Leave &amp; Overtime Management • Authorized Safaricom Personnel Only
        </span>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState, useEffect } from "react";
import { loginAction, type LoginState } from "./actions";
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon } from "@/components/ui/icons";

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
        setEmailValue(saved);
        setRememberEmail(true);
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
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-wider text-gray-700"
        >
          Safaricom Email
        </label>
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
            className="block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Password Input with Eye Toggle */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700"
          >
            Password
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
            className="block w-full rounded-xl border border-gray-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
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
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Signing in..." : "Sign In to Portal"}
      </button>

      {/* Security Footer */}
      <div className="mt-4 rounded-xl bg-gray-50 p-2.5 border border-gray-100 flex items-center gap-2 text-[11px] text-gray-500">
        <ShieldCheckIcon className="h-4 w-4 text-brand shrink-0" />
        <span>
          Leave &amp; Overtime Management • Authorized Safaricom Personnel Only
        </span>
      </div>
    </form>
  );
}

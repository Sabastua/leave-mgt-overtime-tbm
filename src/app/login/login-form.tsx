"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { email: "" };

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const error =
    state.error ?? (state === initialState ? initialError : undefined);

  return (
    <form action={action} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {state.info && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-700"
        >
          {state.info}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
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
            defaultValue={state.email}
            placeholder="username@safaricom.co.ke"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
          >
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-[11px] text-gray-400">
        Leave &amp; Overtime Management System • Authorized Safaricom Personnel Only
      </p>
    </form>
  );
}

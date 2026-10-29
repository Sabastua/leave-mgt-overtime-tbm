"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { step: "email", email: "" };

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none";
const buttonClass =
  "w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  if (state.step === "email") {
    // Only show the URL error (e.g. "unauthorized") before the first submit.
    const error = state.error ?? (state === initialState ? initialError : undefined);
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="intent" value="send" />
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder="you@safaricom.co.ke"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Sending code…" : "Send sign-in code"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        {state.message && <p className="text-sm text-gray-600">{state.message}</p>}
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700">
            Sign-in code
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            maxLength={10}
            required
            autoFocus
            placeholder="123456"
            className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Verifying…" : "Sign in"}
        </button>
      </form>

      <form action={action}>
        <input type="hidden" name="intent" value="reset" />
        <button
          type="submit"
          disabled={pending}
          className="w-full text-sm text-gray-600 underline hover:text-gray-900"
        >
          Use a different email
        </button>
      </form>
    </div>
  );
}

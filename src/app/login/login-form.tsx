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
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-2xl">
        ✉️
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
      <p className="text-sm text-gray-600">
        We sent a sign-in link to <strong>{state.email}</strong>.
      </p>
      <ol className="space-y-1 rounded-lg bg-gray-50 p-3 text-left text-sm text-gray-600">
        <li>1. Open the email from Supabase Auth (check Junk too).</li>
        <li>
          2. Click <strong>Log In</strong> — open it in <strong>this same browser</strong>.
        </li>
        <li>3. You&apos;ll be signed in automatically.</li>
      </ol>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="intent" value="resend" />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Resend link"}
        </button>
      </form>

      <form action={action}>
        <input type="hidden" name="intent" value="reset" />
        <button
          type="submit"
          disabled={pending}
          className="text-sm text-gray-600 underline hover:text-gray-900"
        >
          Use a different email
        </button>
      </form>
    </div>
  );
}

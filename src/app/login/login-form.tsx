"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";
import { ALLOWED_EMAILS, TEAM_MEMBERS } from "@/lib/auth/allowed-users";

const initialState: LoginState = { mode: "password", email: "" };

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none";
const buttonClass =
  "w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [selectedEmail, setSelectedEmail] = useState(state.email);

  const error =
    state.error ?? (state === initialState ? initialError : undefined);

  if (state.mode === "sent") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-2xl">
          ✉️
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Check your email
        </h2>
        <p className="text-sm text-gray-600">
          We sent a sign-in link to <strong>{state.email}</strong>.
        </p>
        <ol className="space-y-1 rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-600">
          <li>1. Open the email from Supabase Auth (check Junk too).</li>
          <li>
            2. Click <strong>Log In</strong> in <strong>this same browser</strong>.
          </li>
          <li>3. You&apos;ll be signed in automatically.</li>
        </ol>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
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
          <input type="hidden" name="intent" value="switch-to-password" />
          <input type="hidden" name="email" value={state.email} />
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-medium text-brand underline hover:text-brand-dark"
          >
            Sign in with password instead (instant, no email needed)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Mode switcher */}
      <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-xs font-medium">
        <form action={action}>
          <input type="hidden" name="intent" value="switch-to-password" />
          <input type="hidden" name="email" value={selectedEmail} />
          <button
            type="submit"
            className={`w-full rounded-md py-1.5 transition ${
              state.mode === "password"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Password (Instant)
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="intent" value="switch-to-link" />
          <input type="hidden" name="email" value={selectedEmail} />
          <button
            type="submit"
            className={`w-full rounded-md py-1.5 transition ${
              state.mode === "link"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Email Magic Link
          </button>
        </form>
      </div>

      {/* Quick-select authorised team member */}
      <div>
        <span className="block text-xs font-medium text-gray-500">
          Authorised team members (click to fill):
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ALLOWED_EMAILS.map((email) => {
            const member = TEAM_MEMBERS[email];
            const active = selectedEmail.toLowerCase() === email;
            return (
              <button
                key={email}
                type="button"
                onClick={() => setSelectedEmail(email)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "border-brand bg-brand/10 text-brand-dark"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {member.fullName}
              </button>
            );
          })}
        </div>
      </div>

      {state.mode === "password" ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="intent" value="password" />
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Safaricom email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              placeholder="smacharia6@safaricom.co.ke"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
              placeholder="Min. 6 characters"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">
              First time signing in? Enter the password you want to use and it
              will be set automatically.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700"
            >
              {error}
            </p>
          )}

          {state.info && (
            <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              {state.info}
            </p>
          )}

          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                const form = new FormData();
                form.append("intent", "switch-to-reset");
                form.append("email", selectedEmail);
                action(form);
              }}
              className="text-xs text-gray-500 hover:text-brand underline"
            >
              Forgot password or need to reset?
            </button>
          </div>
        </form>
      ) : state.mode === "reset" ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="intent" value="reset-password" />
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <strong>Reset Password:</strong> Enter your new password below. It will update your account immediately and sign you in.
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Safaricom email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              placeholder="smacharia6@safaricom.co.ke"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="Enter at least 6 characters"
              className={inputClass}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Updating…" : "Set New Password & Sign In"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                const form = new FormData();
                form.append("intent", "switch-to-password");
                form.append("email", selectedEmail);
                action(form);
              }}
              className="text-xs text-gray-500 hover:text-brand underline"
            >
              Back to Sign in
            </button>
          </div>
        </form>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="intent" value="send-link" />
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Safaricom email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              placeholder="smacharia6@safaricom.co.ke"
              className={inputClass}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Sending link…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}

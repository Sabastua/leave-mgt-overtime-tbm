import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoginShowcase } from "./login-showcase";

const ERRORS: Record<string, string> = {
  unauthorized:
    "Your account is not authorised to access the Leave Management system.",
  link_invalid: "That sign-in link is invalid or has expired. Request a new one.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-[#f4f7f5]">
      {/* Creative Left Showcase Panel */}
      <LoginShowcase />

      {/* Right Authentication Panel */}
      <main className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-12 xl:px-16">
        <div className="w-full max-w-md">
          {/* Mobile-only Branding Header */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00a651] to-[#007a3d] shadow-md ring-1 ring-black/5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                width="26"
                height="26"
                className="text-white"
              >
                <path
                  d="M21 11 C21 8.8 19 7 16 7 C12.7 7 10.5 8.8 10.5 11.5 C10.5 14.2 12.8 15.2 16 16 C19.2 16.8 21.5 17.8 21.5 20.5 C21.5 23.2 19.3 25 16 25 C12.5 25 10.5 23 10.5 20.8"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Safaricom Operations
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Leave &amp; Overtime Management Portal
            </p>
          </div>

          {/* Desktop Form Card Header */}
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Sign in to your account
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Access your corporate leave balance, shifts, and team roster
            </p>
          </div>

          {/* Card Container */}
          <div className="rounded-3xl bg-white p-7 sm:p-9 shadow-xl shadow-gray-200/60 ring-1 ring-black/5">
            {/* searchParams is request data, so read it behind a boundary. */}
            <Suspense fallback={<LoginForm />}>
              <LoginFormWithError searchParams={searchParams} />
            </Suspense>
          </div>

          {/* Bottom Help Text */}
          <div className="mt-6 text-center text-xs text-gray-400">
            <span>Safaricom PLC • Need assistance? Contact your department admin</span>
          </div>
        </div>
      </main>
    </div>
  );
}

async function LoginFormWithError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  const initialError = typeof error === "string" ? ERRORS[error] : undefined;
  return <LoginForm initialError={initialError} />;
}

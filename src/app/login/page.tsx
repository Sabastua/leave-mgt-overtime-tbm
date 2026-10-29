import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  unauthorized:
    "Your account is not authorised to access the Leave Management system.",
  link_invalid: "That sign-in link is invalid or has expired. Request a new code.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const initialError = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            L
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in with your Safaricom email
          </p>
        </div>
        <LoginForm initialError={initialError} />
      </div>
    </main>
  );
}

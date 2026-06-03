import { createFileRoute } from "@tanstack/react-router";
import { SignIn, SignUp } from "@clerk/tanstack-start";
import { useState } from "react";
import { Layers } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/3 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />

      <div className="relative w-full max-w-sm flex flex-col items-center">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm font-semibold">SprintStack</span>
        </Link>

        {mode === "signin" ? (
          <div className="flex flex-col items-center">
            <SignIn routing="hash" fallbackRedirectUrl="/dashboard" signUpUrl={undefined} />
            <button
              onClick={() => setMode("signup")}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              Don't have an account? Sign up
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <SignUp routing="hash" fallbackRedirectUrl="/dashboard" signInUrl={undefined} />
            <button
              onClick={() => setMode("signin")}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

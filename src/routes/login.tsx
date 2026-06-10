import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layers, Loader2, Chrome } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { loginWithGoogle } from "@/lib/auth-server";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

declare global {
  interface Window {
    google?: any;
  }
}

function LoginPage() {
  const { refetchSession, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [sdkLoading, setSdkLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (session) {
      navigate({ to: "/dashboard" });
      return;
    }

    let isMounted = true;

    const initGoogle = () => {
      if (!window.google || !isMounted) return;
      setSdkLoading(false);

      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1234567890-example.apps.googleusercontent.com",
          callback: async (response: any) => {
            if (!isMounted) return;
            setSigningIn(true);
            try {
              const result = await loginWithGoogle({ data: { credential: response.credential } });
              if (result.success) {
                toast.success("Successfully logged in");
                await refetchSession();
                navigate({ to: "/dashboard" });
              } else {
                toast.error(result.error || "Google Sign-In failed");
                setSigningIn(false);
              }
            } catch (err: any) {
              toast.error(err.message || "An error occurred during authentication");
              setSigningIn(false);
            }
          },
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_blue",
            size: "large",
            width: 320,
            text: "signin_with",
            shape: "rectangular",
          });
        }
      } catch (err) {
        console.error("Google SDK Initialization failed:", err);
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [session, navigate, refetchSession]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Background gradients and grid */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/3 left-1/2 h-[450px] w-[650px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute -top-10 -left-10 h-[300px] w-[300px] rounded-full bg-purple-500/5 blur-[80px]" />

      <div className="relative w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-700">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 group transition-all duration-300 hover:scale-105">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/30 group-hover:bg-primary/95 transition-all">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <span className="font-mono text-base font-bold tracking-tight">SprintStack</span>
        </Link>

        {/* Login Container */}
        <div className="w-full rounded-2xl border border-border/40 bg-surface/50 p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome Back</h2>
            <p className="text-xs text-muted-foreground">
              Sign in to manage your workspace, sprints, and tasks
            </p>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[80px] py-4">
            {authLoading || signingIn ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {signingIn ? "Verifying with server..." : "Checking credentials..."}
                </span>
              </div>
            ) : sdkLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                <span className="text-[10px] text-muted-foreground">Loading Google Sign-in...</span>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <div ref={googleBtnRef} className="w-[320px] transition-all hover:scale-[1.01] active:scale-[0.99]" />
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <Chrome className="h-3 w-3 text-primary" /> Securing authentication with Google SSO
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/30 pt-4 text-center">
            <p className="text-[10px] text-muted-foreground leading-normal max-w-xs mx-auto">
              By continuing, you agree to SprintStack's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

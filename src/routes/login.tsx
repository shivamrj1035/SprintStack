import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Chrome, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { loginWithGoogle } from "@/lib/auth-server";
import { useForceLightMode } from "@/hooks/use-force-light-mode";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

declare global {
  interface Window {
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

function WelcomeSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 428 123"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g transform="matrix(1,0,0,1,-6.415,-5.654)">
        <g transform="matrix(1,0,0,1,217.377,69.099)">
          <path
            d="M-188.452,-48.737C-188.452,-48.737,-194.876,41.341,-174.88,37.534C-160.604,34.815,-150.861,-18.684,-150.861,-18.684C-150.861,-18.684,-158.308,40.671,-139.413,37.589C-124.335,35.129,-95.863,-42.443,-115.605,-41.153C-127.671,-40.365,-127.003,16.879,-102.747,24.964C-87.5,30.047,-71.828,19.784,-71.062,8.04C-70.179,-5.502,-88.551,-7.79,-94.211,9.061C-99.415,24.556,-90.415,43.418,-70.73,37.677C-42.63,29.482,-26.705,-13.731,-25.253,-28.982C-23.721,-45.067,-35.466,-46.599,-42.615,-32.301C-49.293,-18.945,-60.282,38.678,-36.232,38.678C-22.97,38.678,-16.117,10.383,-2.148,2.178C7.77,-3.647,14.548,-2.029,14.548,-2.029C14.548,-2.029,-8.324,-0.73,-12.773,17.608C-14.931,26.504,-5.801,46.599,15.027,35.678C34.382,25.529,27.606,2.376,51.708,-0.699C61.488,-1.946,67.989,9.975,67.342,18.38C66.449,29.997,55.47,39.827,44.619,38.295C34.707,36.896,28.36,22.842,32.237,14.423C38.336,1.178,45.491,-0.19,51.708,-0.699C66.853,-1.938,71.06,18.604,79.124,17.623C87.008,16.664,92.418,5.764,92.418,5.764L86.665,37.388C86.665,37.388,98.219,1.19,107.665,2.07C118.394,3.07,112.358,29.353,112.358,29.353C112.358,29.353,122.575,0.435,133.077,2.635C143.241,4.764,127.415,31.733,138.465,37.258C150.888,43.47,178.595,20.299,179.361,8.554C180.245,-4.988,161.872,-7.276,156.212,9.575C151.659,23.134,159.988,38.803,175.587,38.838C185.465,38.86,192.86,33.324,194.876,31.741"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-stroke"
          />
        </g>
      </g>
    </svg>
  );
}

function LoginPage() {
  useForceLightMode();
  const { refetchSession, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [sdkLoading, setSdkLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  // Effect 1: Initialize the Google SDK (sets sdkLoading=false when ready).
  // Does NOT call renderButton here — the ref div isn't in the DOM yet because
  // React hasn't re-rendered with sdkLoading=false. renderButton runs in Effect 2.
  useEffect(() => {
    let isMounted = true;

    const initGoogle = () => {
      if (!window.google || !isMounted) return;
      try {
        window.google.accounts.id.initialize({
          client_id:
            import.meta.env.VITE_GOOGLE_CLIENT_ID ||
            "1234567890-example.apps.googleusercontent.com",
          callback: async (response: { credential: string }) => {
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
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              toast.error(errMsg || "An error occurred during authentication");
              setSigningIn(false);
            }
          },
        });
        setSdkLoading(false);
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
  }, [navigate, refetchSession]);

  // Effect 2: Render the button after React has re-rendered with sdkLoading=false,
  // guaranteeing googleBtnRef.current is the mounted DOM node.
  useEffect(() => {
    if (sdkLoading || !googleBtnRef.current || !window.google) return;
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "filled_blue",
      size: "large",
      width: 300,
      text: "signin_with",
      shape: "pill",
    });
  }, [sdkLoading]);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.07]" />
      <div className="pointer-events-none absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/15 to-transparent blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Logo */}
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/50">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            SprintStack
          </span>
        </Link>

        {/* Card */}
        <div className="w-full overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Animated signature banner */}
          <div className="relative flex items-center justify-center border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent px-6 py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.12),transparent_70%)]" />
            <WelcomeSvg className="relative h-10 w-full max-w-[280px] text-primary opacity-80" />
          </div>

          <div className="space-y-5 p-7">
            <div className="space-y-1 text-center">
              <h2 className="text-[15px] font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="text-[12px] text-muted-foreground">
                Sign in to your workspace, sprints & tasks
              </p>
            </div>

            {/* Auth button area */}
            <div className="flex min-h-[68px] flex-col items-center justify-center">
              {authLoading || signingIn ? (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {signingIn ? "Verifying credentials..." : "Checking session..."}
                  </span>
                </div>
              ) : sdkLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-4 w-4 text-muted-foreground/50 animate-spin" />
                  <span className="text-[10px] text-muted-foreground/60">Loading sign-in...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div
                    ref={googleBtnRef}
                    className="transition-all hover:scale-[1.01] active:scale-[0.99]"
                  />
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                    <Chrome className="h-3 w-3" />
                    <span>Secured by Google SSO</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3.5 py-2.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <p className="text-[10px] text-muted-foreground leading-snug">
                End-to-end encrypted · Your data stays private
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground/50">
          By continuing, you agree to SprintStack's{" "}
          <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground">
            Terms
          </span>
          {" & "}
          <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground">
            Privacy
          </span>
        </p>
      </div>
    </div>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { Toaster } from "@/components/ui/sonner";
import { useFcm } from "@/hooks/use-fcm";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.07] dark:opacity-[0.12]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative z-10 max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Glyph */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-surface shadow-xl shadow-black/10 dark:border-white/[0.06]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-9 w-9 text-muted-foreground/60"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="12"
              cy="17"
              r="0.5"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <p className="mb-1 font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-px active:scale-95"
          >
            Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-surface-2 hover:-translate-y-px active:scale-95 cursor-pointer"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.07] dark:opacity-[0.12]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/6 blur-[100px]" />

      <div className="relative z-10 max-w-md text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 shadow-xl">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-9 w-9 text-destructive"
            aria-hidden="true"
          >
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="mb-1 font-mono text-xs font-semibold tracking-[0.2em] text-destructive uppercase">
          Error
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred. Try refreshing or head back home.
        </p>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-left font-mono text-xs text-destructive-foreground overflow-auto max-h-60 max-w-full">
            <div className="font-bold text-destructive">{error.message || String(error)}</div>
            {error.stack && (
              <pre className="mt-2 whitespace-pre-wrap text-[10px] opacity-75 leading-relaxed overflow-x-auto">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-px active:scale-95 cursor-pointer"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-surface-2 hover:-translate-y-px active:scale-95"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SprintStack — execution OS for tech teams" },
      {
        name: "description",
        content:
          "A lightweight execution OS for tech teams. Tasks, sprints, and timesheets in one dense, keyboard-first workspace.",
      },
      { name: "author", content: "SprintStack" },
      { property: "og:title", content: "SprintStack" },
      { property: "og:description", content: "Execution OS for tech teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SprintStack" },
      { name: "theme-color", content: "#212831" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            var path = window.location.pathname;
            if (path === '/' || path === '/login') return;
            var theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })()
        `,
          }}
        />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function FcmRegistrar() {
  const { session } = useAuth();
  useFcm(session?.id ?? null);
  return null;
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {});
    }
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistrar />
      <AuthProvider>
        <FcmRegistrar />
        <WorkspaceProvider>
          <Outlet />
          <Toaster />
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

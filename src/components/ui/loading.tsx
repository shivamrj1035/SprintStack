interface LoadingProps {
  className?: string;
  variant?: "fullscreen" | "inline";
  message?: string;
}

export function Loading({
  className = "",
  variant = "fullscreen",
  message = "Loading Sprint Stack...",
}: LoadingProps) {
  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
        <div className="relative flex flex-col items-center max-w-xs text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-[40px] scale-150 pointer-events-none" />
            <img
              src="/svgs/Loading_finger_SVG.svg"
              alt="Loading..."
              className="relative w-44 h-44 object-contain"
              style={{ filter: "brightness(1.9) drop-shadow(0 0 18px rgba(109,40,217,0.4))" }}
            />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold tracking-widest text-foreground/90 uppercase">
              Sprint Stack
            </h3>
            <p className="text-[11px] text-muted-foreground/70 tracking-wide font-medium animate-pulse">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-4 ${className}`}>
      <img
        src="/svgs/Loading_finger_SVG.svg"
        alt="Loading..."
        className="w-28 h-28 object-contain"
        style={{ filter: "brightness(1.9) drop-shadow(0 0 12px rgba(109,40,217,0.3))" }}
      />
      {message && (
        <p className="text-[11px] text-muted-foreground/50 tracking-wide font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

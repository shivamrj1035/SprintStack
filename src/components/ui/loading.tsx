import loadingSvg from "@/assets/Loading.svg";

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
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#090D16] z-50 transition-all duration-300">
        <div className="relative flex flex-col items-center max-w-xs text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
          <img
            src={loadingSvg}
            alt="Loading..."
            className="w-40 h-32 object-contain drop-shadow-[0_0_20px_rgba(122,255,251,0.2)]"
          />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold tracking-widest text-foreground/90 uppercase">
              Sprint Stack
            </h3>
            <p className="text-[11px] text-muted-foreground/60 tracking-wide font-medium animate-pulse">
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
        src={loadingSvg}
        alt="Loading..."
        className="w-28 h-24 object-contain drop-shadow-[0_0_12px_rgba(122,255,251,0.12)]"
      />
      {message && (
        <p className="text-[11px] text-muted-foreground/50 tracking-wide font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

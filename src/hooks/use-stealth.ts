import { useState, useEffect, useCallback } from "react";

export function useStealth() {
  const [isStealth, setIsStealthState] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("stealth-mode") === "true";
      setIsStealthState(val);
      if (val) {
        document.documentElement.classList.add("stealth");
      } else {
        document.documentElement.classList.remove("stealth");
      }
    }
  }, []);

  const setStealthMode = useCallback((val: boolean) => {
    setIsStealthState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("stealth-mode", String(val));
      if (val) {
        document.documentElement.classList.add("stealth");
      } else {
        document.documentElement.classList.remove("stealth");
      }
    }
  }, []);

  const toggleStealth = useCallback(() => {
    const next = !isStealth;
    setStealthMode(next);
  }, [isStealth, setStealthMode]);

  useEffect(() => {
    if (!mounted) return;
    const el = document.documentElement;
    if (isStealth) {
      el.classList.add("stealth");
    } else {
      el.classList.remove("stealth");
    }
  }, [isStealth, mounted]);

  useEffect(() => {
    let lastEscPress = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Toggle via Ctrl + Shift + H
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleStealth();
      }

      // 2. Toggle via Double Escape
      if (e.key === "Escape") {
        const now = Date.now();
        if (now - lastEscPress < 300) {
          e.preventDefault();
          toggleStealth();
        }
        lastEscPress = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleStealth]);

  return { isStealth, toggleStealth, setStealthMode };
}

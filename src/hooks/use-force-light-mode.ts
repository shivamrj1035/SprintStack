import { useEffect } from "react";

/**
 * Forces the page into light mode for the lifetime of the component.
 * Restores the user's previous theme when they navigate away.
 * Used on public pages (landing, login) that must always render in light mode.
 */
export function useForceLightMode() {
  useEffect(() => {
    const el = document.documentElement;
    const wasDark = el.classList.contains("dark");
    el.classList.remove("dark");
    return () => {
      if (wasDark) {
        el.classList.add("dark");
      }
    };
  }, []);
}

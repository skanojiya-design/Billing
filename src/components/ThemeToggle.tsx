"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

// Toggles the `dark` class on <html> and persists the choice. The initial class
// is set by an inline script in the root layout to avoid a flash.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label="Toggle dark mode"
    >
      <Icon name={dark ? "sun" : "moon"} className="h-[18px] w-[18px] shrink-0" />
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

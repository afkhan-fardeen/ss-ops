"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ss_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ss_theme", "light");
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-card border border-portal-border bg-portal-bg2 text-portal-text2 transition hover:bg-portal-bg3 hover:text-portal-text"
      aria-label="Toggle theme"
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      {dark ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
    </button>
  );
}

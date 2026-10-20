"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useThemeMode() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return {
    theme: mounted ? (theme ?? "system") : "system",
    resolvedTheme: mounted ? (resolvedTheme ?? "light") : "light",
    isDark,
    toggleTheme,
    setTheme,
    mounted,
  };
}

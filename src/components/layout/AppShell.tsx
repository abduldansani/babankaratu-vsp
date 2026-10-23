"use client";

import { useState, Suspense } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Suspense fallback={null}>
        <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </Suspense>

      <main className="flex-1 pt-18 md:pl-64 transition-all duration-200">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-200">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import { Navbar } from "./Navbar";

export function BaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

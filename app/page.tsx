'use client';

import { useState, useEffect } from "react";
import { ParticlesBackground } from "./components/home/ParticlesBackground";
import { GlowingBackground } from "./components/home/GlowingBackground";
import { FeatureCard } from "./components/home/FeatureCard";
import { StatsCard } from "./components/home/StatsCard";
import { FeatureHighlight } from "./components/home/FeatureHighlight";
import { ScrollIndicator } from "./components/home/ScrollIndicator";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center space-y-16 overflow-hidden">
      {/* Background Effects */}
      <ParticlesBackground />
      <GlowingBackground />
      
      <ScrollIndicator />

      {/* Hero Section */}
      <div className="text-center space-y-8 animate-fade-in z-10 pt-16">
        <h1 className="text-6xl md:text-8xl font-extrabold text-3d tracking-tight">
          Next-Gen AMM DEX
        </h1>
        <p className="text-xl md:text-3xl text-muted-foreground subtitle-3d tracking-wide font-semibold">
          Experience the future of Solana tokens
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="w-full max-w-6xl px-4 z-10">
        <FeatureHighlight />
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-6xl px-4 z-10 pb-16">
        {[
          {
            title: "Create Tokens",
            description: "Launch your Token-2022 with advanced features",
            link: "/create",
            delay: "0s"
          },
          {
            title: "Trade Assets",
            description: "Swap tokens with minimal slippage",
            link: "/swap",
            delay: "0.2s"
          },
          {
            title: "Provide Liquidity",
            description: "Earn fees by providing liquidity",
            link: "/liquidity",
            delay: "0.4s"
          }
        ].map((feature, index) => (
          <div key={index} className="rounded-xl p-6 hover:scale-105 transition-transform duration-300">
            <FeatureCard {...feature} />
          </div>
        ))}
      </div>

      {/* Stats Section */}
      <div className="w-full max-w-6xl px-4 z-4 z-10 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Total Volume", value: "$0M", delay: "0s" },
            { label: "Active Pools", value: "0", delay: "0.1s" },
            { label: "Token-2022 Assets", value: "0", delay: "0.2s" },
            { label: "Total Users", value: "0", delay: "0.3s" }
          ].map((stat, index) => (
            <div key={index} className="rounded-xl p-6 hover:scale-105 transition-transform duration-300">
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

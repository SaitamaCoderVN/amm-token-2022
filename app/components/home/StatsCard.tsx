'use client';

import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface StatsCardProps {
  label: string;
  value: string;
  delay: string;
}

export function StatsCard({ label, value, delay }: StatsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`stats-${label}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [label]);

  return (
    <Card
      id={`stats-${label}`}
      className={`relative p-8 overflow-hidden transition-all duration-500 min-h-[200px] ${
        isHovered ? 'transform scale-[1.02]' : ''
      } ${isInView ? 'animate-fade-in' : 'opacity-0'}`}
      style={{ animationDelay: delay }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative z-10 flex flex-col items-start justify-center h-full">
        <div className="text-4xl font-bold mb-4 tracking-tight">
          {value}
        </div>
        <div className="text-lg text-muted-foreground font-medium">
          {label}
        </div>
      </div>

      {/* Side border */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-[2px] bg-foreground transition-transform duration-500 ${
          isHovered ? 'scale-y-100' : 'scale-y-0'
        }`}
        style={{ transformOrigin: 'top' }}
      />
    </Card>
  );
}

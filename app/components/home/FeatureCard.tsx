'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef } from "react";
import Link from "next/link";

interface FeatureCardProps {
  title: string;
  description: string;
  link: string;
  delay: string;
}

export function FeatureCard({ title, description, link, delay }: FeatureCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <Link href={link} className="block h-full">
      <Card
        ref={cardRef}
        className="relative overflow-hidden group h-full min-h-[300px] animate-fade-in hover:shadow-2xl transition-all duration-500"
        style={{
          animationDelay: delay,
          transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-muted/50" />

        <CardHeader className="p-8">
          <CardTitle className="text-3xl font-bold tracking-tight transition-colors mb-4">
            {title}
          </CardTitle>
          <p className="text-lg text-muted-foreground transition-colors leading-relaxed">
            {description}
          </p>
        </CardHeader>

        <CardContent className="p-8 pt-0">
          <div className="mt-8 flex items-center text-base font-medium opacity-0 group-hover:opacity-100 transition-all duration-500">
            Learn more <span className="ml-3 transition-transform group-hover:translate-x-2">→</span>
          </div>
        </CardContent>

        {/* Side border */}
        <div
          className="absolute top-0 bottom-0 left-0 w-[2px] bg-foreground transform scale-y-0 group-hover:scale-y-100 transition-transform duration-500"
          style={{ transformOrigin: 'top' }}
        />
      </Card>
    </Link>
  );
}

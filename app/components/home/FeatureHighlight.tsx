'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

const features = [
  {
    title: 'Transfer Fees',
    description: 'Automatically collect fees on token transfers. Implement flexible fee structures and distribute revenue among stakeholders seamlessly.',
    color: 'from-zinc-900/20 to-zinc-800/40 dark:from-zinc-200/20 dark:to-zinc-100/40'
  },
  {
    title: 'Interest Bearing',
    description: 'Tokens that automatically accrue interest over time. Perfect for DeFi applications and yield-generating assets on Solana.',
    color: 'from-zinc-800/20 to-zinc-700/40 dark:from-zinc-300/20 dark:to-zinc-200/40'
  },
  {
    title: 'Non-Transferable',
    description: 'Create soulbound tokens that cannot be transferred between wallets. Ideal for credentials, memberships, and identity verification.',
    color: 'from-zinc-700/20 to-zinc-600/40 dark:from-zinc-400/20 dark:to-zinc-300/40'
  },
  {
    title: 'Transfer Hooks',
    description: 'Execute custom logic on token transfers. Build complex token mechanics and integrate with other protocols automatically.',
    color: 'from-zinc-600/20 to-zinc-500/40 dark:from-zinc-500/20 dark:to-zinc-400/40'
  }
];

export function FeatureHighlight() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getCardStyle = (index: number) => {
    const totalCards = features.length;
    const circle = 2 * Math.PI;
    const angleStep = circle / totalCards;
    const angle = ((index - activeIndex + totalCards) % totalCards) * angleStep;
    
    const radius = 400; // Radius of the circular path
    const zOffset = -200; // Base Z offset to push cards back

    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle) + zOffset;
    
    // Calculate opacity and scale based on z position
    const opacity = (z - zOffset) / radius * 0.5 + 0.5;
    const scale = (z - zOffset) / radius * 0.3 + 0.7;

    return {
      transform: `translate3d(${x}px, 0, ${z}px) scale(${scale})`,
      opacity: opacity,
      zIndex: Math.round(opacity * 100),
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16">
      <div className="relative h-[600px] carousel-container">
        {features.map((feature, index) => {
          const isActive = activeIndex === index;
          const style = getCardStyle(index);
          
          return (
            <Card
              key={index}
              className={`
                carousel-item relative overflow-hidden border-2 border-border/50 
                bg-background/80 backdrop-blur-sm transition-all duration-800 ease-out
                transform-gpu
                ${isActive ? 'active ring-2 ring-ring/20' : ''}
              `}
              style={{
                ...style,
                height: '300px',
                left: '25%', // Center the cards horizontally
                top: '50%', // Center the cards vertically
                transform: `${style.transform} translateY(-50%)`,
                transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              {/* Background gradient with 3D effect */}
              <div
                className={`
                  absolute inset-0 bg-gradient-to-br ${feature.color}
                  opacity-0 transition-opacity duration-800 ease-out
                  ${isActive ? 'opacity-100' : ''}
                `}
              />

              {/* Content with 3D hover effect */}
              <div className="relative h-full p-8 flex flex-col justify-center text-center">
                <h3 className="text-2xl font-bold mb-4 tracking-tight text-3d">
                  {feature.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed subtitle-3d">
                  {feature.description}
                </p>
              </div>

              {/* 3D border effects */}
              <div className="absolute inset-0 border-2 border-border/20" />
              <div className="absolute inset-0 border border-border/10" />
              
              {/* Bottom gradient line */}
              <div
                className={`
                  absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${feature.color}
                  transform-gpu origin-left transition-transform duration-800 ease-out
                  ${isActive ? 'scale-x-100' : 'scale-x-0'}
                `}
              />
            </Card>
          );
        })}

        {/* Navigation buttons */}
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 transition-all duration-400 ease-out"
          onClick={() => setActiveIndex((prev) => (prev - 1 + features.length) % features.length)}
        >
          ←
        </button>
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 transition-all duration-400 ease-out"
          onClick={() => setActiveIndex((prev) => (prev + 1) % features.length)}
        >
          →
        </button>
      </div>
    </div>
  );
}

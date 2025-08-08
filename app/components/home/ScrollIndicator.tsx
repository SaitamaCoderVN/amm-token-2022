'use client';

import { useEffect, useState } from 'react';

export function ScrollIndicator() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);

      // Hide/show based on scroll direction
      setIsVisible(window.scrollY < lastScrollY || window.scrollY < 100);
      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-x-0' : 'translate-x-16'
      }`}
    >
      <div className="relative h-48 w-[2px] bg-border rounded-full overflow-hidden">
        {/* Progress bar */}
        <div
          className="absolute bottom-0 w-full bg-foreground rounded-full transition-all duration-300"
          style={{ height: `${scrollProgress}%` }}
        />

        {/* Dots */}
        {[0, 33, 66, 100].map((position) => (
          <div
            key={position}
            className={`absolute w-2 h-2 -left-[3px] transition-all duration-300 ${
              scrollProgress >= position ? 'scale-100' : 'scale-75'
            }`}
            style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
          >
            <div
              className={`w-full h-full rounded-full transition-all duration-300 ${
                scrollProgress >= position
                  ? 'bg-foreground'
                  : 'bg-border'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

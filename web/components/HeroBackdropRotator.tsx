"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type HeroBackdropItem = {
  title: string;
  src: string;
};

type HeroBackdropRotatorProps = {
  items: HeroBackdropItem[];
  intervalMs?: number;
};

export default function HeroBackdropRotator({
  items,
  intervalMs = 6500,
}: HeroBackdropRotatorProps) {
  const safeItems = useMemo(
    () =>
      items.filter(
        (item) => typeof item.src === "string" && item.src.trim().length > 0
      ),
    [items]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (safeItems.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);
  }, [safeItems.length, safeItems[0]?.src]);

  useEffect(() => {
    if (safeItems.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeItems.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, safeItems.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        setOffset(window.scrollY * 0.22);
        tickingRef.current = false;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (safeItems.length === 0) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.05),transparent_22%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.10),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.50),rgba(0,0,0,0.18),rgba(0,0,0,0.42))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.30),rgba(0,0,0,0.52),rgba(0,0,0,0.88))]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {safeItems.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={`${item.title}-${item.src}`}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!isActive}
          >
            <div
              className="absolute inset-[-3%] bg-cover bg-[center_22%] bg-no-repeat brightness-[1.12] contrast-[1.08] saturate-[1.04] will-change-transform"
              style={{
                backgroundImage: `url("${item.src}")`,
                transform: `scale(1.07) translateY(${offset}px)`,
              }}
            />

            <div
              className="absolute inset-[-4%] bg-cover bg-[center_22%] bg-no-repeat opacity-20 blur-[22px] will-change-transform"
              style={{
                backgroundImage: `url("${item.src}")`,
                transform: `scale(1.1) translateY(${offset * 0.55}px)`,
              }}
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_28%,transparent_0%,transparent_26%,rgba(0,0,0,0.14)_56%,rgba(0,0,0,0.34)_100%)]" />
          </div>
        );
      })}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_34%,rgba(0,0,0,0.34),transparent_28%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(0,0,0,0.26),transparent_24%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.05),transparent_20%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.56),rgba(0,0,0,0.22),rgba(0,0,0,0.40))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.22),rgba(0,0,0,0.42),rgba(0,0,0,0.86))]" />
      <div className="absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-black via-black/88 to-transparent" />

      {safeItems.length > 1 && (
        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
          {safeItems.map((item, index) => (
            <div
              key={`${item.title}-dot`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === activeIndex ? "w-8 bg-white" : "w-1.5 bg-white/35"
              }`}
              aria-label={item.title}
              title={item.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({ children, className = "", variant = "up", delay = 0 }: { children: ReactNode; className?: string; variant?: "up" | "left" | "right" | "scale"; delay?: number }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    document.documentElement.classList.add("motion-ready");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          element.classList.add("is-visible");
          observer.unobserve(element);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={elementRef} className={`reveal-pending reveal-${variant} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

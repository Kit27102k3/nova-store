"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      enter="route-enter"
      exit="route-exit"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

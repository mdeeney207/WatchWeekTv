"use client";

import type { ReactNode } from "react";
import { useHomepageAuthModal } from "@/components/auth/HomepageAuthShell";

type AuthMode = "login" | "signup";

export default function AuthOpenButton({
  children,
  className,
  mode = "signup",
}: {
  children: ReactNode;
  className?: string;
  mode?: AuthMode;
}) {
  const { openAuth } = useHomepageAuthModal();

  return (
    <button
      type="button"
      onClick={() => openAuth(mode)}
      className={className}
    >
      {children}
    </button>
  );
}
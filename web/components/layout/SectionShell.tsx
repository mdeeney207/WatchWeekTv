import type { ReactNode } from "react";
import Link from "next/link";

type SectionShellProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionShell({
  title,
  subtitle,
  actionLabel,
  actionHref,
  action,
  children,
  className = "",
  contentClassName = "",
}: SectionShellProps) {
  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[clamp(1.25rem,2vw,1.75rem)] font-semibold tracking-tight text-white">
              {title}
            </h2>

            {subtitle ? (
              <p className="mt-1 text-sm text-slate-400 sm:text-[15px]">
                {subtitle}
              </p>
            ) : null}
          </div>

          {action ? (
            <div className="shrink-0">{action}</div>
          ) : actionLabel && actionHref ? (
            <Link
              href={actionHref}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>

        <div className={contentClassName}>{children}</div>
      </div>
    </section>
  );
}
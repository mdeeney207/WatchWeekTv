type StatusBadgeTone =
  | "live"
  | "tonight"
  | "soon"
  | "new"
  | "neutral"
  | "provider";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  className?: string;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  live: "border-red-500/25 bg-red-500/15 text-red-200",
  tonight: "border-emerald-500/25 bg-emerald-500/15 text-emerald-200",
  soon: "border-amber-500/25 bg-amber-500/15 text-amber-200",
  new: "border-sky-500/25 bg-sky-500/15 text-sky-200",
  neutral: "border-white/10 bg-white/[0.06] text-white/80",
  provider: "border-white/10 bg-slate-900/80 text-white",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {tone === "live" ? (
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
        </span>
      ) : null}
      {label}
    </span>
  );
}
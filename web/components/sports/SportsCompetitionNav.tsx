import Link from "next/link";

type CompetitionItem = {
  slug: string;
  label: string;
  emoji: string;
  href?: string;
};

const defaultCompetitions: CompetitionItem[] = [
  { slug: "world-cup", label: "World Cup", emoji: "⚽" },
  { slug: "nfl", label: "NFL", emoji: "🏈" },
  { slug: "nba", label: "NBA", emoji: "🏀" },
  { slug: "mlb", label: "MLB", emoji: "⚾" },
  { slug: "tennis", label: "Tennis", emoji: "🎾" },
  { slug: "formula-1", label: "Formula 1", emoji: "🏎" },
];

type SportsCompetitionNavProps = {
  competitions?: CompetitionItem[];
  activeSlug?: string | null;
};

export function SportsCompetitionNav({
  competitions = defaultCompetitions,
  activeSlug,
}: SportsCompetitionNavProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#0B0F14] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0B0F14] to-transparent" />

        <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 py-4 sm:px-5">
          {competitions.map((competition) => {
            const href = competition.href ?? `/sports/${competition.slug}`;
            const isActive = activeSlug === competition.slug;

            return (
              <Link
                key={competition.slug}
                href={href}
                className={[
                  "group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                <span className="text-base leading-none">{competition.emoji}</span>
                <span className="whitespace-nowrap">{competition.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
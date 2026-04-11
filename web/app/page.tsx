import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import HomepageAuthShell from "@/components/auth/HomepageAuthShell";
import AuthOpenButton from "@/components/auth/AuthOpenButton";
import { tmdbGetTrendingTv, type TmdbTrendingTvResult } from "@/lib/tmdb";
import { getServerLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/getDictionary";

type AccentTone = "default" | "muted";

type ProviderItem = {
  name: string;
  logo: string;
};

const providers: ProviderItem[] = [
  { name: "Netflix", logo: "/service-logos/netflix-site-white.png" },
  { name: "Hulu", logo: "/service-logos/hulu-site-white.png" },
  { name: "Max", logo: "/service-logos/max-site-white.png" },
  { name: "Prime Video", logo: "/service-logos/prime-video-site-white.png" },
  { name: "Disney+", logo: "/service-logos/disney-plus-site-white.png" },
  { name: "Apple TV+", logo: "/service-logos/apple-tv-plus-site-white.png" },
  { name: "Peacock", logo: "/service-logos/peacock-site-white.png" },
  { name: "Paramount+", logo: "/service-logos/paramount-plus-site-white.png" },
];

function SectionEyebrow({
  children,
  accent = "default",
}: {
  children: ReactNode;
  accent?: AccentTone;
}) {
  const tone = accent === "muted" ? "text-zinc-300/80" : "text-zinc-500";

  return (
    <div className={`text-[11px] uppercase tracking-[0.24em] ${tone}`}>
      {children}
    </div>
  );
}

function AccentDot() {
  return <span className="hidden text-zinc-700 sm:inline">•</span>;
}

function InfoPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "bright";
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-[12px] font-medium backdrop-blur",
        tone === "bright"
          ? "border-white/14 bg-white/[0.08] text-white"
          : "border-white/10 bg-white/[0.05] text-zinc-100",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function ProviderLogoChip({
  name,
  logo,
}: {
  name: string;
  logo: string;
}) {
  return (
    <div className="group relative flex h-[46px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] px-4 transition duration-200 hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.026))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
      <div className="relative flex h-full w-full items-center justify-center">
        <img
          src={logo}
          alt={name}
          className="h-[18px] w-auto max-w-[112px] object-contain opacity-95 transition group-hover:opacity-100"
          loading="lazy"
          draggable={false}
        />
      </div>
    </div>
  );
}

function ValueCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.88)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">
        {eyebrow}
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {title}
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-300">{body}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-6 md:p-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {step}
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{description}</p>
    </div>
  );
}

function HeroFeatureCard({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {eyebrow}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{title}</div>
    </div>
  );
}

function formatYear(value?: string) {
  if (!value) return null;
  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

function clampOverview(
  value: string | undefined,
  fallbackText: string,
  max = 180
) {
  if (!value) {
    return fallbackText;
  }

  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function pickFeatured(
  items: TmdbTrendingTvResult[]
): TmdbTrendingTvResult | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    items.find((item) => item.backdropUrl && item.posterUrl) ??
    items.find((item) => item.backdropUrl) ??
    items.find((item) => item.posterUrl) ??
    items[0] ??
    null
  );
}

export default async function Page() {
  const locale = await getServerLocale();
  const messages = getDictionary(locale);

  let featured: TmdbTrendingTvResult | null = null;

  try {
    const trending = await tmdbGetTrendingTv(12, "day");
    featured = pickFeatured(trending);
  } catch {
    featured = null;
  }

  const heroTitle = featured?.title || "WatchWeek";
  const heroOverview = clampOverview(
    featured?.overview,
    messages.homepage.featured.fallbackOverview
  );
  const heroBackdrop = featured?.backdropUrl || null;
  const heroPoster = featured?.posterUrl || null;
  const heroYear = formatYear(featured?.firstAirDate);
  const heroScore =
    typeof featured?.voteAverage === "number"
      ? featured.voteAverage.toFixed(1)
      : null;

  return (
    <HomepageAuthShell>
      <main className="min-h-screen overflow-x-hidden bg-black text-white">
        <section className="relative isolate overflow-hidden border-b border-white/6">
          {heroBackdrop ? (
            <>
              <div className="absolute inset-0">
                <Image
                  src={heroBackdrop}
                  alt={heroTitle}
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="100vw"
                />
              </div>

              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.90)_24%,rgba(0,0,0,0.68)_56%,rgba(0,0,0,0.88)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.28)_46%,rgba(0,0,0,0.86)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(56,189,248,0.08),transparent_26%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.04),transparent_24%)]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,5,5,1),rgba(10,10,12,0.98),rgba(16,18,22,1))]" />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(5,7,11,0.88),rgba(5,7,11,0))]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,0.92))]" />

          <div className="relative mx-auto max-w-7xl px-6 pb-18 pt-16 md:pb-20 md:pt-20 xl:pb-24 xl:pt-24">
            <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,1.02fr)_520px] xl:gap-12">
              <div className="max-w-4xl">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-100 backdrop-blur">
                  {messages.homepage.hero.badge}
                </div>

                <h1 className="mt-7 max-w-5xl text-5xl font-semibold leading-[0.94] tracking-tight text-white sm:text-6xl md:text-7xl xl:text-[5.1rem]">
                  {messages.homepage.hero.titleLine1}
                  <span className="block">
                    {messages.homepage.hero.titleLine2}
                  </span>
                </h1>

                <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-200 md:text-xl">
                  {messages.homepage.hero.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <AuthOpenButton
                    mode="signup"
                    className="inline-flex h-12 items-center rounded-2xl bg-white px-6 text-sm font-semibold text-black shadow-[0_18px_45px_-18px_rgba(255,255,255,0.35)] transition hover:scale-[1.01] hover:opacity-95"
                  >
                    {messages.homepage.hero.primaryCta}
                  </AuthOpenButton>

                  <Link
                    href="/calendar"
                    className="inline-flex h-12 items-center rounded-2xl border border-white/10 bg-white/[0.05] px-6 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[0.09]"
                  >
                    {messages.homepage.hero.secondaryCta}
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <InfoPill tone="bright">
                    {messages.homepage.hero.pills.fullAccess}
                  </InfoPill>
                  <InfoPill>
                    {messages.homepage.hero.pills.freeShowsAfterTrial}
                  </InfoPill>
                  <InfoPill>{messages.homepage.hero.pills.upgradeLater}</InfoPill>
                </div>

                <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-300">
                  <span>{messages.homepage.hero.bullets.watchlist}</span>
                  <AccentDot />
                  <span>{messages.homepage.hero.bullets.dropsTonight}</span>
                  <AccentDot />
                  <span>{messages.homepage.hero.bullets.openFaster}</span>
                </div>

                <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 md:max-w-[760px]">
                  {providers.map((provider) => (
                    <ProviderLogoChip
                      key={provider.name}
                      name={provider.name}
                      logo={provider.logo}
                    />
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_58%)] blur-2xl" />
                <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,7,8,0.84),rgba(7,7,8,0.72))] shadow-[0_36px_100px_-48px_rgba(0,0,0,0.98)] backdrop-blur-md">
                  <div className="border-b border-white/10 px-5 py-4 md:px-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                          {messages.homepage.featured.eyebrow}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {messages.homepage.featured.title}
                        </div>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-100">
                        {messages.homepage.featured.tag}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-0 md:grid-cols-[190px_minmax(0,1fr)]">
                    <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r md:p-5">
                      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] shadow-[0_22px_50px_-30px_rgba(0,0,0,0.9)]">
                        {heroPoster ? (
                          <div className="relative aspect-[2/3] w-full">
                            <Image
                              src={heroPoster}
                              alt={heroTitle}
                              fill
                              className="object-cover"
                              sizes="190px"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[2/3] items-center justify-center bg-white/[0.04] text-sm text-zinc-500">
                            WatchWeek
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-100">
                          {messages.homepage.featured.seriesBadge}
                        </span>

                        {heroYear ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                            {heroYear}
                          </span>
                        ) : null}

                        {heroScore ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                            TMDB {heroScore}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
                        {heroTitle}
                      </div>

                      <p className="mt-4 text-sm leading-7 text-zinc-300">
                        {heroOverview}
                      </p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <HeroFeatureCard
                          eyebrow={
                            messages.homepage.featured.featureCards.trackEyebrow
                          }
                          title={messages.homepage.featured.featureCards.trackTitle}
                        />
                        <HeroFeatureCard
                          eyebrow={
                            messages.homepage.featured.featureCards.planEyebrow
                          }
                          title={messages.homepage.featured.featureCards.planTitle}
                        />
                        <HeroFeatureCard
                          eyebrow={
                            messages.homepage.featured.featureCards.launchEyebrow
                          }
                          title={messages.homepage.featured.featureCards.launchTitle}
                        />
                      </div>

                      <div className="mt-6 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                          {messages.homepage.featured.whyEyebrow}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-zinc-200">
                          {messages.homepage.featured.whyBody}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <AuthOpenButton
                          mode="signup"
                          className="inline-flex h-11 items-center rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.01] hover:opacity-95"
                        >
                          {messages.homepage.featured.primaryCta}
                        </AuthOpenButton>

                        <Link
                          href="/calendar"
                          className="inline-flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                        >
                          {messages.homepage.featured.secondaryCta}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow accent="muted">
                  {messages.homepage.reasons.eyebrow}
                </SectionEyebrow>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  {messages.homepage.reasons.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
                  {messages.homepage.reasons.description}
                </p>
              </div>

              <AuthOpenButton
                mode="signup"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                {messages.homepage.reasons.cta}
              </AuthOpenButton>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <ValueCard
                eyebrow={messages.homepage.reasons.cards.tonight.eyebrow}
                title={messages.homepage.reasons.cards.tonight.title}
                body={messages.homepage.reasons.cards.tonight.body}
              />
              <ValueCard
                eyebrow={messages.homepage.reasons.cards.week.eyebrow}
                title={messages.homepage.reasons.cards.week.title}
                body={messages.homepage.reasons.cards.week.body}
              />
              <ValueCard
                eyebrow={messages.homepage.reasons.cards.launch.eyebrow}
                title={messages.homepage.reasons.cards.launch.title}
                body={messages.homepage.reasons.cards.launch.body}
              />
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow accent="muted">
                {messages.homepage.how.eyebrow}
              </SectionEyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {messages.homepage.how.title}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
                {messages.homepage.how.description}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <StepCard
                step={messages.homepage.how.steps.one.step}
                title={messages.homepage.how.steps.one.title}
                description={messages.homepage.how.steps.one.description}
              />
              <StepCard
                step={messages.homepage.how.steps.two.step}
                title={messages.homepage.how.steps.two.title}
                description={messages.homepage.how.steps.two.description}
              />
              <StepCard
                step={messages.homepage.how.steps.three.step}
                title={messages.homepage.how.steps.three.title}
                description={messages.homepage.how.steps.three.description}
              />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-100">
              {messages.homepage.finalCta.badge}
            </div>

            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              {messages.homepage.finalCta.title}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-200 md:text-base">
              {messages.homepage.finalCta.description}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <InfoPill tone="bright">
                {messages.homepage.hero.pills.fullAccess}
              </InfoPill>
              <InfoPill>
                {messages.homepage.hero.pills.freeShowsAfterTrial}
              </InfoPill>
              <InfoPill>{messages.homepage.hero.pills.upgradeLater}</InfoPill>
            </div>

            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <AuthOpenButton
                mode="signup"
                className="inline-flex h-12 items-center rounded-2xl bg-white px-6 text-sm font-semibold text-black shadow-[0_18px_45px_-18px_rgba(255,255,255,0.35)] transition hover:scale-[1.01] hover:opacity-95"
              >
                {messages.homepage.finalCta.primaryCta}
              </AuthOpenButton>

              <Link
                href="/calendar"
                className="inline-flex h-12 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                {messages.homepage.finalCta.secondaryCta}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </HomepageAuthShell>
  );
}
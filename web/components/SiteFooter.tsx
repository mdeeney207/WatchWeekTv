// components/SiteFooter.tsx
"use client";

import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

const footerSections: Array<{
  title: string;
  links: FooterLink[];
}> = [
  {
    title: "Browse",
    links: [
      { label: "TV Shows", href: "/tv" },
      { label: "Movies", href: "/movies" },
      { label: "Calendar", href: "/calendar" },
      { label: "Trending", href: "/trending" },
      { label: "My Stuff", href: "/my-stuff" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "How WatchWeek Works", href: "/about" },
      { label: "Plans & Pricing", href: "/pricing" },
      { label: "Supported Devices", href: "/devices" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/support" },
      { label: "Account & Billing", href: "/support#billing" },
      { label: "Contact Support", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About WatchWeek", href: "/about" },
      { label: "Press", href: "/press" },
      { label: "Jobs", href: "/jobs" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-white/10 bg-[#081018]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-12 border-b border-white/10 pb-10 lg:grid-cols-[1.15fr_repeat(5,minmax(0,1fr))]">
          <div className="max-w-[260px]">
            <Link
              href="/"
              className="inline-flex items-center text-[18px] font-semibold tracking-tight text-white transition hover:text-white/90"
            >
              WatchWeek
            </Link>

            <p className="mt-4 text-sm leading-7 text-white/52">
              Track what’s streaming, when it drops, and where to watch it.
            </p>
          </div>

          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
                {section.title}
              </h2>

              <ul className="mt-5 space-y-3.5">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-white/68 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-4 pt-6 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} WatchWeek. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy"
              className="transition-colors duration-200 hover:text-white/75"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors duration-200 hover:text-white/75"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="transition-colors duration-200 hover:text-white/75"
            >
              Support
            </Link>
            <Link
              href="/contact"
              className="transition-colors duration-200 hover:text-white/75"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
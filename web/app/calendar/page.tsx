// web/app/calendar/page.tsx
import CalendarShellClient from "./CalendarShellClient";
import { getServerLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function CalendarPage() {
  const locale = await getServerLocale();
  const messages = getDictionary(locale);

  return (
    <main className="min-h-screen bg-black pt-12 pb-12 md:pt-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-white">
              {messages.calendar.page.title}
            </h1>
            <p className="mt-1.5 text-sm text-white/60 md:text-base">
              {messages.calendar.page.description}
            </p>
          </div>
        </div>

        <div className="mt-4 md:mt-5">
          <CalendarShellClient />
        </div>
      </div>
    </main>
  );
}
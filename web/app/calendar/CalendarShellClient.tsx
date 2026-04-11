// web/app/calendar/CalendarShellClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import CalendarClient from "./CalendarClient";
import CalendarTimelineClient from "./CalendarTimelineClient";

type Tab = "timeline" | "week" | "month";

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 rounded-full px-4 text-sm font-semibold ring-1 transition",
        active
          ? "bg-white text-black ring-white/20"
          : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function tabMeta(tab: Tab) {
  switch (tab) {
    case "timeline":
      return {
        eyebrow: "Release feed",
        summary: "Tonight → next 14 days",
      };
    case "week":
      return {
        eyebrow: "Weekly view",
        summary: "This week at a glance",
      };
    case "month":
      return {
        eyebrow: "Monthly view",
        summary: "Release calendar",
      };
    default:
      return {
        eyebrow: "",
        summary: "",
      };
  }
}

export default function CalendarShellClient() {
  const [tab, setTab] = useState<Tab>("timeline");
  const meta = useMemo(() => tabMeta(tab), [tab]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TabButton
            active={tab === "timeline"}
            label="Timeline"
            onClick={() => setTab("timeline")}
          />
          <TabButton
            active={tab === "week"}
            label="Week"
            onClick={() => setTab("week")}
          />
          <TabButton
            active={tab === "month"}
            label="Month"
            onClick={() => setTab("month")}
          />
        </div>

        <div className="ml-auto text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            {meta.eyebrow}
          </div>
          <div className="mt-1 text-xs text-white/55">{meta.summary}</div>
        </div>
      </div>

      {tab === "timeline" ? (
        <CalendarTimelineClient />
      ) : tab === "week" ? (
        <CalendarClient forcedView="timeGridWeek" key="timeGridWeek" />
      ) : (
        <CalendarClient forcedView="dayGridMonth" key="dayGridMonth" />
      )}
    </div>
  );
}
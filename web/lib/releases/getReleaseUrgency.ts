export type ReleaseUrgencyTone = "urgent" | "live" | "soon" | "neutral";

export type ReleaseUrgency = {
  label: string;
  tone: ReleaseUrgencyTone;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatReleaseLocal(dtIso: string) {
  try {
    return new Date(dtIso).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dtIso;
  }
}

export function formatReleaseTime(dtIso: string) {
  try {
    return new Date(dtIso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function localReleaseDateKey(dtIso: string) {
  const d = new Date(dtIso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getCountdownParts(targetIso: string, nowMs: number) {
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return null;

  const diffMs = targetMs - nowMs;
  const absMs = Math.abs(diffMs);

  const minutes = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const minsRemainder = minutes % 60;

  return {
    diffMs,
    targetMs,
    minutes,
    hours,
    minsRemainder,
  };
}

export function getReleaseUrgency(dtIso: string, now: Date): ReleaseUrgency {
  const parts = getCountdownParts(dtIso, now.getTime());

  if (!parts) {
    return {
      label: formatReleaseTime(dtIso) || "Time TBD",
      tone: "neutral",
    };
  }

  const target = new Date(parts.targetMs);
  const sameDay = isSameDay(target, now);
  const tomorrow = isSameDay(target, addDays(now, 1));

  if (parts.diffMs > 0 && parts.diffMs <= 1000 * 60 * 60 * 12 && sameDay) {
    if (parts.hours <= 0) {
      const mins = Math.max(1, parts.minutes);
      return {
        label: `Drops in ${mins}m`,
        tone: "urgent",
      };
    }

    return {
      label: `Drops in ${parts.hours}h ${parts.minsRemainder}m`,
      tone: "urgent",
    };
  }

  if (parts.diffMs <= 0 && Math.abs(parts.diffMs) <= 1000 * 60 * 90 && sameDay) {
    return {
      label: "Live now",
      tone: "live",
    };
  }

  if (parts.diffMs > 0 && tomorrow) {
    return {
      label: `Tomorrow • ${formatReleaseTime(dtIso) || "Time TBD"}`,
      tone: "soon",
    };
  }

  if (sameDay) {
    return {
      label: formatReleaseTime(dtIso) || "Time TBD",
      tone: "soon",
    };
  }

  return {
    label: formatReleaseLocal(dtIso),
    tone: "neutral",
  };
}

export function urgencyClassName(tone: ReleaseUrgencyTone) {
  switch (tone) {
    case "urgent":
      return "bg-amber-400/12 text-amber-200 ring-amber-300/20";
    case "live":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-300/20";
    case "soon":
      return "bg-sky-400/12 text-sky-200 ring-sky-300/20";
    case "neutral":
    default:
      return "bg-white/[0.06] text-white/70 ring-white/10";
  }
}

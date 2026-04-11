import * as React from "react";

export type ProviderBadgeKind =
  | "streaming_home"
  | "streaming_subscription"
  | "streaming_avod"
  | "broadcast_network"
  | "live_tv_carrier"
  | "sports_add_on"
  | "regional_sports_network"
  | "unknown";

type ProviderBadgeProps = {
  name?: string | null;
  kind?: ProviderBadgeKind | string | null;
  className?: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getKindLabel(kind?: string | null) {
  switch (kind) {
    case "streaming_home":
      return "Streaming";
    case "streaming_subscription":
      return "Subscription";
    case "streaming_avod":
      return "Free Streaming";
    case "broadcast_network":
      return "Broadcast";
    case "live_tv_carrier":
      return "Live TV";
    case "sports_add_on":
      return "Sports Add-on";
    case "regional_sports_network":
      return "Regional Sports";
    default:
      return null;
  }
}

export function ProviderBadge({
  name,
  kind,
  className,
}: ProviderBadgeProps) {
  if (!name?.trim()) return null;

  const kindLabel = getKindLabel(kind);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-2.5 py-1 text-[11px] font-medium text-white/82",
        className,
      )}
    >
      <span className="max-w-[140px] truncate">{name}</span>
      {kindLabel ? (
        <>
          <span className="text-white/30">•</span>
          <span className="text-white/56">{kindLabel}</span>
        </>
      ) : null}
    </span>
  );
}

export default ProviderBadge;
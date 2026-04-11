export function getWatchButtonLabel(
  availabilityType: string | null | undefined
): string {
  switch (String(availabilityType ?? "").trim().toLowerCase()) {
    case "live_event":
      return "Watch Live";
    case "highlight":
    case "highlights":
      return "Watch Highlights";
    case "replay":
      return "Watch Replay";
    default:
      return "Open";
  }
}
export function mapProviderKindToUi(value: string | null | undefined): string {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "broadcast_network":
      return "Broadcast";
    case "cable_network":
      return "Cable";
    case "authenticated_app":
      return "TV App";
    case "streaming_subscription":
      return "Streaming";
    case "streaming_avod":
      return "Free Streaming";
    case "live_tv_carrier":
      return "Live TV";
    default:
      return "Watch";
  }
}
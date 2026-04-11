import Image from "next/image";

const PROVIDER_META: Record<
  string,
  {
    label: string;
  }
> = {
  netflix: { label: "Netflix" },
  hulu: { label: "Hulu" },
  max: { label: "Max" },
  "prime-video": { label: "Prime Video" },
  "disney-plus": { label: "Disney+" },
  "apple-tv-plus": { label: "Apple TV+" },
  peacock: { label: "Peacock" },
  "paramount-plus": { label: "Paramount+" },
};

function labelFromSlug(slug: string) {
  return (
    PROVIDER_META[slug]?.label ??
    slug
      .split("-")
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
      .join(" ")
  );
}

export default function ProviderLogo({
  slug,
  showLabel = false,
  size = "md",
}: {
  slug: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const src =
    "https://ojyoekltynijpqvkejpb.supabase.co/storage/v1/object/public/service-logos/" +
    slug +
    ".svg";

  const label = labelFromSlug(slug);

  const iconSize = size === "sm" ? 16 : 18;
  const wrapperClass =
    size === "sm"
      ? "h-9 gap-2 rounded-full px-3 text-xs"
      : "h-10 gap-2.5 rounded-full px-3.5 text-sm";

  return (
    <div
      className={[
        "inline-flex items-center bg-white/[0.055] text-zinc-100 ring-1 ring-white/10",
        "backdrop-blur-sm transition hover:bg-white/[0.08] hover:ring-white/15",
        wrapperClass,
      ].join(" ")}
      title={label}
      aria-label={label}
    >
      <div
        className="relative shrink-0"
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src={src}
          alt={label}
          width={iconSize}
          height={iconSize}
          className="object-contain"
          style={{ width: "100%", height: "auto" }}
          unoptimized
        />
      </div>

      {showLabel ? (
        <span className="whitespace-nowrap font-medium text-zinc-200">
          {label}
        </span>
      ) : null}
    </div>
  );
}
"use client";

import React from "react";
import PosterTile from "@/components/PosterTile";

type ContinueWatchingTileProps = {
  title: string;
  img?: string;
  provider: string;
  meta?: string;
  schedule?: string;
  urgency?: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

export default function ContinueWatchingTile({
  title,
  img,
  provider,
  meta,
  schedule,
  urgency,
  onPrimary,
  onSecondary,
}: ContinueWatchingTileProps) {
  const resolvedMeta =
    [meta, schedule].filter(Boolean).join(" • ") || undefined;

  return (
    <PosterTile
      variant="queue"
      title={title}
      posterUrl={img}
      provider={provider}
      meta={resolvedMeta}
      rightMeta={urgency}
      primaryLabel="Resume"
      secondaryLabel="Remove"
      onPrimary={onPrimary}
      onSecondary={onSecondary}
    />
  );
}
import React from "react";
import { View, Text } from "react-native";
import type { EpisodeRow as Row } from "./EpisodeCard";
import EpisodeRow from "./EpisodeRow";

export function CalendarItem(props: {
  dateKey: string; // YYYY-MM-DD
  rows: Row[];
  busyEpisodeId: string | null;
  onOpen: (row: Row) => void;
  onWatched: (row: Row) => void;
}) {
  const { dateKey, rows, busyEpisodeId, onOpen, onWatched } = props;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontWeight: "900", fontSize: 16 }}>{dateKey}</Text>

      <View style={{ gap: 10 }}>
        {rows.map((r) => (
          <EpisodeRow
            key={r.episode_id}
            row={r}
            busy={busyEpisodeId === r.episode_id}
            onOpen={onOpen}
            onWatched={onWatched}
          />
        ))}
      </View>
    </View>
  );
}

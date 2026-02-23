import AsyncStorage from "@react-native-async-storage/async-storage";

export type Row = {
  user_id: string;
  show_id: string;
  show_title: string;
  poster_url: string | null;

  is_following: boolean;
  notify_day_of: boolean;
  day_of_minutes: number;
  notify_drop: boolean;

  next_episode_id: string | null;
  next_air_date_local_date: string | null;
  next_season: number | null;
  next_episode: number | null;
  next_episode_title: string | null;

  next_service_id: string | null;
  next_service_name: string | null;
  next_service_logo_url: string | null;
};

export type Patch = Partial<Pick<Row, "is_following" | "notify_day_of" | "notify_drop" | "day_of_minutes">>;

export interface MyShowsRepo {
  load(): Promise<Row[]>;
  updateSettings(show_id: string, patch: Patch): Promise<void>;
}

/** ---------- LOCAL IMPLEMENTATION (DB LAST) ---------- **/

const KEY = "watchweek.myshows.local.v1";

/**
 * Local rows are whatever you followed. "next up" fields are blank until DB phase.
 * That’s fine — UI will show "No upcoming schedule".
 */
type LocalRow = Pick<Row, "show_id" | "show_title" | "poster_url" | "is_following" | "notify_day_of" | "day_of_minutes" | "notify_drop">;

async function readLocal(): Promise<LocalRow[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalRow[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal(rows: LocalRow[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
}

function toRow(r: LocalRow): Row {
  return {
    user_id: "local",
    show_id: r.show_id,
    show_title: r.show_title,
    poster_url: r.poster_url ?? null,

    is_following: r.is_following ?? true,
    notify_day_of: r.notify_day_of ?? true,
    day_of_minutes: typeof r.day_of_minutes === "number" ? r.day_of_minutes : 30,
    notify_drop: r.notify_drop ?? false,

    next_episode_id: null,
    next_air_date_local_date: null,
    next_season: null,
    next_episode: null,
    next_episode_title: null,

    next_service_id: null,
    next_service_name: null,
    next_service_logo_url: null,
  };
}

export const localMyShowsRepo: MyShowsRepo = {
  async load() {
    const local = await readLocal();
    // only "following" ones appear
    return local.filter(x => x.is_following).map(toRow);
  },

  async updateSettings(show_id, patch) {
    const rows = await readLocal();
    const idx = rows.findIndex(r => r.show_id === show_id);
    if (idx < 0) return;

    rows[idx] = {
      ...rows[idx],
      ...patch,
    } as LocalRow;

    // if turned off following, we keep the record but it won’t render
    await writeLocal(rows);
  },
};

/**
 * Helper you’ll call from EpisodeCard “Follow” button.
 */
export async function localFollowShow(input: { show_id: string; show_title: string; poster_url?: string | null }) {
  const rows = await readLocal();
  const idx = rows.findIndex(r => r.show_id === input.show_id);

  const base: LocalRow = {
    show_id: input.show_id,
    show_title: input.show_title,
    poster_url: input.poster_url ?? null,
    is_following: true,
    notify_day_of: true,
    day_of_minutes: 30,
    notify_drop: false,
  };

  if (idx >= 0) rows[idx] = { ...rows[idx], ...base };
  else rows.push(base);

  await writeLocal(rows);
}

export async function localUnfollowShow(show_id: string) {
  const rows = await readLocal();
  const idx = rows.findIndex(r => r.show_id === show_id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], is_following: false };
  await writeLocal(rows);
}

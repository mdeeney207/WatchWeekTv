import AsyncStorage from "@react-native-async-storage/async-storage";

export type MyShow = {
  show_id: string;
  title: string;
  poster_url?: string | null;

  // prefs (Phase 2)
  notify_enabled: boolean;
  preferred_service_id: string | null;

  // optional helper: if you know possible services for this show
  service_options?: Array<{ id: string; name: string }>;
};

const KEY = "watchweek.myshows.v1";

async function readAll(): Promise<MyShow[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MyShow[];
  } catch {
    return [];
  }
}

async function writeAll(rows: MyShow[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
}

export const myShowsStore = {
  async list(): Promise<MyShow[]> {
    const rows = await readAll();
    // stable sort
    return rows.slice().sort((a, b) => a.title.localeCompare(b.title));
  },

  async upsert(show: Omit<MyShow, "notify_enabled" | "preferred_service_id"> & Partial<Pick<MyShow, "notify_enabled" | "preferred_service_id">>) {
    const rows = await readAll();
    const idx = rows.findIndex((r) => r.show_id === show.show_id);

    const merged: MyShow = {
      show_id: show.show_id,
      title: show.title,
      poster_url: show.poster_url ?? null,
      notify_enabled: show.notify_enabled ?? true,
      preferred_service_id: show.preferred_service_id ?? null,
      service_options: show.service_options ?? [],
    };

    if (idx >= 0) rows[idx] = { ...rows[idx], ...merged };
    else rows.push(merged);

    await writeAll(rows);
    return merged;
  },

  async remove(show_id: string) {
    const rows = await readAll();
    await writeAll(rows.filter((r) => r.show_id !== show_id));
  },

  async setNotify(show_id: string, enabled: boolean) {
    const rows = await readAll();
    const idx = rows.findIndex((r) => r.show_id === show_id);
    if (idx < 0) return;
    rows[idx] = { ...rows[idx], notify_enabled: enabled };
    await writeAll(rows);
  },

  async setPreferredService(show_id: string, service_id: string | null) {
    const rows = await readAll();
    const idx = rows.findIndex((r) => r.show_id === show_id);
    if (idx < 0) return;
    rows[idx] = { ...rows[idx], preferred_service_id: service_id };
    await writeAll(rows);
  },
};

import "server-only";
import { cache } from "react";
import { db } from "./db";

export const DEFAULT_SETTINGS = {
  siteName: "My Blog",
  siteTagline: "Insights, stories and updates",
  postsPerPage: "10",
  commentsEnabled: "true",
  commentsRequireApproval: "true",
  trackingEnabled: "true",
  searchIndexing: "true",
  titleSuffix: " | My Blog",
  defaultMetaDescription: "",
};
export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
});

export async function saveSettings(values: Partial<Settings>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } }),
    ),
  );
}

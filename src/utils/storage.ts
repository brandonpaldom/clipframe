import { DEFAULT_SETTINGS, type Settings } from "../types";

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return stored as Settings;
}

export async function saveSettings(
  partial: Partial<Settings>,
): Promise<void> {
  await chrome.storage.sync.set(partial);
}

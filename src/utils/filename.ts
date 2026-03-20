import type { ImageFormat } from "../types";

export function generateFilename(url: string, format: ImageFormat): string {
  const hostname = extractHostname(url);
  const timestamp = formatTimestamp(new Date());
  const ext = format === "jpeg" ? "jpg" : "png";
  return `${hostname}_${timestamp}.${ext}`;
}

function extractHostname(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.hostname;
    }
  } catch {
    // invalid URL
  }
  return "screenshot";
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${mo}-${d}_${h}-${mi}-${s}`;
}

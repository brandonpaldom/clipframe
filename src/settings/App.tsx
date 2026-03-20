import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings } from "../utils/storage";
import { generateFilename } from "../utils/filename";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const update = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSettings(partial);
    }, 300);
  };

  if (!loaded) return null;

  const preview = generateFilename("https://example.com", settings.format);

  return (
    <div style={{ maxWidth: 480, margin: "32px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 24 }}>Settings</h1>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Image Format</h3>
        <label style={{ marginRight: 16, cursor: "pointer" }}>
          <input
            type="radio"
            name="format"
            value="png"
            checked={settings.format === "png"}
            onChange={() => update({ format: "png" })}
          />{" "}
          PNG
        </label>
        <label style={{ cursor: "pointer" }}>
          <input
            type="radio"
            name="format"
            value="jpeg"
            checked={settings.format === "jpeg"}
            onChange={() => update({ format: "jpeg" })}
          />{" "}
          JPG
        </label>
      </section>

      {settings.format === "jpeg" && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>
            Quality: {settings.quality}
          </h3>
          <input
            type="range"
            min={10}
            max={100}
            value={settings.quality}
            onChange={(e) => update({ quality: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </section>
      )}

      <section>
        <h3 style={{ marginBottom: 8 }}>Filename Preview</h3>
        <code style={{ padding: "8px 12px", borderRadius: 4, display: "block", fontSize: 14 }}>
          {preview}
        </code>
      </section>
    </div>
  );
}

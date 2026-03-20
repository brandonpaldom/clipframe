import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings } from "../utils/storage";
import { generateFilename } from "../utils/filename";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import styles from "./App.module.css";

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
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Image Format</h3>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="format"
            value="png"
            checked={settings.format === "png"}
            onChange={() => update({ format: "png" })}
          />{" "}
          PNG
        </label>
        <label className={styles.radioLabel}>
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
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Quality: {settings.quality}</h3>
          <input
            type="range"
            min={10}
            max={100}
            value={settings.quality}
            onChange={(e) => update({ quality: Number(e.target.value) })}
            className={styles.slider}
          />
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Filename Preview</h3>
        <code className={styles.preview}>{preview}</code>
      </section>
    </div>
  );
}

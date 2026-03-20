import { useEffect, useState } from "react";
import { sendToBackground } from "../utils/messaging";
import type { CaptureResult, CaptureProgressMessage } from "../types";
import Header from "./components/Header";
import CaptureButton from "./components/CaptureButton";
import StatusMessage from "./components/StatusMessage";
import styles from "./App.module.css";

type Status = "idle" | "capturing" | "success" | "error";

// Lucide: Scan (visible capture)
function ScanIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}

// Lucide: AppWindow (full page)
function AppWindowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 4v4" />
      <path d="M2 8h20" />
      <path d="M6 4v4" />
    </svg>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [captureType, setCaptureType] = useState<"visible" | "fullpage">("visible");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const listener = (message: CaptureProgressMessage) => {
      if (message.type === "CAPTURE_PROGRESS") {
        setProgress({ current: message.current, total: message.total });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleCapture = async (type: "visible" | "fullpage") => {
    setStatus("capturing");
    setCaptureType(type);
    setErrorMessage("");
    setProgress({ current: 0, total: 0 });

    try {
      const result: CaptureResult = await sendToBackground({
        type: type === "visible" ? "CAPTURE_VISIBLE" : "CAPTURE_FULL_PAGE",
      });

      if (result.success) {
        setStatus("success");
        setTimeout(() => window.close(), 1500);
      } else {
        setStatus("error");
        setErrorMessage(result.error);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to communicate with the extension.");
    }
  };

  const capturing = status === "capturing";

  const fullPageLoadingLabel =
    capturing && captureType === "fullpage" && progress.total > 0
      ? `Capturing... ${progress.current}/${progress.total}`
      : undefined;

  return (
    <div className={styles.popup}>
      <Header />

      <div className={styles.actions}>
        <CaptureButton
          icon={<ScanIcon />}
          label="Visible part"
          description="Capture what you see now"
          loading={capturing && captureType === "visible"}
          disabled={capturing}
          onClick={() => handleCapture("visible")}
        />

        <CaptureButton
          icon={<AppWindowIcon />}
          label="Full page"
          description="Scroll and capture everything"
          loadingLabel={fullPageLoadingLabel}
          loading={capturing && captureType === "fullpage"}
          disabled={capturing}
          onClick={() => handleCapture("fullpage")}
        />
      </div>

      {status === "success" && <StatusMessage type="success">Saved to downloads</StatusMessage>}

      {status === "error" && <StatusMessage type="error">{errorMessage}</StatusMessage>}
    </div>
  );
}

import { useState } from "react";
import { sendToBackground } from "../utils/messaging";
import type { CaptureResult } from "../types";
import Header from "./components/Header";
import CaptureButton from "./components/CaptureButton";
import StatusMessage from "./components/StatusMessage";

type Status = "idle" | "capturing" | "success" | "error";

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function FullPageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18" />
    </svg>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleCaptureVisible = async () => {
    setStatus("capturing");
    setErrorMessage("");

    try {
      const result: CaptureResult = await sendToBackground({
        type: "CAPTURE_VISIBLE",
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

  return (
    <div style={{ width: 350, padding: 16 }}>
      <Header />

      <CaptureButton
        icon={<CameraIcon />}
        label="Capture Visible"
        loading={capturing}
        onClick={handleCaptureVisible}
      />

      <CaptureButton
        icon={<FullPageIcon />}
        label="Full-Page Capture"
        disabled
        onClick={() => {}}
      />

      {status === "success" && (
        <StatusMessage type="success">Done!</StatusMessage>
      )}

      {status === "error" && (
        <StatusMessage type="error">{errorMessage}</StatusMessage>
      )}
    </div>
  );
}

import { useState } from "react";
import { sendToBackground } from "../utils/messaging";
import type { CaptureResult } from "../types";

type Status = "idle" | "capturing" | "success" | "error";

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
    <div style={{ width: 350, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 16px" }}>Screenshot Capture</h2>

      <button
        onClick={handleCaptureVisible}
        disabled={capturing}
        style={{ width: "100%", padding: "10px", marginBottom: 8, cursor: capturing ? "not-allowed" : "pointer" }}
      >
        {capturing ? "Capturing..." : "Capture Visible"}
      </button>

      <button
        disabled
        style={{ width: "100%", padding: "10px", marginBottom: 8, opacity: 0.5, cursor: "not-allowed" }}
      >
        Full-Page Capture
      </button>

      {status === "success" && (
        <p style={{ color: "green", margin: "8px 0 0" }}>Done!</p>
      )}

      {status === "error" && (
        <p style={{ color: "red", margin: "8px 0 0" }}>{errorMessage}</p>
      )}
    </div>
  );
}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Screenshot Capture</h2>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Settings"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 4 }}
        >
          &#9881;
        </button>
      </div>

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

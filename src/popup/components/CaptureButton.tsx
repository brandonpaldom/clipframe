import type { ReactNode } from "react";
import styles from "./CaptureButton.module.css";

interface Props {
  icon: ReactNode;
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function Spinner() {
  return (
    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export default function CaptureButton({ icon, label, loadingLabel, loading, disabled, onClick }: Props) {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Spinner /> : icon}
      {loading ? (loadingLabel ?? "Capturing...") : label}
    </button>
  );
}

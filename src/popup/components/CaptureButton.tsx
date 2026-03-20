import type { ReactNode } from "react";
import styles from "./CaptureButton.module.css";

interface Props {
  icon: ReactNode;
  label: string;
  description: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function Spinner() {
  return (
    <svg
      className={styles.spinner}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export default function CaptureButton({
  icon,
  label,
  description,
  loadingLabel,
  loading,
  disabled,
  onClick,
}: Props) {
  const isLoading = loading ?? false;

  return (
    <button
      className={`${styles.button} ${isLoading ? styles.loading : ""}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <div className={styles.iconBadge}>{isLoading ? <Spinner /> : icon}</div>
      <div className={styles.textGroup}>
        <span className={styles.label}>{label}</span>
        <span className={styles.description}>
          {isLoading ? (loadingLabel ?? "Capturing...") : description}
        </span>
      </div>
    </button>
  );
}

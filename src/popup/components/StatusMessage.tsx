import styles from "./StatusMessage.module.css";

interface Props {
  type: "success" | "error";
  children: string;
}

export default function StatusMessage({ type, children }: Props) {
  return (
    <div className={`${styles.message} ${styles[type]}`}>
      {children}
    </div>
  );
}

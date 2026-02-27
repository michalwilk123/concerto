"use client";

import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}

// ─── Single Toast ────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle;
    color: string;
    bg: string;
    borderColor: string;
  }
> = {
  success: {
    icon: CheckCircle,
    color: "#66bb6a",
    bg: "rgba(76, 175, 80, 0.08)",
    borderColor: "rgba(76, 175, 80, 0.22)",
  },
  error: {
    icon: XCircle,
    color: "#ef5350",
    bg: "rgba(244, 67, 54, 0.08)",
    borderColor: "rgba(244, 67, 54, 0.22)",
  },
  warning: {
    icon: AlertTriangle,
    color: "#ffa726",
    bg: "rgba(255, 152, 0, 0.08)",
    borderColor: "rgba(255, 152, 0, 0.22)",
  },
  info: {
    icon: Info,
    color: "#a78bfa",
    bg: "rgba(139, 92, 246, 0.08)",
    borderColor: "rgba(139, 92, 246, 0.22)",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = VARIANT_CONFIG[toast.variant];
  const Icon = config.icon;
  const frameRef = useRef<number>(0);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 280);
  }, [onDismiss, toast.id]);

  // Progress bar countdown
  useEffect(() => {
    const start = toast.createdAt;
    const end = start + toast.duration;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, ((end - now) / toast.duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [toast.createdAt, toast.duration, dismiss]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-md)",
        padding: "var(--space-md) var(--space-lg)",
        background: config.bg,
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: `1px solid ${config.borderColor}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: `0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.03) inset`,
        overflow: "hidden",
        maxWidth: 380,
        width: "100%",
        animation: exiting
          ? "toast-exit 280ms cubic-bezier(0.4, 0, 1, 1) forwards"
          : "toast-enter 320ms cubic-bezier(0, 0, 0.2, 1) forwards",
        pointerEvents: "auto",
      }}
    >
      <Icon
        size={18}
        style={{
          color: config.color,
          flexShrink: 0,
          marginTop: 1,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: "0.84rem",
          lineHeight: 1.45,
          color: "var(--text-primary)",
          fontWeight: 450,
          letterSpacing: "-0.005em",
        }}
      >
        {toast.message}
      </span>
      <button
        onClick={dismiss}
        style={{
          background: "none",
          border: "none",
          padding: 2,
          cursor: "pointer",
          color: "var(--text-tertiary)",
          flexShrink: 0,
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: config.color,
            opacity: 0.5,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant, duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, variant, duration, createdAt: Date.now() }]);
  }, []);

  const toast = {
    success: (msg: string, dur?: number) => addToast(msg, "success", dur),
    error: (msg: string, dur?: number) => addToast(msg, "error", dur ?? 6000),
    warning: (msg: string, dur?: number) => addToast(msg, "warning", dur ?? 5500),
    info: (msg: string, dur?: number) => addToast(msg, "info", dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — keyframe styles */}
      <style>{`
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes toast-exit {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(80px) scale(0.92);
          }
        }
      `}</style>

      {/* Toast stack */}
      <div
        style={{
          position: "fixed",
          bottom: "var(--space-xl)",
          right: "var(--space-xl)",
          display: "flex",
          flexDirection: "column-reverse",
          gap: "var(--space-sm)",
          zIndex: 2000,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

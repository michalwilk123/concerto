"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { signUp } from "@/lib/auth-client";
import { useTranslation } from "@/hooks/useTranslation";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.register.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    const result = await signUp.email({ email, password, name });

    if (result.error) {
      setError(result.error.message || t("auth.register.registrationFailed"));
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          padding: "var(--space-2xl)",
          width: "100%",
          maxWidth: 380,
        }}
      >
        <h2 style={{ margin: "0 0 var(--space-xl)", fontSize: "1.25rem" }}>
          {t("auth.register.title")}
        </h2>

        {error && (
          <p
            style={{
              color: "var(--accent-red)",
              fontSize: "0.85rem",
              margin: "0 0 var(--space-lg)",
            }}
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label
              htmlFor="name"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {t("auth.register.fullName")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.register.fullNamePlaceholder")}
              autoComplete="name"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label
              htmlFor="email"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {t("auth.register.email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.register.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label
              htmlFor="password"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {t("auth.register.password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label
              htmlFor="confirmPassword"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {t("auth.register.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <InlineButton
            variant="primary"
            size="lg"
            type="submit"
            loading={loading}
            fullWidth
            style={{ fontWeight: 600, marginTop: "var(--space-sm)", padding: "var(--space-md)" }}
          >
            {loading ? t("auth.register.creatingAccount") : t("auth.register.submit")}
          </InlineButton>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "var(--space-xl)",
            marginBottom: 0,
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          {t("auth.register.alreadyHaveAccount")} <a href="/login">{t("auth.register.signIn")}</a>
        </p>
      </div>
    </div>
  );
}

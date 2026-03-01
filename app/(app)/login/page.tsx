"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, Suspense } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { authClient, signIn } from "@/lib/auth-client";
import { useTranslation } from "@/hooks/useTranslation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const showPendingMessage = searchParams.get("pendingActivation") === "1";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn.email({
      email: (formData.get("email") as string) || "",
      password: (formData.get("password") as string) || "",
    });

    if (result.error) {
      const message = result.error.message || t("auth.login.signInFailed");
      setError(
        message.toLowerCase().includes("awaiting activation")
          ? t("auth.login.waitingActivation")
          : message,
      );
      setLoading(false);
    } else {
      const session = await authClient.getSession();
      const isUserActive =
        (session.data?.user as { isActive?: boolean } | undefined)?.isActive ?? true;
      if (session.data?.user && !isUserActive) {
        router.push("/waiting-approval");
        return;
      }
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
          {t("auth.login.title")}
        </h2>

        {showPendingMessage && (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              margin: "0 0 var(--space-lg)",
            }}
          >
            {t("auth.login.waitingActivation")}
          </p>
        )}

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
              htmlFor="email"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {t("auth.login.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t("auth.login.emailPlaceholder")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label
              htmlFor="password"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {t("auth.login.password")}
            </label>
            <input id="password" name="password" type="password" required />
          </div>

          <InlineButton
            variant="primary"
            size="lg"
            type="submit"
            loading={loading}
            fullWidth
            style={{ fontWeight: 600, marginTop: "var(--space-sm)", padding: "var(--space-md)" }}
          >
            {loading ? t("auth.login.signingIn") : t("auth.login.submit")}
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
          {t("auth.login.noAccount")} <a href="/register">{t("auth.login.register")}</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

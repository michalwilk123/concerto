"use client";

import { Eye, EyeOff } from "lucide-react";
import { type FormEvent, Suspense, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "@/i18n/navigation";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setError(result.error.message || t("auth.login.signInFailed"));
      setLoading(false);
    } else {
      // Hard navigation: matches lib/logout.ts pattern. Soft router.replace
      // didn't reliably leave /login — the destination re-checks useSession()
      // and could bounce back. A full reload makes middleware re-evaluate
      // with the fresh session cookie and rebuilds useSession() cleanly.
      window.location.assign("/dashboard");
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
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                style={{ width: "100%", paddingRight: "2.5rem", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--space-sm)",
              marginTop: "var(--space-sm)",
            }}
          >
            <InlineButton
              variant="primary"
              size="lg"
              type="submit"
              loading={loading}
              fullWidth
              style={{ fontWeight: 600, padding: "var(--space-md)" }}
            >
              {loading ? t("auth.login.signingIn") : t("auth.login.submit")}
            </InlineButton>
            <Link
              href="/register"
              style={{
                alignItems: "center",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                display: "inline-flex",
                fontSize: "0.9rem",
                fontWeight: 600,
                justifyContent: "center",
                padding: "var(--space-md)",
                textDecoration: "none",
              }}
            >
              {t("auth.login.register")}
            </Link>
          </div>
        </form>
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

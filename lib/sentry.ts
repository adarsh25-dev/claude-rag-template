type SentryExtra = Record<string, unknown>;

/**
 * Reports to Sentry when a DSN is configured; otherwise logs to stderr (avoids loading Sentry in local dev).
 */
export function captureException(error: unknown, context?: SentryExtra): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) {
    console.error("[captureException]", context ?? {}, error);
    return;
  }

  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureException(error, { extra: context });
  });
}

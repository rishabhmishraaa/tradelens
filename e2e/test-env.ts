// Test-only credentials for the local E2E server. Never used in production.
// The hash was generated with `npm run hash-password -- "e2e-owner-password-123"`.
export const E2E_OWNER_PASSWORD = "e2e-owner-password-123";

export const E2E_SERVER_ENV = {
  OWNER_PASSWORD_HASH:
    "scrypt:16384:8:1:gFDbpPVwJ8vTeqSMDinVgg:mKp7CJX1UiUGLzGhR2nwFONW4MpvhNtat4qzQdPkvvs1PV-mdxpIThTu51kjPMAdYJSxMDpQXugbil7DEgQmpg",
  SESSION_SECRET: "e2e-session-secret-at-least-32-characters-long",
};

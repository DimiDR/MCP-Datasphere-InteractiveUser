import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./http.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and set the OAuth client secret.`,
    );
  }
  return value.trim();
}

export const config = {
  root,
  tokenFile: join(root, ".token.json"),
  oauth: {
    clientId: required(
      "DSP_OAUTH_CLIENT_ID",
      process.env.DSP_OAUTH_CLIENT_ID,
    ),
    clientSecret: () =>
      required("DSP_OAUTH_CLIENT_SECRET", process.env.DSP_OAUTH_CLIENT_SECRET),
    authorizeUrl: required(
      "DSP_OAUTH_AUTHORIZE_URL",
      process.env.DSP_OAUTH_AUTHORIZE_URL,
    ),
    tokenUrl: required(
      "DSP_OAUTH_TOKEN_URL",
      process.env.DSP_OAUTH_TOKEN_URL,
    ),
    redirectUri:
      process.env.DSP_OAUTH_REDIRECT_URI?.trim() ||
      "http://localhost:8080/callback",
  },
  datasphere: {
    tenantUrl: required("DSP_TENANT_URL", process.env.DSP_TENANT_URL),
    tenantId: process.env.DSP_TENANT_ID?.trim() || "",
    spaceId: process.env.DSP_SPACE_ID?.trim() || "",
    assetId: process.env.DSP_ASSET_ID?.trim() || "",
  },
};

export function analyticalDataUrl(spaceId = config.datasphere.spaceId, assetId = config.datasphere.assetId): string {
  return `${config.datasphere.tenantUrl}/api/v1/datasphere/consumption/analytical/${encodeURIComponent(spaceId)}/${encodeURIComponent(assetId)}`;
}

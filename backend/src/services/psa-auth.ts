import axios, { isAxiosError } from "axios";
import crypto from "crypto";
import { settingsRepository } from "../db/repositories/index.js";

const BRAND_TO_REALM: Record<string, string> = {
  peugeot:  "clientsB2CPeugeot",
  citroen:  "clientsB2CCitroen",
  ds:       "clientsB2CDS",
  opel:     "clientsB2COpel",
  vauxhall: "clientsB2CVauxhall",
};

const REALM_CONFIG: Record<string, {
  authorizeUrl: string;
  tokenUrl: string;
  scheme: string;
}> = {
  clientsB2CPeugeot: {
    authorizeUrl: "https://idpcvs.peugeot.com/am/oauth2/authorize",
    tokenUrl:     "https://idpcvs.peugeot.com/am/oauth2/access_token",
    scheme:       "mymap",
  },
  clientsB2CCitroen: {
    authorizeUrl: "https://idpcvs.citroen.com/am/oauth2/authorize",
    tokenUrl:     "https://idpcvs.citroen.com/am/oauth2/access_token",
    scheme:       "mymacsdk",
  },
  clientsB2CDS: {
    authorizeUrl: "https://idpcvs.driveds.com/am/oauth2/authorize",
    tokenUrl:     "https://idpcvs.driveds.com/am/oauth2/access_token",
    scheme:       "mymdssdk",
  },
  clientsB2COpel: {
    authorizeUrl: "https://idpcvs.opel.com/am/oauth2/authorize",
    tokenUrl:     "https://idpcvs.opel.com/am/oauth2/access_token",
    scheme:       "mymopsdk",
  },
  clientsB2CVauxhall: {
    authorizeUrl: "https://idpcvs.vauxhall.co.uk/am/oauth2/authorize",
    tokenUrl:     "https://idpcvs.vauxhall.co.uk/am/oauth2/access_token",
    scheme:       "mymvxsdk",
  },
};

export interface TokenSet {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
}

function tokenKey(realm: string): string {
  return `token_${realm}`;
}

export function getTokenSet(realm: string): TokenSet | null {
  // New per-realm format
  const raw = settingsRepository.get(tokenKey(realm));
  if (raw) return JSON.parse(raw) as TokenSet;

  // Legacy single-brand format — migrate on first access
  const legacyBrand = settingsRepository.get("brand");
  if (legacyBrand && realmForBrand(legacyBrand) === realm) {
    const accessToken  = settingsRepository.get("access_token");
    const refreshToken = settingsRepository.get("refresh_token");
    const clientId     = settingsRepository.get("client_id");
    const clientSecret = settingsRepository.get("client_secret");
    const expiryStr    = settingsRepository.get("token_expiry");
    if (accessToken && refreshToken && clientId && clientSecret && expiryStr) {
      const tokenSet: TokenSet = {
        clientId,
        clientSecret,
        accessToken,
        refreshToken,
        tokenExpiry: parseInt(expiryStr, 10),
      };
      // Promote to new format so future reads are fast
      saveTokenSet(realm, tokenSet);
      settingsRepository.set(`client_id_${realm}`,     clientId);
      settingsRepository.set(`client_secret_${realm}`, clientSecret);
      return tokenSet;
    }
  }

  return null;
}

function saveTokenSet(realm: string, tokens: TokenSet): void {
  settingsRepository.set(tokenKey(realm), JSON.stringify(tokens));
}

export function realmForBrand(brand: string): string {
  const realm = BRAND_TO_REALM[brand];
  if (!realm) throw new Error(`Unknown brand: ${brand}`);
  return realm;
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function generateAuthUrl(brand: string, countryCode: string): string {
  const realm = realmForBrand(brand);
  const config = REALM_CONFIG[realm];

  const { verifier, challenge } = generatePkce();
  const state = crypto.randomBytes(12).toString("base64url");
  const redirectUri = `${config.scheme}://oauth2redirect/${countryCode.toLowerCase()}`;

  // Store pending setup state — exchange-code reads these
  settingsRepository.set("pending_brand",        brand);
  settingsRepository.set("pending_realm",        realm);
  settingsRepository.set("pending_country_code", countryCode);
  settingsRepository.set("pkce_code_verifier",   verifier);
  settingsRepository.set("oauth_redirect_uri",   redirectUri);

  const clientId = settingsRepository.get(`client_id_${realm}`) ?? "";
  const params = new URLSearchParams({
    response_type:         "code",
    client_id:             clientId,
    redirect_uri:          redirectUri,
    scope:                 "openid profile",
    state,
    code_challenge:        challenge,
    code_challenge_method: "S256",
  });

  return `${config.authorizeUrl}?${params}`;
}

export function storeClientCredentials(
  brand: string,
  clientId: string,
  clientSecret: string
): void {
  const realm = realmForBrand(brand);
  settingsRepository.set(`client_id_${realm}`,     clientId);
  settingsRepository.set(`client_secret_${realm}`, clientSecret);
}

export async function exchangeCode(code: string): Promise<void> {
  const realm       = settingsRepository.get("pending_realm");
  const verifier    = settingsRepository.get("pkce_code_verifier");
  const redirectUri = settingsRepository.get("oauth_redirect_uri");

  if (!realm || !verifier || !redirectUri) {
    throw new Error("Missing pending setup state — call /api/setup/init first");
  }

  const clientId     = settingsRepository.get(`client_id_${realm}`);
  const clientSecret = settingsRepository.get(`client_secret_${realm}`);
  if (!clientId || !clientSecret) {
    throw new Error(`No client credentials stored for realm ${realm}`);
  }

  const { tokenUrl } = REALM_CONFIG[realm];

  let resp;
  try {
    resp = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
        code_verifier: verifier,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: clientId, password: clientSecret },
      }
    );
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      const body = JSON.stringify(err.response.data);
      console.error(`[psa-auth] Token exchange failed ${err.response.status}: ${body}`);
      throw new Error(`PSA returned ${err.response.status}: ${body}`);
    }
    throw err;
  }

  const { access_token, refresh_token, expires_in } = resp.data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  saveTokenSet(realm, {
    clientId,
    clientSecret,
    accessToken:  access_token,
    refreshToken: refresh_token,
    tokenExpiry:  Math.floor(Date.now() / 1000) + (expires_in ?? 3600),
  });
}

export async function refreshTokenIfNeeded(realm: string): Promise<void> {
  const tokens = getTokenSet(realm);
  if (!tokens) return;

  const nowSec = Math.floor(Date.now() / 1000);
  if (tokens.tokenExpiry - nowSec > 600) return;

  const { tokenUrl } = REALM_CONFIG[realm];

  let resp;
  try {
    resp = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: tokens.clientId, password: tokens.clientSecret },
      }
    );
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      console.error(`[psa-auth] Token refresh failed ${err.response.status}:`, err.response.data);
    }
    throw err;
  }

  const { access_token, refresh_token: newRefresh, expires_in } = resp.data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  saveTokenSet(realm, {
    ...tokens,
    accessToken:  access_token,
    refreshToken: newRefresh,
    tokenExpiry:  Math.floor(Date.now() / 1000) + (expires_in ?? 3600),
  });
}

/** Refresh tokens for every brand that has credentials stored. */
export async function refreshAllTokens(): Promise<void> {
  for (const realm of Object.values(BRAND_TO_REALM)) {
    if (getTokenSet(realm)) {
      await refreshTokenIfNeeded(realm).catch((e) =>
        console.error(`[psa-auth] Refresh failed for ${realm}:`, e)
      );
    }
  }
}

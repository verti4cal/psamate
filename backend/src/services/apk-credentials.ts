import https from "https";
import { spawn } from "child_process";
import AdmZip from "adm-zip";

const GITHUB_RAW = "https://raw.githubusercontent.com/flobz/psa_apk/master";

const APK_FILENAME: Record<string, string> = {
  peugeot:  "mypeugeot.apk",
  citroen:  "mycitroen.apk",
  ds:       "myds.apk",
  opel:     "myopel.apk",
  vauxhall: "myvauxhall.apk",
};

export interface ApkCredentials {
  clientId: string;
  clientSecret: string;
}

export async function fetchCredentialsFromApk(
  brand: string,
  countryCode: string
): Promise<ApkCredentials> {
  const filename = APK_FILENAME[brand];
  if (!filename) throw new Error(`Unknown brand: ${brand}`);

  const bz2 = await download(`${GITHUB_RAW}/${filename}.bz2`);
  const apkBuffer = await decompressBzip2(bz2);
  const zip = new AdmZip(apkBuffer);

  // APK resource path pattern: res/raw-{lang}-r{COUNTRY}/parameters.json
  const country = countryCode.toUpperCase();
  const entryNames = zip.getEntries().map((e) => e.entryName);

  const paramsPath =
    entryNames.find((p) => p.includes(`-r${country}/parameters.json`)) ??
    entryNames.find((p) => p.endsWith("parameters.json"));

  if (!paramsPath) {
    throw new Error(
      `parameters.json not found in ${filename} for country ${country}`
    );
  }

  const params = JSON.parse(zip.readAsText(paramsPath)) as Record<string, unknown>;

  if (typeof params.cvsClientId !== "string" || typeof params.cvsSecret !== "string") {
    throw new Error("cvsClientId or cvsSecret missing in parameters.json");
  }

  return { clientId: params.cvsClientId, clientSecret: params.cvsSecret };
}

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function decompressBzip2(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bunzip2", ["-c"]);
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stdout.on("end", () => resolve(Buffer.concat(chunks)));
    proc.stderr.on("data", (d: Buffer) =>
      console.error("[bunzip2]", d.toString())
    );
    proc.on("error", (e) =>
      reject(new Error(`bunzip2 not found — install bzip2: ${e.message}`))
    );
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

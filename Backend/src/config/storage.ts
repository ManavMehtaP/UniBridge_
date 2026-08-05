import crypto from "node:crypto";
import { env } from "./env.js";

// ─────────────────────────────────────────────────────────────
// Supabase Storage via its S3-compatible endpoint, signed with
// AWS SigV4 using node:crypto — no SDK, no extra dependency.
// STORAGE_BUCKET_URL is the S3 endpoint (…/storage/v1/s3).
// ponytail: hand-rolled SigV4 (PUT + presigned GET only). If we ever need
// multipart/large uploads or copy/list, pull in @aws-sdk/client-s3 instead.
// ─────────────────────────────────────────────────────────────

const endpoint = env.STORAGE_BUCKET_URL?.replace(/\/$/, "") ?? ""; // https://<proj>.storage.supabase.co/storage/v1/s3
const region = env.S3_REGION ?? "ap-south-1";
const bucket = env.S3_BUCKET ?? "";
const accessKeyId = env.S3_ACCESS_KEY_ID ?? "";
const secretAccessKey = env.S3_SECRET_ACCESS_KEY ?? "";

export const storageEnabled = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);

const url = endpoint ? new URL(endpoint) : null;
const host = url?.host ?? "";
const basePath = (url?.pathname ?? "").replace(/\/$/, ""); // /storage/v1/s3

const sha256hex = (data: crypto.BinaryLike) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
// RFC-3986 encoding; keep "/" out of it and encode path segments individually.
const enc = (s: string) => encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const encPath = (key: string) => key.split("/").map(enc).join("/");
const amzDate = (d: Date) => d.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ

function signingKey(dateStamp: string) {
  return hmac(hmac(hmac(hmac("AWS4" + secretAccessKey, dateStamp), region), "s3"), "aws4_request");
}

// Upload bytes with a SigV4 header-signed PUT. Returns the object key.
export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!storageEnabled) throw new Error("Storage not configured — set S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET in Backend/.env.");
  const now = new Date();
  const amzdate = amzDate(now);
  const datestamp = amzdate.slice(0, 8);
  const canonicalUri = `${basePath}/${enc(bucket)}/${encPath(key)}`;
  const payloadHash = sha256hex(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${datestamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256hex(canonicalRequest)].join("\n");
  const signature = hmac(signingKey(datestamp), stringToSign).toString("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Content-Type is NOT part of the signed headers, so we can retry with a different one on the
  // same signature. `host` is signed but not set here — undici sets it (it's a forbidden header).
  const put = (ct: string) => fetch(`${endpoint}/${enc(bucket)}/${encPath(key)}`, {
    method: "PUT",
    headers: { "x-amz-date": amzdate, "x-amz-content-sha256": payloadHash, Authorization: authorization, "Content-Type": ct },
    body: body as unknown as BodyInit,
  });
  let res = await put(contentType);
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    // A restrictive bucket rejects e.g. zip by MIME. Most such buckets still allow the generic
    // binary type, so retry once as application/octet-stream before giving up.
    if (res.status === 400 && /mime|content.?type/i.test(detail) && contentType !== "application/octet-stream") {
      res = await put("application/octet-stream");
    }
    if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${detail}`);
  }
  return key;
}

// Best-effort: clear the storage bucket's MIME/size allow-list so every file type (zip, decks,
// large PDFs) uploads. Supabase buckets created with "Restrict file uploads" ON reject e.g. zip
// with a 400 mime error; this removes that restriction via the Storage admin API. No-op unless
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured.
export async function ensureBucketAcceptsAllTypes(): Promise<void> {
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || !bucket) return;
  try {
    const res = await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      // null = allow all MIME types / no size cap (plan limits still apply).
      body: JSON.stringify({ id: bucket, name: bucket, allowed_mime_types: null, file_size_limit: null }),
    });
    if (res.ok) console.log(`[storage] bucket "${bucket}" now accepts all file types.`);
    else console.warn(`[storage] could not relax bucket restrictions (${res.status}): ${(await res.text()).slice(0, 200)}`);
  } catch (err) {
    console.warn("[storage] bucket restriction relax skipped:", (err as Error).message);
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (!storageEnabled) return;
  const now = new Date();
  const amzdate = amzDate(now);
  const datestamp = amzdate.slice(0, 8);
  const canonicalUri = `${basePath}/${enc(bucket)}/${encPath(key)}`;
  const payloadHash = sha256hex("");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["DELETE", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${datestamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256hex(canonicalRequest)].join("\n");
  const signature = hmac(signingKey(datestamp), stringToSign).toString("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`${endpoint}/${enc(bucket)}/${encPath(key)}`, {
    method: "DELETE",
    headers: { "x-amz-date": amzdate, "x-amz-content-sha256": payloadHash, Authorization: authorization },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Storage delete failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

// Presigned GET URL (SigV4 query auth) — works for private buckets, expires after expiresSec.
export function presignGetUrl(key: string, expiresSec = 3600): string {
  if (!storageEnabled) return "";
  const now = new Date();
  const amzdate = amzDate(now);
  const datestamp = amzdate.slice(0, 8);
  const scope = `${datestamp}/${region}/s3/aws4_request`;
  const canonicalUri = `${basePath}/${enc(bucket)}/${encPath(key)}`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${scope}`,
    "X-Amz-Date": amzdate,
    "X-Amz-Expires": String(expiresSec),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join("&");
  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256hex(canonicalRequest)].join("\n");
  const signature = hmac(signingKey(datestamp), stringToSign).toString("hex");
  return `${endpoint}/${enc(bucket)}/${encPath(key)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

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

  // `host` is signed but not set here — fetch/undici sets the Host header itself (it's a forbidden header).
  // Cast: the DOM lib's BodyInit omits ArrayBufferView, but undici accepts a Buffer/Uint8Array at runtime.
  const res = await fetch(`${endpoint}/${enc(bucket)}/${encPath(key)}`, {
    method: "PUT",
    headers: { "x-amz-date": amzdate, "x-amz-content-sha256": payloadHash, Authorization: authorization, "Content-Type": contentType },
    body: body as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return key;
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

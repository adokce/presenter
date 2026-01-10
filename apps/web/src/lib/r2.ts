import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3"

// Debug: Log R2 config (lengths only for security)
console.log("[R2] Config check:", {
  accountIdLength: process.env.R2_ACCOUNT_ID?.length,
  accessKeyIdLength: process.env.R2_ACCESS_KEY_ID?.length,
  secretAccessKeyLength: process.env.R2_SECRET_ACCESS_KEY?.length,
  bucket: process.env.R2_BUCKET,
  publicDevUrl: process.env.R2_PUBLIC_DEV_URL?.substring(0, 40) + "...",
})

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET!
export const R2_PUBLIC_DEV_URL = process.env.R2_PUBLIC_DEV_URL!

export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  )
  return `${R2_PUBLIC_DEV_URL}/${key}`
}

export async function listR2Objects(prefix: string) {
  const result = await r2.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
    }),
  )
  return result.Contents || []
}

export async function getFromR2(key: string) {
  const result = await r2.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  )
  return result
}

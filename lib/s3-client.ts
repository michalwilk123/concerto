import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

function bucket(): string {
  return process.env.S3_BUCKET_NAME ?? "concerto-files";
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType?: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key: string): Promise<Buffer> {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  // S3 batch delete supports max 1000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await client().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    );
  }
}

export async function headObject(
  key: string,
): Promise<{ size: number; lastModified: Date } | null> {
  try {
    const res = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return {
      size: res.ContentLength ?? 0,
      lastModified: res.LastModified ?? new Date(),
    };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "NotFound") return null;
    // R2 may return 404 as a generic error
    if (err && typeof err === "object" && "$metadata" in err) {
      const meta = (err as { $metadata: { httpStatusCode?: number } }).$metadata;
      if (meta.httpStatusCode === 404) return null;
    }
    throw err;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  return (await headObject(key)) !== null;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

export async function listObjects(prefix: string, delimiter?: string): Promise<S3Object[]> {
  const results: S3Object[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        Delimiter: delimiter,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) {
        results.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? new Date(),
        });
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return results;
}

export async function copyObject(srcKey: string, destKey: string) {
  await client().send(
    new CopyObjectCommand({
      Bucket: bucket(),
      CopySource: `${bucket()}/${srcKey}`,
      Key: destKey,
    }),
  );
}

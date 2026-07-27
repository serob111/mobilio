import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IObjectStorage, PutObjectInput, SignedUrlOptions } from './object-storage.port';

const DEFAULT_URL_TTL_SECONDS = 15 * 60;

export interface S3ObjectStorageConfig {
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
  /**
   * Endpoint to sign presigned URLs against, if it differs from `endpoint`.
   * Needed for local Docker Compose setups: server-to-server calls
   * (put/head/delete) go through the internal `http://minio:9000` service
   * name, but a presigned URL is handed to the end user's browser, which
   * can't resolve that hostname — it needs the host-published address
   * (`http://localhost:9000`) instead. Defaults to `endpoint`.
   */
  readonly publicEndpoint?: string;
  readonly forcePathStyle: boolean;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

export class S3ObjectStorage implements IObjectStorage {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor(config: S3ObjectStorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.presignClient = config.publicEndpoint
      ? new S3Client({
          region: config.region,
          endpoint: config.publicEndpoint,
          forcePathStyle: config.forcePathStyle,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        })
      : this.client;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = DEFAULT_URL_TTL_SECONDS,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.clientFor(options), command, { expiresIn: expiresInSeconds });
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = DEFAULT_URL_TTL_SECONDS,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.clientFor(options), command, { expiresIn: expiresInSeconds });
  }

  private clientFor(options?: SignedUrlOptions): S3Client {
    return options?.external ? this.presignClient : this.client;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async headObject(key: string): Promise<{ contentLength: number; contentType: string } | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof NotFound) {
        return null;
      }
      throw error;
    }
  }

  async checkConnectivity(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

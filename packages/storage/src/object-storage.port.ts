import { Readable } from 'node:stream';

export interface PutObjectInput {
  readonly key: string;
  readonly body: Buffer | Readable;
  readonly contentType: string;
  readonly contentLength?: number;
}

export interface SignedUrlOptions {
  /**
   * True if this URL is handed to something outside the server's own
   * network (a browser, a CLI on the user's machine) — the adapter may
   * sign it against a different, publicly reachable endpoint than the one
   * it uses for its own server-to-server calls. Defaults to false.
   */
  readonly external?: boolean;
}

export interface IObjectStorage {
  putObject(input: PutObjectInput): Promise<void>;
  getSignedDownloadUrl(
    key: string,
    expiresInSeconds?: number,
    options?: SignedUrlOptions,
  ): Promise<string>;
  getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
    options?: SignedUrlOptions,
  ): Promise<string>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<{ contentLength: number; contentType: string } | null>;
  checkConnectivity(): Promise<void>;
}

import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
  type ContainerClient,
} from '@azure/storage-blob';
import { config } from './config.js';

export const PDF_CONTAINER = 'pdfs';
export const libContainerName = (libraryId: string) => `lib-${libraryId}`.toLowerCase();
export const origBlobName = (photoId: string) => `orig/${photoId}.jpg`;
export const thumbBlobName = (photoId: string) => `thumb/${photoId}.jpg`;
export const pdfBlobName = (orderId: string, version: number) => `${orderId}/v${version}.pdf`;

interface Parsed {
  accountName: string;
  accountKey: string;
  blobEndpoint: string;
  isDev: boolean;
}

let parsed: Parsed | null = null;

/** Parses the connection string once; handles Azurite's UseDevelopmentStorage=true shortcut. */
function creds(): Parsed {
  if (parsed) return parsed;
  const cs = config.storageConnectionString;
  if (cs === 'UseDevelopmentStorage=true') {
    parsed = {
      accountName: 'devstoreaccount1',
      accountKey:
        'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
      blobEndpoint: 'http://127.0.0.1:10000/devstoreaccount1',
      isDev: true,
    };
    return parsed;
  }
  const kv = Object.fromEntries(
    cs
      .split(';')
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf('=');
        return [p.slice(0, i), p.slice(i + 1)];
      }),
  );
  const accountName = kv.AccountName ?? '';
  const accountKey = kv.AccountKey ?? '';
  const blobEndpoint =
    kv.BlobEndpoint ??
    `${kv.DefaultEndpointsProtocol ?? 'https'}://${accountName}.blob.${kv.EndpointSuffix ?? 'core.windows.net'}`;
  parsed = {
    accountName,
    accountKey,
    blobEndpoint: blobEndpoint.replace(/\/$/, ''),
    isDev: /127\.0\.0\.1|localhost/.test(blobEndpoint),
  };
  return parsed;
}

let service: BlobServiceClient | null = null;
export function blobService(): BlobServiceClient {
  if (!service) service = BlobServiceClient.fromConnectionString(config.storageConnectionString);
  return service;
}

export function container(name: string): ContainerClient {
  return blobService().getContainerClient(name);
}

export async function ensureContainer(name: string): Promise<ContainerClient> {
  const c = container(name);
  await c.createIfNotExists();
  return c;
}

export async function deleteContainer(name: string): Promise<void> {
  await container(name).deleteIfExists();
}

export function blobUrl(containerName: string, blobName: string): string {
  return `${creds().blobEndpoint}/${containerName}/${blobName}`;
}

function sharedKey(): StorageSharedKeyCredential {
  const c = creds();
  return new StorageSharedKeyCredential(c.accountName, c.accountKey);
}

function protocol(): SASProtocol {
  return creds().isDev ? SASProtocol.HttpsAndHttp : SASProtocol.Https;
}

/** Per-blob write SAS (create + write only). The server chooses the blob name. */
export function writeSasUrl(containerName: string, blobName: string, minutes = 60): string {
  const expiresOn = new Date(Date.now() + minutes * 60_000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn: new Date(Date.now() - 5 * 60_000),
      expiresOn,
      protocol: protocol(),
    },
    sharedKey(),
  ).toString();
  return `${blobUrl(containerName, blobName)}?${sas}`;
}

/** Container-scoped read SAS, aligned to the day so URLs stay cacheable for the owner. */
export function containerReadSas(containerName: string): {
  baseUrl: string;
  sas: string;
  expiresAt: string;
} {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const expiresOn = new Date(start.getTime() + 2 * 24 * 60 * 60_000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      permissions: ContainerSASPermissions.parse('r'),
      startsOn: start,
      expiresOn,
      protocol: protocol(),
    },
    sharedKey(),
  ).toString();
  return {
    baseUrl: `${creds().blobEndpoint}/${containerName}`,
    sas,
    expiresAt: expiresOn.toISOString(),
  };
}

/** Short-lived per-blob read SAS with a download filename. */
export function readSasUrl(
  containerName: string,
  blobName: string,
  fileName: string,
  minutes = 15,
): string {
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(Date.now() - 5 * 60_000),
      expiresOn: new Date(Date.now() + minutes * 60_000),
      protocol: protocol(),
      contentDisposition: `attachment; filename="${fileName.replace(/["\r\n]/g, '')}"`,
      contentType: 'application/pdf',
    },
    sharedKey(),
  ).toString();
  return `${blobUrl(containerName, blobName)}?${sas}`;
}

export async function blobProperties(
  containerName: string,
  blobName: string,
): Promise<{ size: number; contentType: string } | null> {
  try {
    const p = await container(containerName).getBlobClient(blobName).getProperties();
    return { size: p.contentLength ?? 0, contentType: p.contentType ?? '' };
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 404) return null;
    throw e;
  }
}

/** Reads the first bytes of a blob (range read), or null if it does not exist. */
export async function readBlobHead(
  containerName: string,
  blobName: string,
  count: number,
): Promise<Buffer | null> {
  try {
    return await container(containerName).getBlobClient(blobName).downloadToBuffer(0, count);
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 404) return null;
    throw e;
  }
}

export async function uploadBuffer(
  containerName: string,
  blobName: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  await container(containerName)
    .getBlockBlobClient(blobName)
    .uploadData(data, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: 'public, max-age=31536000, immutable',
      },
    });
}

export async function deleteBlob(containerName: string, blobName: string): Promise<void> {
  await container(containerName)
    .deleteBlob(blobName)
    .catch(() => undefined);
}

export async function* listContainers(prefix: string): AsyncGenerator<string> {
  for await (const c of blobService().listContainers({ prefix })) yield c.name;
}

export async function* listBlobs(
  containerName: string,
  prefix?: string,
): AsyncGenerator<{ name: string; size: number; lastModified: Date }> {
  for await (const b of container(containerName).listBlobsFlat({ prefix })) {
    yield {
      name: b.name,
      size: b.properties.contentLength ?? 0,
      lastModified: b.properties.lastModified ?? new Date(0),
    };
  }
}

/** Sets Blob CORS so the browser can PUT/GET with SAS URLs. Called by scripts/storage-setup.ts. */
export async function setBlobCors(origins: string[]): Promise<void> {
  await blobService().setProperties({
    cors: [
      {
        allowedOrigins: origins.join(','),
        allowedMethods: 'GET,HEAD,PUT,OPTIONS',
        allowedHeaders: '*',
        exposedHeaders: 'ETag,x-ms-request-id,Content-Length',
        maxAgeInSeconds: 3600,
      },
    ],
  });
}

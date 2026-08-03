import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { AdvisoryPacketRecord } from './types.js';
import { AdvisoryPacketRecordSchema } from './schema.js';
import { PraetorError } from './errors.js';

export class StorageError extends PraetorError {
  constructor(detail: string, options?: ErrorOptions) {
    super('storage_error', detail, options);
    this.name = 'StorageError';
  }
}

export function advisoryStorePath(projectRoot = process.cwd()): string {
  return join(projectRoot, 'data', 'advisory-packets.ndjson');
}

export async function appendAdvisoryPacket(record: AdvisoryPacketRecord, storePath = advisoryStorePath()): Promise<void> {
  try {
    await mkdir(dirname(storePath), { recursive: true });
    await appendFile(storePath, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (error) {
    throw new StorageError('Unable to append advisory packet storage.', { cause: error });
  }
}

export async function readAdvisoryPackets(storePath = advisoryStorePath()): Promise<AdvisoryPacketRecord[]> {
  try {
    const raw = await readFile(storePath, 'utf8');
    const lines = raw
      .trim()
      .split(/\r?\n/)
      .map((line, index) => ({ line, index }))
      .filter(entry => entry.line.trim().length > 0);
    return lines.map(({ line, index }) => {
      let decoded: unknown;
      try {
        decoded = JSON.parse(line);
      } catch (error) {
        throw new StorageError(`Stored advisory packet line ${index + 1} is malformed JSON.`, { cause: error });
      }
      const result = AdvisoryPacketRecordSchema.safeParse(decoded);
      if (!result.success) {
        throw new StorageError(`Stored advisory packet line ${index + 1} failed schema validation.`);
      }
      return result.data as AdvisoryPacketRecord;
    });
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw new StorageError('Unable to read advisory packet storage.', { cause: error });
  }
}

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { appendAdvisoryPacket, readAdvisoryPackets, StorageError } from '../src/storage.js';

async function temporaryStore(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'praetor-storage-')), 'advisory-packets.ndjson');
}

describe('storage integrity handling', () => {
  it('returns empty history only when the store is missing', async () => {
    await expect(readAdvisoryPackets(await temporaryStore())).resolves.toEqual([]);
  });

  it('raises a typed error for malformed JSON', async () => {
    const storePath = await temporaryStore();
    await writeFile(storePath, '{"packet_id":"partial"', 'utf8');

    await expect(readAdvisoryPackets(storePath)).rejects.toMatchObject({
      name: 'StorageError',
      code: 'storage_error',
      message: expect.stringContaining('malformed JSON')
    });
  });

  it('raises a typed error for a partial-write line', async () => {
    const storePath = await temporaryStore();
    await writeFile(storePath, '{"packet_id":"complete"}\n{"packet_id":"truncated"', 'utf8');

    await expect(readAdvisoryPackets(storePath)).rejects.toBeInstanceOf(StorageError);
  });

  it('raises a typed error for malformed decoded records', async () => {
    const storePath = await temporaryStore();
    await writeFile(storePath, `${JSON.stringify({ packet_id: 'not-a-valid-record' })}\n`, 'utf8');

    await expect(readAdvisoryPackets(storePath)).rejects.toMatchObject({
      code: 'storage_error',
      message: expect.stringContaining('failed schema validation')
    });
  });

  it('raises a typed error for read failures instead of returning empty history', async () => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'praetor-storage-directory-'));

    await expect(readAdvisoryPackets(directoryPath)).rejects.toMatchObject({
      name: 'StorageError',
      code: 'storage_error'
    });
  });

  it('raises a typed error for append failures', async () => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'praetor-storage-append-directory-'));

    await expect(appendAdvisoryPacket({} as never, directoryPath)).rejects.toMatchObject({
      name: 'StorageError',
      code: 'storage_error',
      message: 'Unable to append advisory packet storage.'
    });
  });
});

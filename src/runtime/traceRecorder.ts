import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import * as z from 'zod/v4';

import { StorageError } from '../storage.js';

const MAX_TEXT_LENGTH = 1000;
const MAX_FIELDS = 25;

export const RuntimeTraceEventSchema = z.strictObject({
  trace_id: z.string().min(1).max(256),
  session_id: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  event_type: z.string().min(1).max(256),
  state: z.string().min(1).max(64),
  summary: z.string().min(1).max(MAX_TEXT_LENGTH),
  fields: z.record(z.string().max(256), z.string().max(MAX_TEXT_LENGTH)).refine(fields => Object.keys(fields).length <= MAX_FIELDS)
});

export type RuntimeTraceEvent = z.infer<typeof RuntimeTraceEventSchema>;

export interface TraceSink {
  append(event: RuntimeTraceEvent): Promise<void>;
}

export class TraceRecorder {
  private readonly events: RuntimeTraceEvent[] = [];

  constructor(private readonly sink?: TraceSink) {}

  async record(event: RuntimeTraceEvent): Promise<void> {
    const validation = RuntimeTraceEventSchema.safeParse(event);
    if (!validation.success) {
      throw new StorageError('Runtime trace event failed schema validation.');
    }
    this.events.push(validation.data);
    if (this.sink) {
      await this.sink.append(validation.data);
    }
  }

  snapshot(): RuntimeTraceEvent[] {
    return this.events.map(event => ({ ...event, fields: { ...event.fields } }));
  }
}

export class FileTraceSink implements TraceSink {
  constructor(private readonly path: string) {}

  async append(event: RuntimeTraceEvent): Promise<void> {
    const validation = RuntimeTraceEventSchema.safeParse(event);
    if (!validation.success) {
      throw new StorageError('Runtime trace event failed schema validation.');
    }
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(this.path, `${JSON.stringify(validation.data)}\n`, 'utf8');
    } catch (error) {
      throw new StorageError('Unable to append runtime trace storage.', { cause: error });
    }
  }
}

export async function readRuntimeTrace(path: string): Promise<RuntimeTraceEvent[]> {
  try {
    const raw = await readFile(path, 'utf8');
    if (raw.trim().length === 0) {
      return [];
    }
    return raw.trim().split(/\r?\n/).map((line, index) => {
      let decoded: unknown;
      try {
        decoded = JSON.parse(line);
      } catch (error) {
        throw new StorageError(`Stored runtime trace line ${index + 1} is malformed JSON.`, { cause: error });
      }
      const result = RuntimeTraceEventSchema.safeParse(decoded);
      if (!result.success) {
        throw new StorageError(`Stored runtime trace line ${index + 1} failed schema validation.`);
      }
      return result.data;
    });
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw new StorageError('Unable to read runtime trace storage.', { cause: error });
  }
}

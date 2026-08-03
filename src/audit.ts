import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as z from 'zod/v4';

import { StorageError } from './storage.js';

const MAX_IDENTIFIER_LENGTH = 256;
const MAX_TEXT_LENGTH = 5000;
const MAX_TOOL_CALLS = 50;

export const AuditEventSchema = z.strictObject({
  event_id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  timestamp: z.string().datetime(),
  session_id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  event_type: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  domain: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  source_boundary: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  claim_source: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  authorized_evidence_available: z.boolean(),
  tool_calls_used: z.array(z.string().min(1).max(MAX_IDENTIFIER_LENGTH)).max(MAX_TOOL_CALLS),
  shouldLog: z.literal(true),
  eventLogged: z.literal(true),
  recommended_action: z.string().min(1).max(MAX_TEXT_LENGTH),
  explanation: z.string().min(1).max(MAX_TEXT_LENGTH),
  prompt_hash: z.string().regex(/^[a-f0-9]{64}$/),
  answer_decision: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  evidence_boundary_decision: z.string().optional(),
  risk_level: z.string().optional(),
  risk_flags: z.array(z.string()).optional(),
  final_governance_decision: z.string().optional(),
  trace_id: z.string().optional(),
  reason_codes: z.array(z.string()).optional()
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export interface AuditEventSink {
  append(event: AuditEvent): Promise<void>;
}

export function auditEventStorePath(projectRoot = process.cwd()): string {
  return join(projectRoot, 'data', 'audit-events.ndjson');
}

export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt, 'utf8').digest('hex');
}

export function createAuditEventId(): string {
  return `audit-${randomUUID()}`;
}

export class FileAuditEventSink implements AuditEventSink {
  constructor(private readonly storePath = auditEventStorePath()) {}

  async append(event: AuditEvent): Promise<void> {
    const validation = AuditEventSchema.safeParse(event);
    if (!validation.success) {
      throw new StorageError('Audit event failed schema validation.');
    }

    try {
      await mkdir(dirname(this.storePath), { recursive: true });
      await appendFile(this.storePath, `${JSON.stringify(validation.data)}\n`, 'utf8');
    } catch (error) {
      throw new StorageError('Unable to append audit event storage.', { cause: error });
    }
  }
}

export async function readAuditEvents(storePath = auditEventStorePath()): Promise<AuditEvent[]> {
  try {
    const raw = await readFile(storePath, 'utf8');
    const lines = raw.trim().length === 0 ? [] : raw.trim().split(/\r?\n/);
    return lines.map((line, index) => {
      let decoded: unknown;
      try {
        decoded = JSON.parse(line);
      } catch (error) {
        throw new StorageError(`Stored audit event line ${index + 1} is malformed JSON.`, { cause: error });
      }
      const result = AuditEventSchema.safeParse(decoded);
      if (!result.success) {
        throw new StorageError(`Stored audit event line ${index + 1} failed schema validation.`);
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
    throw new StorageError('Unable to read audit event storage.', { cause: error });
  }
}

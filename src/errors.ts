export type ErrorCode =
  | 'schema_rejected'
  | 'governance_rejected'
  | 'storage_error'
  | 'adapter_error'
  | 'protocol66_input_error'
  | 'unavailable_adapter'
  | 'internal_error';

export class PraetorError extends Error {
  constructor(readonly code: ErrorCode, detail: string, options?: ErrorOptions) {
    super(detail, options);
    this.name = 'PraetorError';
  }
}

export function errorResult(error: unknown): { isError: true; content: [{ type: 'text'; text: string }] } {
  const praetorError = error instanceof PraetorError
    ? error
    : error instanceof Error && error.name === 'Protocol66InputError'
      ? new PraetorError('protocol66_input_error', 'Protocol 66 input was invalid.')
      : new PraetorError('internal_error', 'An internal error occurred.');
  if (!(error instanceof PraetorError)) {
    console.error('[internal_error]', error);
  }
  return {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify({ error: { code: praetorError.code, detail: praetorError.message } })
    }]
  };
}

export function safeTool<T extends { content: Array<{ type: string; text?: string }> }>(handler: () => Promise<T>): Promise<T | ReturnType<typeof errorResult>> {
  return handler().catch(error => {
    if (!(error instanceof PraetorError)) {
      console.error('[tool_error]', error);
    }
    return errorResult(error);
  });
}
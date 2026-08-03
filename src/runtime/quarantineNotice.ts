export interface QuarantineNotice {
  status: 'quarantined' | 'blocked';
  code: 'protocol_66_quarantine';
  message: string;
  reason: string;
  tool_access: 'disabled';
  output_mode: 'blocked';
  retry_allowed: false;
  human_review_required: true;
}

export function quarantineNotice(reason: string, status: 'quarantined' | 'blocked' = 'quarantined'): QuarantineNotice {
  return {
    status,
    code: 'protocol_66_quarantine',
    message: status === 'blocked'
      ? 'Tool execution is disabled pending human review.'
      : 'Agent output is blocked pending human review.',
    reason: reason.slice(0, 1000),
    tool_access: 'disabled',
    output_mode: 'blocked',
    retry_allowed: false,
    human_review_required: true
  };
}

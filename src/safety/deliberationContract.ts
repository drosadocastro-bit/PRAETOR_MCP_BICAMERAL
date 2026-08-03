export type DeliberatedActionType = 'read' | 'write' | 'retrieve' | 'submit' | 'system' | 'unknown';

export interface DeliberationContract {
  trace_id: string;
  session_id: string;
  intended_action: string;
  requested_tool?: string;
  action_type: DeliberatedActionType;
  reason_summary: string;
  expected_output_type: string;
  touches_restricted_resource: boolean;
  requires_human_review: boolean;
  retry_of_denied_action: boolean;
}

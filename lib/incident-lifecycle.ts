export const CLEAR_VOTES_REQUIRED = 3;

export type IncidentLifecycleUpdate = {
  confirmations: number;
  clearVotes: number;
  cleared: boolean;
};

export const AUDIT_QUEUE = 'audit-jobs';

export interface AuditJobPayload {
  auditId: string;
  target: {
    url?: string;
    apiEndpoints?: string[];
    dbConnectionString?: string;
    dockerHost?: string;
    openaiApiKey?: string;
  };
  categories: string[];
  organizationId: string;
  userId: string;
}

'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    super(`Firestore Permission Denied at ${context.path} during ${context.operation}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}

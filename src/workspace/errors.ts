export type WorkspaceErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'KEY_EXISTS'
  | 'KEY_INVALID'
  | 'PATH_UNSAFE'
  | 'BAD_REQUEST'
  | 'IO_ERROR';

export class WorkspaceError extends Error {
  constructor(
    public readonly code: WorkspaceErrorCode,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

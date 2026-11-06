export interface Actor {
  tenant: string;
  role: 'owner' | 'editor' | 'viewer';
}

export function resolveActor(_request: unknown): Actor {
  return { tenant: 'local', role: 'owner' };
}

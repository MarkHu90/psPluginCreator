import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateSpec } from '../../core/index';
import { WorkspaceError } from '../../workspace/errors';
import type { ProjectRef, WorkspaceStore } from '../../workspace/types';
import type { Actor } from '../actor';

export interface ProjectRouteDeps {
  store: WorkspaceStore;
  actor: (request: unknown) => Actor;
  maxFileBytes: number;
}

function isPublisher(
  value: unknown,
): value is { name: string; email: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { email?: unknown }).email === 'string'
  );
}

export function sendWorkspaceError(
  reply: FastifyReply,
  error: unknown,
): FastifyReply {
  if (error instanceof WorkspaceError) {
    const status: Record<WorkspaceError['code'], number> = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      KEY_EXISTS: 409,
      KEY_INVALID: 400,
      PATH_UNSAFE: 400,
      BAD_REQUEST: 400,
      IO_ERROR: 500,
    };
    return reply.code(status[error.code]).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? [],
      },
    });
  }
  return reply.code(500).send({
    error: {
      code: 'IO_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  });
}

export function registerProjectRoutes(
  app: FastifyInstance,
  deps: ProjectRouteDeps,
): void {
  const refOf = (request: FastifyRequest, key: string): ProjectRef => ({
    tenant: deps.actor(request).tenant,
    key,
  });

  app.get('/api/projects', async (request) => {
    const tenant = deps.actor(request).tenant;
    return { projects: await deps.store.list(tenant) };
  });

  app.post('/api/projects', async (request, reply) => {
    const body = request.body as
      | { key?: unknown; name?: unknown; publisher?: unknown }
      | undefined;
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'name is required.' },
      });
    }
    try {
      const tenant = deps.actor(request).tenant;
      const project = await deps.store.create(tenant, {
        key: typeof body.key === 'string' ? body.key : undefined,
        name: body.name,
        publisher: isPublisher(body.publisher) ? body.publisher : undefined,
      });
      const { spec } = await deps.store.readSpec({
        tenant,
        key: project.key,
      });
      return reply.code(201).send({ project, spec });
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.get('/api/projects/:key', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      const project = await deps.store.get(ref);
      const { spec } = await deps.store.readSpec(ref);
      const navBaseline = await deps.store.readNavBaseline(ref);
      return { project, spec, navBaseline };
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.put('/api/projects/:key/spec', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const body = request.body as
      | { spec?: unknown; revision?: unknown }
      | undefined;
    if (!body || body.spec === undefined || typeof body.revision !== 'number') {
      return reply.code(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: 'Body must include spec and numeric revision.',
        },
      });
    }
    try {
      return await deps.store.writeSpec(ref, body.spec, body.revision);
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.delete('/api/projects/:key', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      await deps.store.remove(ref);
      return reply.code(204).send();
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.post('/api/projects/:key/validate', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      const { spec } = await deps.store.readSpec(ref);
      const navBaseline = await deps.store.readNavBaseline(ref);
      const issues = validateSpec(spec, {
        previousNavigation: (navBaseline ?? undefined) as never,
      });
      return {
        issues,
        errors: issues.filter((issue) => issue.severity === 'error').length,
        warnings: issues.filter((issue) => issue.severity === 'warning').length,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const issues = [
          {
            severity: 'error' as const,
            code: 'SPEC_INVALID',
            message: 'plugin.json is not valid JSON.',
          },
        ];
        return { issues, errors: 1, warnings: 0 };
      }
      return sendWorkspaceError(reply, error);
    }
  });
}

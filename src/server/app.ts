import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import { validateSpec } from '../core/index';
import { LocalFsWorkspaceStore } from '../workspace/localFsStore';
import type { WorkspaceStore } from '../workspace/types';
import { resolveActor, type Actor } from './actor';
import { registerProjectRoutes } from './routes/projects';

export interface ServerOptions {
  workspacesDir?: string;
  store?: WorkspaceStore;
  actor?: (request: unknown) => Actor;
  maxFileBytes?: number;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const workspacesDir =
    options.workspacesDir ??
    process.env.WORKSPACES_DIR ??
    resolve(process.cwd(), 'workspaces');
  const store = options.store ?? new LocalFsWorkspaceStore(workspacesDir);
  const actor = options.actor ?? resolveActor;
  const maxFileBytes = options.maxFileBytes ?? 10 * 1024 * 1024;

  app.register(multipart, { limits: { fileSize: maxFileBytes } });

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/validate', async (request, reply) => {
    const body = request.body as
      | { spec?: unknown; previousNavigation?: unknown[] }
      | undefined;
    if (!body || body.spec === undefined) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'Body must include a spec.' },
      });
    }
    const issues = validateSpec(body.spec, {
      previousNavigation: body.previousNavigation as never,
    });
    return {
      issues,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    };
  });

  registerProjectRoutes(app, { store, actor, maxFileBytes });

  const here = dirname(fileURLToPath(import.meta.url));
  const webRoot = resolve(here, '../../dist/web');
  if (existsSync(webRoot)) {
    app.register(fastifyStatic, { root: webRoot, wildcard: false });
  }

  return app;
}

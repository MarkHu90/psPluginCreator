import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { validateSpec } from '../core/index';

export function buildServer() {
  const app = Fastify({ logger: false });

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

  const here = dirname(fileURLToPath(import.meta.url));
  const webRoot = resolve(here, '../../dist/web');
  if (existsSync(webRoot)) {
    // @fastify/static serves index.html for "/" when it exists.
    app.register(fastifyStatic, { root: webRoot, wildcard: false });
  }

  return app;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const app = buildServer();
  app
    .listen({ port: 5174, host: '127.0.0.1' })
    .then(() => console.log('Workbench API listening on http://127.0.0.1:5174'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

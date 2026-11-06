import { access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  buildZip,
  flattenNavigation,
  generatePlan,
  specSchema,
  validateOutput,
  validateSpec,
  type PluginSpec,
  type ValidationIssue,
  type ZipArtifact,
} from '../../core/index';
import { WorkspaceError } from '../../workspace/errors';
import type { ProjectRef, WorkspaceStore } from '../../workspace/types';
import type { Actor } from '../actor';
import { writeBuildAtomically } from '../build';

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

  app.post('/api/projects/:key/generate', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const body = request.body as { zip?: unknown } | undefined;
    const withZip = body?.zip !== false;

    try {
      const { spec: rawSpec } = await deps.store.readSpec(ref);
      const specIssues = validateSpec(rawSpec);
      if (specIssues.some((issue) => issue.severity === 'error')) {
        return reply.code(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Spec validation failed.',
            details: specIssues,
          },
        });
      }

      const spec = specSchema.parse(rawSpec) as unknown as PluginSpec;
      const rawFiles = new Map<string, Uint8Array>();
      const missing: ValidationIssue[] = [];
      for (const raw of spec.rawFiles) {
        try {
          rawFiles.set(raw.path, await deps.store.readFile(ref, raw.path));
        } catch {
          missing.push({
            severity: 'error',
            code: 'RAW_FILE_MISSING',
            message: `Raw file is missing: ${raw.path}`,
            path: raw.path,
          });
        }
      }
      if (missing.length) {
        return reply.code(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Raw files are missing.',
            details: missing,
          },
        });
      }

      const files = generatePlan(spec, { rawFiles });
      const zips = withZip
        ? {
            api: buildZip(files, 'api'),
            dbsetup: buildZip(files, 'dbsetup'),
            combined: buildZip(files, 'combined'),
          }
        : undefined;
      const outputIssues = validateOutput(files, { zip: zips?.combined });
      const issues = [...specIssues, ...outputIssues];
      if (issues.some((issue) => issue.severity === 'error')) {
        return reply.code(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Output validation failed.',
            details: issues,
          },
        });
      }

      await writeBuildAtomically(deps.store.buildDir(ref), files, zips);
      const navBaseline = flattenNavigation(spec.navigation);
      await deps.store.writeNavBaseline(ref, navBaseline);

      return {
        files: files.map((file) => file.path),
        artifacts: { api: withZip, dbsetup: withZip, combined: withZip },
        warnings: issues.filter((issue) => issue.severity === 'warning'),
        navBaseline,
      };
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.get('/api/projects/:key/download/:artifact', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const artifact = (request.params as { artifact: string })
      .artifact as ZipArtifact;
    if (!['api', 'dbsetup', 'combined'].includes(artifact)) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Unknown artifact.' },
      });
    }
    try {
      await deps.store.get(ref);
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
    const target = join(deps.store.buildDir(ref), `${artifact}.zip`);
    try {
      await access(target);
    } catch {
      return reply.code(409).send({
        error: { code: 'BUILD_MISSING', message: 'Run generate first.' },
      });
    }
    reply.header(
      'Content-Disposition',
      `attachment; filename="${ref.key}-${artifact}.zip"`,
    );
    reply.type('application/zip');
    return reply.send(createReadStream(target));
  });

  app.get('/api/projects/:key/files', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      return { files: await deps.store.listFiles(ref) };
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.put('/api/projects/:key/files', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const path = (request.query as { path?: string }).path;
    if (!path) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'path query is required.' },
      });
    }
    try {
      const upload = await request.file();
      if (!upload) {
        return reply.code(400).send({
          error: { code: 'BAD_REQUEST', message: 'file is required.' },
        });
      }
      const bytes = await upload.toBuffer();
      await deps.store.writeFile(ref, path, bytes);
      const files = await deps.store.listFiles(ref);
      const file = files.find((entry) => entry.path === path) ?? {
        path,
        size: bytes.length,
        updatedAt: new Date().toISOString(),
      };
      return reply.code(201).send({ file });
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.code(413).send({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File exceeds ${deps.maxFileBytes} bytes.`,
          },
        });
      }
      return sendWorkspaceError(reply, error);
    }
  });

  app.delete('/api/projects/:key/files', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const path = (request.query as { path?: string }).path;
    if (!path) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'path query is required.' },
      });
    }
    try {
      await deps.store.deleteFile(ref, path);
      return reply.code(204).send();
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });
}

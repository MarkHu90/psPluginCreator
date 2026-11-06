import type { PluginSpec } from '../spec/types';
import { generateDbSchema } from './dbSchema';
import { generateMessageKeys } from './messageKeys';
import { generateNavigation } from './navigation';
import { generatePages } from './pages';
import { generatePermissionMappings } from './permissions';
import { generatePluginXml } from './pluginXml';
import { generatePowerQueries } from './powerQueries';
import { generateWildcards } from './wildcards';

export interface GeneratedFile {
  path: string;
  content: string | Uint8Array;
  source: 'generated' | 'raw';
  encoding?: 'utf8' | 'binary';
}

export interface PlanOptions {
  /** Raw file contents, keyed by the path in spec.rawFiles. */
  rawFiles?: Map<string, string | Uint8Array>;
}

export class DuplicateGeneratedPathError extends Error {
  constructor(path: string) {
    super(`Two generated files target the same path: ${path}`);
    this.name = 'DuplicateGeneratedPathError';
  }
}

export class MissingRawContentError extends Error {
  constructor(path: string) {
    super(`Raw file content is missing for ${path}`);
    this.name = 'MissingRawContentError';
  }
}

export function generatePlan(
  spec: PluginSpec,
  options: PlanOptions = {},
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const seen = new Set<string>();

  const add = (
    path: string,
    content: string | Uint8Array,
    source: GeneratedFile['source'] = 'generated',
  ) => {
    if (seen.has(path)) throw new DuplicateGeneratedPathError(path);
    seen.add(path);
    files.push({
      path,
      content,
      source,
      encoding: typeof content === 'string' ? 'utf8' : 'binary',
    });
  };

  add('api/plugin.xml', generatePluginXml(spec, 'api'));
  add('dbsetup/plugin.xml', generatePluginXml(spec, 'db'));

  for (const file of generateDbSchema(spec)) {
    add(`dbsetup/user_schema_root/${file.filename}`, file.content);
  }
  for (const file of generateNavigation(spec)) {
    add(`api/pagecataloging/${file.filename}`, file.content);
  }
  for (const file of generatePowerQueries(spec)) {
    add(`api/queries_root/${file.filename}`, file.content);
  }
  for (const file of generatePermissionMappings(spec)) {
    add(`api/permissions_root/${file.filename}`, file.content);
  }
  for (const file of generateMessageKeys(spec)) {
    add(`api/MessageKeys/${file.filename}`, file.content);
  }
  for (const file of generatePages(spec)) {
    add(`api/web_root/${file.path}`, file.content);
  }
  for (const file of generateWildcards(spec)) {
    add(`api/web_root/wildcards/${file.filename}`, file.content);
  }
  for (const raw of spec.rawFiles) {
    const content = options.rawFiles?.get(raw.path);
    if (content === undefined) throw new MissingRawContentError(raw.path);
    add(raw.path, content, 'raw');
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

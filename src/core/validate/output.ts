import { XMLValidator } from 'fast-xml-parser';
import { strFromU8, unzipSync } from 'fflate';
import type { GeneratedFile } from '../generate/plan';
import type { ValidationIssue } from './index';

export interface OutputValidateOptions {
  zip?: Uint8Array;
}

function contentAsString(content: string | Uint8Array): string {
  return typeof content === 'string' ? content : strFromU8(content);
}

function isSafeZipEntry(name: string): boolean {
  if (!name || name.startsWith('/') || name.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(name)) return false;
  if (name.includes('\\')) return false;
  return !name.split('/').includes('..');
}

function countMatches(text: string, re: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of text.matchAll(re)) {
    const key = match[1] ?? '';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function tagIssues(path: string, text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (message: string) =>
    issues.push({
      severity: 'error',
      code: 'OUTPUT_TAG_UNBALANCED',
      message,
      path,
      target: { type: 'page', id: path },
    });

  const namedOpen = countMatches(text, /~\[if#([A-Za-z0-9_]+)\./g);
  const namedClose = countMatches(text, /\[\/if#([A-Za-z0-9_]+)\]/g);
  for (const [name, count] of namedOpen) {
    if ((namedClose.get(name) ?? 0) !== count) {
      push(`Unbalanced ~[if#${name}] / [/if#${name}] in ${path}.`);
    }
  }
  for (const [name] of namedClose) {
    if (!namedOpen.has(name)) {
      push(`Closing [/if#${name}] without opening in ${path}.`);
    }
  }

  const unnamedOpen = (text.match(/~\[if\./g) ?? []).length;
  const unnamedClose = (text.match(/\[\/if\]/g) ?? []).length;
  if (unnamedOpen !== unnamedClose) {
    push(`Unbalanced ~[if] / [/if] in ${path}.`);
  }

  const tlistOpen = (text.match(/~\[tlist_sql;/g) ?? []).length;
  const tlistClose = (text.match(/\[\/tlist_sql\]/g) ?? []).length;
  if (tlistOpen !== tlistClose) {
    push(`Unbalanced ~[tlist_sql] / [/tlist_sql] in ${path}.`);
  }

  return issues;
}

export function validateOutput(
  files: GeneratedFile[],
  options: OutputValidateOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const text = contentAsString(file.content);

    if (file.path.endsWith('.xml') || file.path.endsWith('plugin.xml')) {
      const result = XMLValidator.validate(text);
      if (result !== true) {
        issues.push({
          severity: 'error',
          code: 'OUTPUT_XML_INVALID',
          message: `Generated XML is invalid at ${file.path}: ${result.err.msg}`,
          path: file.path,
          target: { type: 'generatedFile', id: file.path },
        });
      }
      if (file.path.endsWith('plugin.xml') && !text.includes('<plugin')) {
        issues.push({
          severity: 'error',
          code: 'OUTPUT_PLUGIN_XML_MISSING',
          message: `Generated ${file.path} does not contain a <plugin> root.`,
          path: file.path,
          target: { type: 'generatedFile', id: file.path },
        });
      }
      continue;
    }

    if (file.path.endsWith('.json')) {
      // Page JSON endpoints are PS-HTML templates, not parseable JSON on disk.
      if (text.includes('~[tlist_sql') || text.includes('~[if') || text.includes('~(')) {
        continue;
      }
      try {
        const parsed = JSON.parse(text);
        if (
          file.path.includes('pagecataloging/') &&
          (!parsed || !Array.isArray(parsed.pages))
        ) {
          issues.push({
            severity: 'error',
            code: 'OUTPUT_PAGECATALOG_INVALID',
            message: `Generated pagecataloging JSON ${file.path} must contain a pages array.`,
            path: file.path,
            target: { type: 'generatedFile', id: file.path },
          });
        }
      } catch (error) {
        issues.push({
          severity: 'error',
          code: 'OUTPUT_JSON_INVALID',
          message: `Generated JSON is invalid at ${file.path}: ${(error as Error).message}`,
          path: file.path,
          target: { type: 'generatedFile', id: file.path },
        });
      }
      continue;
    }

    if (file.path.endsWith('.html')) {
      issues.push(...tagIssues(file.path, text));
    }
  }

  if (options.zip) {
    try {
      const entries = unzipSync(options.zip);
      for (const name of Object.keys(entries)) {
        if (!isSafeZipEntry(name)) {
          issues.push({
            severity: 'error',
            code: 'OUTPUT_ZIP_UNSAFE_PATH',
            message: `Zip entry "${name}" is absolute or contains "..".`,
            path: 'zip',
            target: { type: 'zip', id: name },
          });
        }
      }
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'OUTPUT_ZIP_INVALID',
        message: `Generated zip is invalid: ${(error as Error).message}`,
        path: 'zip',
        target: { type: 'zip' },
      });
    }
  }

  return issues;
}

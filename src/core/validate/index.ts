import { specSchema } from '../spec/schema';
import {
  extractQueryFields,
  isExcludedField,
  type PowerQueryFileLike,
} from './powerQueryParser';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
  target?: { type: string; id?: string };
}

export type PageContext =
  | 'admin'
  | 'adminStudent'
  | 'teacher'
  | 'teacherStudent'
  | 'guardian'
  | 'student';

interface PageLike {
  id?: string;
  kind?: string;
  context?: PageContext;
  path?: string;
  table?: string;
  columns?: Array<{ column?: string }>;
  fields?: Array<{ column?: string }>;
  apiResources?: string[];
}

interface PermissionResourceLike {
  path?: string;
  allow?: string;
}

interface PermissionMappingLike {
  page?: string;
  resources?: PermissionResourceLike[];
}

interface PermissionMappingFileLike {
  filename?: string;
  mappings?: PermissionMappingLike[];
}

interface TableLike {
  extensionName?: string;
  schemaFile?: string;
  tableName?: string;
  childName?: string;
  comment?: string;
  fields?: Array<{ name?: string; type?: string; length?: number }>;
}

export interface NavigationEntryLike {
  htmlID?: string;
  version?: string;
  children?: NavigationEntryLike[];
  [key: string]: unknown;
}

interface NavigationFileLike {
  filename?: string;
  contextType?: string;
  entries?: NavigationEntryLike[];
}

interface PluginLike {
  name?: string;
  version?: string;
  description?: string;
  navVersion?: string;
  publisher?: { name?: string; email?: string };
}

interface MessageKeyFileLike {
  filename?: string;
  locale?: string;
  entries?: Array<{ key?: string; value?: string }>;
}

interface RawFileLike {
  path?: string;
  note?: string;
}

interface WildcardLike {
  filename?: string;
  kind?: string;
  content?: string;
}

export interface AccessFieldLike {
  table?: string;
  field?: string;
  access?: string;
}

interface SpecLike {
  key?: string;
  pages?: PageLike[];
  tables?: TableLike[];
  navigation?: NavigationFileLike[];
  plugin?: PluginLike;
  powerQueries?: PowerQueryFileLike[];
  accessRequest?: AccessFieldLike[];
  messageKeys?: MessageKeyFileLike[];
  rawFiles?: RawFileLike[];
  wildcards?: WildcardLike[];
  permissionMappings?: PermissionMappingFileLike[];
}

const HTTP_VERBS = new Set(['get', 'post', 'put', 'delete']);
const KNOWN_PORTAL_PAGES = new Set([
  '/admin/home.html',
  '/teachers/home.html',
  '/guardian/home.html',
  '/student/home.html',
]);

function isPowerQueryPath(path: string): boolean {
  return path.startsWith('/ws/schema/query/');
}

function validatePermissionMappings(
  spec: SpecLike,
  issues: ValidationIssue[],
): void {
  const pageUrls = new Map<string, PageLike>();
  for (const page of spec.pages ?? []) {
    if (page.path) pageUrls.set(`/${page.path.replace(/\\/g, '/')}`, page);
  }

  const filenames = new Set<string>();
  let mappingCount = 0;

  for (const file of spec.permissionMappings ?? []) {
    const filename = file.filename?.trim() ?? '';
    if (
      !filename ||
      !isSafeRelativePath(filename) ||
      filename.includes('/') ||
      !filename.endsWith('.xml')
    ) {
      issues.push({
        severity: 'error',
        code: 'PERMISSION_FILE_INVALID',
        message: `Permission mapping filename "${filename}" must be a safe .xml filename.`,
        path: `permissionMappings.${filename}.filename`,
        target: { type: 'permissionMapping' },
      });
    } else if (filenames.has(filename)) {
      issues.push({
        severity: 'error',
        code: 'PERMISSION_FILE_DUPLICATE',
        message: `Permission mapping filename "${filename}" is duplicated.`,
        path: `permissionMappings.${filename}.filename`,
        target: { type: 'permissionMapping' },
      });
    } else {
      filenames.add(filename);
    }

    for (const [mappingIndex, mapping] of (file.mappings ?? []).entries()) {
      const page = mapping.page?.trim() ?? '';
      const target = { type: 'permissionMapping', id: filename };
      const mappingPath = `permissionMappings.${filename}.mappings.${mappingIndex}`;
      mappingCount += 1;

      if (
        !page ||
        !isSafeRelativePath(page.slice(1)) ||
        !/^\/(?:admin|teachers|guardian|student)\//.test(page)
      ) {
        issues.push({
          severity: 'error',
          code: 'PERMISSION_PAGE_INVALID',
          message: `Permission mapping page "${page}" must start with /admin/, /teachers/, /guardian/, or /student/.`,
          path: `${mappingPath}.page`,
          target,
        });
      } else if (!pageUrls.has(page) && !KNOWN_PORTAL_PAGES.has(page)) {
        issues.push({
          severity: 'warning',
          code: 'PERMISSION_PAGE_UNKNOWN',
          message: `Permission mapping page "${page}" is not a page in this spec and not a known portal home page.`,
          path: `${mappingPath}.page`,
          target,
        });
      }

      for (const [resourceIndex, resource] of (mapping.resources ?? []).entries()) {
        const resourcePath = resource.path?.trim() ?? '';
        const allow = resource.allow?.toLowerCase() ?? 'get';
        const resourceTarget = { type: 'permissionMapping', id: resourcePath };
        const resourcePathLabel = `${mappingPath}.resources.${resourceIndex}`;

        if (!resourcePath.startsWith('/ws/')) {
          issues.push({
            severity: 'error',
            code: 'PERMISSION_RESOURCE_INVALID',
            message: `Permission mapping resource "${resourcePath}" must start with /ws/.`,
            path: `${resourcePathLabel}.path`,
            target: resourceTarget,
          });
          continue;
        }

        if (resource.allow !== undefined && !HTTP_VERBS.has(allow)) {
          issues.push({
            severity: 'error',
            code: 'PERMISSION_RESOURCE_INVALID',
            message: `Permission mapping allow "${resource.allow}" must be get, post, put, or delete.`,
            path: `${resourcePathLabel}.allow`,
            target: resourceTarget,
          });
          continue;
        }

        if (isPowerQueryPath(resourcePath) && allow !== 'post') {
          issues.push({
            severity: 'error',
            code: 'PERMISSION_METHOD_MISSING',
            message: `PowerQuery resource "${resourcePath}" must be mapped with allow="post".`,
            path: `${resourcePathLabel}.allow`,
            target: resourceTarget,
          });
        }
      }
    }
  }

  if (mappingCount === 0) {
    for (const page of spec.pages ?? []) {
      if (page.apiResources?.length) {
        issues.push({
          severity: 'error',
          code: 'PERMISSION_MAPPING_MISSING',
          message: `Page "${page.id}" declares apiResources but the spec has no permission mappings.`,
          path: `pages.${page.id}.apiResources`,
          target: { type: 'page', id: page.id },
        });
      }
    }
    return;
  }

  for (const page of spec.pages ?? []) {
    if (!page.apiResources?.length || !page.path) continue;
    const pageUrl = `/${page.path.replace(/\\/g, '/')}`;
    const pageMappings = (spec.permissionMappings ?? [])
      .flatMap((file) => file.mappings ?? [])
      .filter((mapping) => mapping.page === pageUrl);
    const mappedResources = new Map<string, string | undefined>();
    for (const mapping of pageMappings) {
      for (const resource of mapping.resources ?? []) {
        if (resource.path) mappedResources.set(resource.path, resource.allow);
      }
    }

    for (const resourcePath of page.apiResources) {
      if (!mappedResources.has(resourcePath)) {
        issues.push({
          severity: 'error',
          code: 'PERMISSION_MAPPING_MISSING',
          message: `Page "${page.id}" uses "${resourcePath}" but no permission mapping maps it.`,
          path: `pages.${page.id}.apiResources`,
          target: { type: 'page', id: page.id },
        });
      } else if (
        isPowerQueryPath(resourcePath) &&
        String(mappedResources.get(resourcePath) ?? 'get').toLowerCase() !== 'post'
      ) {
        issues.push({
          severity: 'error',
          code: 'PERMISSION_METHOD_MISSING',
          message: `Page "${page.id}" invokes PowerQuery "${resourcePath}" but its permission mapping is not allow="post".`,
          path: `pages.${page.id}.apiResources`,
          target: { type: 'page', id: page.id },
        });
      }
    }
  }
}

const CORE_TABLES = new Set([
  'STUDENTS',
  'SCHOOLS',
  'SECTIONS',
  'CC',
  'COURSES',
  'TERMS',
  'USERS',
  'SCHOOLSTAFF',
  'TEACHERS',
  'ATTENDANCE',
  'DAILYATTENDANCE',
  'STOREDGRADES',
  'STUDENTCOREFIELDS',
  'PSM_ASSIGNMENT',
  'PSM_ASSIGNMENT_SCORE',
  'PSM_SECTION',
  'PSM_STUDENT',
  'PSM_TEACHER',
  'PSM_COURSE',
  'PSM_GRADE_SCALE',
  'FEE',
  'FEES',
  'FEE_TRANSACTION',
  'STUDENTTEST',
  'STUDENTTESTSCORE',
  'GUARDIAN',
  'GUARDIANSTUDENT',
  'GEN',
  'DUAL',
]);

function isSafeRelativePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  if (path.includes('\\')) return false;
  return !path.split('/').includes('..');
}

function findTable(
  spec: SpecLike,
  tableName: string | undefined,
): TableLike | undefined {
  if (!tableName) return undefined;
  const key = tableName.toUpperCase();
  return (spec.tables ?? []).find(
    (table) => table.tableName?.toUpperCase() === key,
  );
}

const PAGE_CONTEXTS = new Set<PageContext>([
  'admin',
  'adminStudent',
  'teacher',
  'teacherStudent',
  'guardian',
  'student',
]);

const PAGE_KINDS = new Set([
  'list',
  'edit',
  'settings',
  'dashboard',
  'custom',
  'raw',
]);

function validatePages(spec: SpecLike, issues: ValidationIssue[]): void {
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();

  for (const page of spec.pages ?? []) {
    const target = { type: 'page', id: page.id };
    const pageLabel = page.id ?? '(missing id)';

    if (!page.id) {
      issues.push({
        severity: 'error',
        code: 'PAGE_ID_REQUIRED',
        message: 'Every page must have an id.',
        path: 'pages',
        target,
      });
    } else if (seenIds.has(page.id)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_DUPLICATE_ID',
        message: `Page id "${page.id}" is duplicated.`,
        path: `pages.${page.id}.id`,
        target,
      });
    } else {
      seenIds.add(page.id);
    }

    if (!page.path) {
      issues.push({
        severity: 'error',
        code: 'PAGE_PATH_REQUIRED',
        message: `Page "${pageLabel}" must have a path.`,
        path: `pages.${pageLabel}.path`,
        target,
      });
      continue;
    }

    const path = page.path.replace(/\\/g, '/');
    if (!isSafeRelativePath(path)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_PATH_UNSAFE',
        message: `Page path "${page.path}" must be relative and must not contain "..".`,
        path: `pages.${pageLabel}.path`,
        target,
      });
    }

    if (seenPaths.has(path)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_DUPLICATE_PATH',
        message: `Page path "${path}" is used by more than one page.`,
        path: `pages.${pageLabel}.path`,
        target,
      });
    } else {
      seenPaths.add(path);
    }

    if (!page.context || !PAGE_CONTEXTS.has(page.context)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_CONTEXT_INVALID',
        message: `Page "${pageLabel}" has unsupported context "${page.context ?? ''}".`,
        path: `pages.${pageLabel}.context`,
        target,
      });
    }

    if (!page.kind || !PAGE_KINDS.has(page.kind)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_KIND_INVALID',
        message: `Page "${pageLabel}" has unsupported kind "${page.kind ?? ''}".`,
        path: `pages.${pageLabel}.kind`,
        target,
      });
    }

    if (page.context && page.context in CONTEXT_ROOT) {
      if (page.context === 'student' && path.startsWith('students/')) {
        issues.push({
          severity: 'error',
          code: 'PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN',
          message:
            'Student-context pages must live under guardian/; this instance has no students/ folder.',
          path: `pages.${pageLabel}.path`,
          target,
        });
      } else {
        const root = CONTEXT_ROOT[page.context];
        if (root && !path.startsWith(`${root}/`)) {
          issues.push({
            severity: 'error',
            code: 'PAGE_CONTEXT_PATH',
            message: `Page context "${page.context}" requires a path under "${root}/".`,
            path: `pages.${pageLabel}.path`,
            target,
          });
        }
      }
    }

    if (page.kind === 'list' && !(page.columns?.length ?? 0)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_LIST_NO_COLUMNS',
        message: `List page "${pageLabel}" must declare at least one column.`,
        path: `pages.${pageLabel}.columns`,
        target,
      });
    }

    if (page.kind === 'edit' && !(page.fields?.length ?? 0)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_EDIT_NO_FIELDS',
        message: `Edit page "${pageLabel}" must declare at least one field.`,
        path: `pages.${pageLabel}.fields`,
        target,
      });
    }

    if (page.kind === 'settings' && !(page.fields?.length ?? 0)) {
      issues.push({
        severity: 'error',
        code: 'PAGE_SETTINGS_NO_FIELDS',
        message: `Settings page "${pageLabel}" must declare at least one field.`,
        path: `pages.${pageLabel}.fields`,
        target,
      });
    }

    if (page.kind === 'list' || page.kind === 'edit' || page.kind === 'settings') {
      if (!page.table) {
        issues.push({
          severity: 'error',
          code: 'PAGE_TABLE_REQUIRED',
          message: `Page "${pageLabel}" (${page.kind}) must bind a table.`,
          path: `pages.${pageLabel}.table`,
          target,
        });
        continue;
      }

      const bound = findTable(spec, page.table);
      if (!bound) {
        if (CORE_TABLES.has(page.table.toUpperCase())) {
          issues.push({
            severity: 'warning',
            code: 'PAGE_TABLE_CORE_UNSUPPORTED',
            message: `Page "${pageLabel}" binds core table "${page.table}". The v1 generator only emits list/edit/settings pages for extension tables in tables[]; use a custom/raw page or add the table definition.`,
            path: `pages.${pageLabel}.table`,
            target,
          });
          continue;
        }
        issues.push({
          severity: 'error',
          code: 'PAGE_TABLE_UNKNOWN',
          message: `Page "${pageLabel}" binds unknown table "${page.table}".`,
          path: `pages.${pageLabel}.table`,
          target,
        });
        continue;
      }

      if (bound) {
        const columns = new Set(
          (bound.fields ?? []).map((field) => field.name?.toUpperCase()),
        );
        const referenced =
          page.kind === 'list'
            ? (page.columns ?? []).map((column) => column.column)
            : (page.fields ?? []).map((field) => field.column);
        for (const column of referenced) {
          if (!column) continue;
          if (!columns.has(column.toUpperCase())) {
            issues.push({
              severity: 'error',
              code: 'PAGE_FIELD_UNKNOWN',
              message: `Page "${pageLabel}" references "${column}", which is not a column of "${page.table}".`,
              path: `pages.${pageLabel}.${page.kind === 'list' ? 'columns' : 'fields'}`,
              target,
            });
          }
        }
      }
    }
  }
}

export interface ValidateOptions {
  /**
   * Navigation entries from the previous build/import, used to prove that a
   * changed entry received a higher version. Without this, only presence and
   * format can be checked.
   */
  previousNavigation?: NavigationEntryLike[];
}

const CONTEXT_ROOT: Record<PageContext, string> = {
  admin: 'admin',
  adminStudent: 'admin',
  teacher: 'teachers',
  teacherStudent: 'teachers',
  guardian: 'guardian',
  // 本项目的学生门户与家长门户共用 /guardian/
  student: 'guardian',
};

const NAV_VERSION_RE = /^\d+(?:\.\d+){0,3}$/;

const FINGERPRINT_FIELDS = [
  'title',
  'pageURL',
  'sortOrder',
  'parentHTMLID',
  'districtLevelContext',
  'contextType',
  'requiredContext',
  'isNewTab',
  'isLandingPage',
  'checkParams',
] as const;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(',')}}`;
}

export function navigationFingerprint(entry: NavigationEntryLike): string {
  const picked: Record<string, unknown> = {};
  for (const field of FINGERPRINT_FIELDS) picked[field] = entry[field];
  return stableStringify(picked);
}

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map((n) => Number(n));
  const right = b.split('.').map((n) => Number(n));
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function walkNavigation(
  entries: NavigationEntryLike[],
  visit: (entry: NavigationEntryLike) => void,
): void {
  for (const entry of entries) {
    visit(entry);
    if (entry.children?.length) walkNavigation(entry.children, visit);
  }
}

const IDENTIFIER_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

function normalizePackagePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.startsWith('api/') ? normalized.slice('api/'.length) : normalized;
}

function validatePackage(spec: SpecLike, issues: ValidationIssue[]): void {
  const key = String(spec.key ?? '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    issues.push({
      severity: 'error',
      code: 'KEY_INVALID',
      message: `Workspace key "${key}" must match ^[a-z0-9][a-z0-9-]*$.`,
      path: 'key',
      target: { type: 'plugin' },
    });
  }

  const plugin = spec.plugin ?? {};
  if (!plugin.name || !String(plugin.name).trim()) {
    issues.push({
      severity: 'error',
      code: 'PLUGIN_NAME_REQUIRED',
      message: 'plugin.name is required.',
      path: 'plugin.name',
      target: { type: 'plugin' },
    });
  } else if (String(plugin.name).length > 40) {
    issues.push({
      severity: 'error',
      code: 'PLUGIN_NAME_TOO_LONG',
      message: 'plugin.name must be 40 characters or fewer.',
      path: 'plugin.name',
      target: { type: 'plugin' },
    });
  }

  if (
    !plugin.publisher?.name ||
    !String(plugin.publisher.name).trim() ||
    !plugin.publisher?.email ||
    !String(plugin.publisher.email).trim()
  ) {
    issues.push({
      severity: 'error',
      code: 'PUBLISHER_INVALID',
      message: 'plugin.publisher.name and plugin.publisher.email are required.',
      path: 'plugin.publisher',
      target: { type: 'plugin' },
    });
  }

  const messageFilenames = new Set<string>();
  for (const file of spec.messageKeys ?? []) {
    const filename = file.filename?.trim() ?? '';
    if (
      !filename ||
      !isSafeRelativePath(filename) ||
      filename.includes('/') ||
      !filename.endsWith('.properties')
    ) {
      issues.push({
        severity: 'error',
        code: 'MESSAGE_KEY_FILENAME_INVALID',
        message: `MessageKeys filename "${filename}" must be a safe .properties filename.`,
        path: `messageKeys.${filename}.filename`,
        target: { type: 'messageKey' },
      });
    } else if (messageFilenames.has(filename)) {
      issues.push({
        severity: 'error',
        code: 'MESSAGE_KEY_DUPLICATE_FILE',
        message: `MessageKeys filename "${filename}" is duplicated.`,
        path: `messageKeys.${filename}.filename`,
        target: { type: 'messageKey' },
      });
    } else {
      messageFilenames.add(filename);
    }

    const keys = new Set<string>();
    for (const [index, entry] of (file.entries ?? []).entries()) {
      const entryKey = entry.key?.trim() ?? '';
      if (!entryKey) {
        issues.push({
          severity: 'error',
          code: 'MESSAGE_KEY_INVALID',
          message: `MessageKeys entry in "${filename}" is missing a key.`,
          path: `messageKeys.${filename}.entries.${index}`,
          target: { type: 'messageKey' },
        });
        continue;
      }
      if (keys.has(entryKey)) {
        issues.push({
          severity: 'error',
          code: 'MESSAGE_KEY_DUPLICATE_KEY',
          message: `MessageKeys key "${entryKey}" is duplicated in "${filename}".`,
          path: `messageKeys.${filename}.${entryKey}`,
          target: { type: 'messageKey' },
        });
      } else {
        keys.add(entryKey);
      }
    }
  }

  for (const wildcard of spec.wildcards ?? []) {
    const filename = wildcard.filename?.trim() ?? '';
    if (
      !filename ||
      !isSafeRelativePath(filename) ||
      filename.includes('/') ||
      !filename.endsWith('.txt')
    ) {
      issues.push({
        severity: 'error',
        code: 'WILDCARD_FILENAME_INVALID',
        message: `Wildcard filename "${filename}" must be a safe .txt filename.`,
        path: `wildcards.${filename}.filename`,
        target: { type: 'wildcard' },
      });
    }
  }

  const generated = new Set<string>(['plugin.xml']);
  for (const nav of spec.navigation ?? []) {
    if (nav.filename) generated.add(`pagecataloging/${nav.filename}`);
  }
  for (const file of spec.messageKeys ?? []) {
    if (file.filename) generated.add(`MessageKeys/${file.filename}`);
  }
  for (const file of spec.powerQueries ?? []) {
    if (file.filename) generated.add(`queries_root/${file.filename}`);
  }
  for (const table of spec.tables ?? []) {
    const schemaPath = `user_schema_root/${table.schemaFile || `${table.extensionName}.xml`}`;
    generated.add(`dbsetup/${schemaPath}`);
    generated.add(schemaPath);
  }
  for (const page of spec.pages ?? []) {
    if (page.kind === 'raw' || !page.path) continue;
    const pagePath = normalizePackagePath(page.path);
    generated.add(pagePath);
    if (!pagePath.startsWith('web_root/')) {
      generated.add(`web_root/${pagePath}`);
    }
  }
  for (const wildcard of spec.wildcards ?? []) {
    if (wildcard.filename) {
      generated.add(`web_root/wildcards/${wildcard.filename}`);
    }
  }

  const rawPaths = new Set<string>();
  for (const raw of spec.rawFiles ?? []) {
    const path = raw.path?.trim() ?? '';
    const normalized = normalizePackagePath(path);
    const target = { type: 'raw', id: path };

    if (!path || !isSafeRelativePath(path)) {
      issues.push({
        severity: 'error',
        code: 'RAW_PATH_UNSAFE',
        message: `Raw file path "${path}" must be relative and must not contain "..".`,
        path: `rawFiles.${path}`,
        target,
      });
      continue;
    }

    if (rawPaths.has(normalized)) {
      issues.push({
        severity: 'error',
        code: 'RAW_PATH_DUPLICATE',
        message: `Raw file path "${path}" is duplicated.`,
        path: `rawFiles.${path}`,
        target,
      });
      continue;
    }
    rawPaths.add(normalized);

    if (generated.has(normalized)) {
      issues.push({
        severity: 'error',
        code: 'RAW_PATH_CONFLICT',
        message: `Raw file "${path}" collides with a generated file at "${normalized}".`,
        path: `rawFiles.${path}`,
        target,
      });
    }
  }

  for (const page of spec.pages ?? []) {
    if (page.kind !== 'raw' || !page.path) continue;
    const pagePath = normalizePackagePath(page.path);
    const candidates = new Set([pagePath]);
    if (!pagePath.startsWith('web_root/')) candidates.add(`web_root/${pagePath}`);
    if (![...candidates].some((candidate) => rawPaths.has(candidate))) {
      issues.push({
        severity: 'error',
        code: 'RAW_PAGE_MISSING_FILE',
        message: `Raw page "${page.id}" points to "${page.path}", which is not in rawFiles.`,
        path: `pages.${page.id}.path`,
        target: { type: 'page', id: page.id },
      });
    }
  }
}

function validateTables(spec: SpecLike, issues: ValidationIssue[]): void {
  const tableNames = new Set<string>();
  const schemaFiles = new Map<string, string>();

  for (const [index, table] of (spec.tables ?? []).entries()) {
    const extensionName = table.extensionName?.trim() ?? '';
    const tableName = table.tableName?.trim() ?? '';
    const target = { type: 'table', id: tableName };
    const path = `tables.${index}`;

    if (!extensionName || !IDENTIFIER_RE.test(extensionName)) {
      issues.push({
        severity: 'error',
        code: 'TABLE_EXTENSION_INVALID',
        message: `Table "${tableName || '(missing name)'}" must have a valid extensionName.`,
        path: `${path}.extensionName`,
        target,
      });
    }

    if (!tableName || !IDENTIFIER_RE.test(tableName)) {
      issues.push({
        severity: 'error',
        code: 'TABLE_IDENTIFIER_INVALID',
        message: `Table name "${tableName}" must be a valid Oracle identifier.`,
        path: `${path}.tableName`,
        target,
      });
    } else {
      const upper = tableName.toUpperCase();
      if (tableNames.has(upper)) {
        issues.push({
          severity: 'error',
          code: 'TABLE_DUPLICATE_TABLE',
          message: `Table "${tableName}" is defined more than once.`,
          path: `${path}.tableName`,
          target,
        });
      } else {
        tableNames.add(upper);
      }

      if (tableName.length > 128) {
        issues.push({
          severity: 'error',
          code: 'TABLE_NAME_TOO_LONG',
          message: `Table name "${tableName}" exceeds the 128-character Oracle limit.`,
          path: `${path}.tableName`,
          target,
        });
      } else if (tableName.length > 30) {
        issues.push({
          severity: 'warning',
          code: 'TABLE_NAME_LONG',
          message: `Table name "${tableName}" exceeds the legacy 30-character PowerSchool convention.`,
          path: `${path}.tableName`,
          target,
        });
      }
    }

    const schemaFile = table.schemaFile?.trim() || `${extensionName}.xml`;
    if (
      !schemaFile ||
      !isSafeRelativePath(schemaFile) ||
      schemaFile.includes('/') ||
      !schemaFile.endsWith('.xml')
    ) {
      issues.push({
        severity: 'error',
        code: 'TABLE_SCHEMA_FILE_INVALID',
        message: `Schema file "${schemaFile}" must be a safe .xml filename.`,
        path: `${path}.schemaFile`,
        target,
      });
    } else {
      const existing = schemaFiles.get(schemaFile);
      if (existing && existing !== extensionName) {
        issues.push({
          severity: 'error',
          code: 'TABLE_SCHEMA_FILE_DUPLICATE',
          message: `Schema file "${schemaFile}" is shared by different extension groups (${existing} and ${extensionName}).`,
          path: `${path}.schemaFile`,
          target,
        });
      } else {
        schemaFiles.set(schemaFile, extensionName);
      }
    }

    const fieldNames = new Set<string>();
    for (const [fieldIndex, field] of (table.fields ?? []).entries()) {
      const fieldName = field.name?.trim() ?? '';
      const fieldPath = `${path}.fields.${fieldIndex}`;

      if (!fieldName || !IDENTIFIER_RE.test(fieldName)) {
        issues.push({
          severity: 'error',
          code: 'TABLE_FIELD_IDENTIFIER_INVALID',
          message: `Field "${fieldName}" in table "${tableName}" must be a valid Oracle identifier.`,
          path: `${fieldPath}.name`,
          target,
        });
        continue;
      }

      const upper = fieldName.toUpperCase();
      if (fieldNames.has(upper)) {
        issues.push({
          severity: 'error',
          code: 'TABLE_DUPLICATE_FIELD',
          message: `Field "${fieldName}" is defined more than once in table "${tableName}".`,
          path: `${fieldPath}.name`,
          target,
        });
      } else {
        fieldNames.add(upper);
      }

      if (fieldName.length > 128) {
        issues.push({
          severity: 'error',
          code: 'TABLE_FIELD_NAME_TOO_LONG',
          message: `Field name "${fieldName}" exceeds the 128-character Oracle limit.`,
          path: `${fieldPath}.name`,
          target,
        });
      } else if (fieldName.length > 30) {
        issues.push({
          severity: 'warning',
          code: 'TABLE_FIELD_NAME_LONG',
          message: `Field name "${fieldName}" exceeds the legacy 30-character PowerSchool convention.`,
          path: `${fieldPath}.name`,
          target,
        });
      }

      if (field.type === 'String') {
        if (field.length === undefined || field.length === null) {
          issues.push({
            severity: 'error',
            code: 'TABLE_STRING_LENGTH_REQUIRED',
            message: `String field "${fieldName}" must declare a length.`,
            path: `${fieldPath}.length`,
            target,
          });
        } else if (
          !Number.isInteger(field.length) ||
          field.length < 1 ||
          field.length > 4000
        ) {
          issues.push({
            severity: 'error',
            code: 'TABLE_STRING_LENGTH_INVALID',
            message: `String field "${fieldName}" length must be an integer from 1 to 4000.`,
            path: `${fieldPath}.length`,
            target,
          });
        }
      }
    }
  }
}

function validateAccessRequest(
  fields: AccessFieldLike[],
  issues: ValidationIssue[],
): Set<string> {
  const granted = new Set<string>();
  const seen = new Map<string, string>();

  for (const [index, field] of fields.entries()) {
    const table = field.table?.trim() ?? '';
    const column = field.field?.trim() ?? '';
    const target = { type: 'accessRequest', id: `${table}.${column}` };
    const path = `accessRequest.${index}`;

    if (!table || !column || !IDENTIFIER_RE.test(table) || !IDENTIFIER_RE.test(column)) {
      issues.push({
        severity: 'error',
        code: 'ACCESS_FIELD_INVALID',
        message: `access_request entry "${table}.${column}" must use valid table and field identifiers.`,
        path,
        target,
      });
      continue;
    }

    if (field.access !== 'ViewOnly' && field.access !== 'FullAccess') {
      issues.push({
        severity: 'error',
        code: 'ACCESS_FIELD_INVALID',
        message: `access_request entry "${table}.${column}" must use access "ViewOnly" or "FullAccess".`,
        path: `${path}.access`,
        target,
      });
      continue;
    }

    if (isExcludedField(table, column)) {
      issues.push({
        severity: 'error',
        code: 'ACCESS_EXCLUDED_FIELD',
        message: `access_request entry "${table}.${column}" is on the PowerSchool exclude list and cannot be granted.`,
        path,
        target,
      });
      continue;
    }

    const key = `${table.toUpperCase()}.${column.toUpperCase()}`;
    const previousAccess = seen.get(key);
    if (previousAccess) {
      issues.push({
        severity: previousAccess === field.access ? 'warning' : 'error',
        code: 'ACCESS_FIELD_DUPLICATE',
        message:
          previousAccess === field.access
            ? `access_request entry "${table}.${column}" is duplicated.`
            : `access_request entry "${table}.${column}" is duplicated with conflicting access levels (${previousAccess} vs ${field.access}).`,
        path,
        target,
      });
    } else {
      seen.set(key, field.access);
    }
    granted.add(key);
  }

  return granted;
}

function validatePowerQueries(
  files: PowerQueryFileLike[],
  granted: Set<string>,
  issues: ValidationIssue[],
): void {
  for (const file of files) {
    for (const query of file.queries ?? []) {
      const queryName = query.name ?? '(missing name)';
      const target = { type: 'powerQuery', id: query.name };
      const reported = new Set<string>();

      for (const ref of extractQueryFields(query)) {
        const key = `${ref.table.toUpperCase()}.${ref.field.toUpperCase()}`;
        if (reported.has(key)) continue;
        reported.add(key);

        const path = `powerQueries.${file.filename}.${queryName}.${ref.table}.${ref.field}`;
        const display = key;

        if (isExcludedField(ref.table, ref.field)) {
          issues.push({
            severity: 'error',
            code: 'PQ_EXCLUDED_FIELD',
            message: `PowerQuery "${queryName}" references excluded field ${display}.`,
            path,
            target,
          });
          continue;
        }

        if (!granted.has(key)) {
          issues.push({
            severity: 'error',
            code: 'PQ_FIELD_NOT_IN_ACCESS_REQUEST',
            message: `PowerQuery "${queryName}" references ${display}, but that table/field is not in access_request.`,
            path,
            target,
          });
        }
      }
    }
  }
}

const NAV_CONTEXTS = new Set(['main', 'student', 'staff']);
const REQUIRED_CONTEXTS = new Set(['student', 'staff']);

function validateNavigationStructure(
  spec: SpecLike,
  issues: ValidationIssue[],
): void {
  const pageIds = new Set(
    (spec.pages ?? []).map((page) => page.id).filter(Boolean) as string[],
  );
  const htmlIds = new Set<string>();

  for (const file of spec.navigation ?? []) {
    const filename = file.filename ?? '';
    if (
      !filename ||
      !isSafeRelativePath(filename) ||
      filename.includes('/') ||
      !filename.endsWith('.json')
    ) {
      issues.push({
        severity: 'error',
        code: 'NAV_FILENAME_INVALID',
        message: `Navigation filename "${filename}" must be a safe .json filename in pagecataloging/.`,
        path: `navigation.${filename}.filename`,
        target: { type: 'navigation' },
      });
    }

    if (file.contextType && !NAV_CONTEXTS.has(file.contextType)) {
      issues.push({
        severity: 'error',
        code: 'NAV_CONTEXT_INVALID',
        message: `Navigation file contextType "${file.contextType}" must be main, student, or staff.`,
        path: `navigation.${filename}.contextType`,
        target: { type: 'navigation' },
      });
    }

    walkNavigation(file.entries ?? [], (entry) => {
      if (entry.htmlID) {
        if (htmlIds.has(entry.htmlID)) {
          issues.push({
            severity: 'error',
            code: 'NAV_HTMLID_DUPLICATE',
            message: `Navigation htmlID "${entry.htmlID}" is duplicated; htmlID must be unique across the whole plugin.`,
            path: `navigation.${filename}.${entry.htmlID}`,
            target: { type: 'navigation', id: entry.htmlID },
          });
        } else {
          htmlIds.add(entry.htmlID);
        }
      }

      if (entry.contextType && !NAV_CONTEXTS.has(String(entry.contextType))) {
        issues.push({
          severity: 'error',
          code: 'NAV_CONTEXT_INVALID',
          message: `Navigation contextType "${entry.contextType}" must be main, student, or staff.`,
          path: `navigation.${filename}.${entry.htmlID}.contextType`,
          target: { type: 'navigation', id: entry.htmlID },
        });
      }

      if (
        entry.requiredContext &&
        !REQUIRED_CONTEXTS.has(String(entry.requiredContext))
      ) {
        issues.push({
          severity: 'error',
          code: 'NAV_REQUIRED_CONTEXT_INVALID',
          message: `Navigation requiredContext "${entry.requiredContext}" must be student or staff.`,
          path: `navigation.${filename}.${entry.htmlID}.requiredContext`,
          target: { type: 'navigation', id: entry.htmlID },
        });
      }

      if (
        entry.districtLevelContext !== undefined &&
        ![0, 1, 2].includes(Number(entry.districtLevelContext))
      ) {
        issues.push({
          severity: 'error',
          code: 'NAV_DISTRICT_LEVEL_INVALID',
          message: `Navigation districtLevelContext must be 0, 1, or 2.`,
          path: `navigation.${filename}.${entry.htmlID}.districtLevelContext`,
          target: { type: 'navigation', id: entry.htmlID },
        });
      }

      if (entry.pageId && !pageIds.has(String(entry.pageId))) {
        issues.push({
          severity: 'error',
          code: 'NAV_PAGEID_UNKNOWN',
          message: `Navigation entry "${entry.htmlID}" references unknown pageId "${entry.pageId}".`,
          path: `navigation.${filename}.${entry.htmlID}.pageId`,
          target: { type: 'navigation', id: entry.htmlID },
        });
      }

      if (entry.pageURL !== undefined && entry.pageURL !== null) {
        const url = String(entry.pageURL);
        const conditional = url.startsWith('~[if') && url.includes('/admin');
        const direct = url === '/admin' || url.startsWith('/admin/');
        if (!conditional && !direct) {
          issues.push({
            severity: 'error',
            code: 'NAV_PAGEURL_INVALID',
            message: `Navigation pageURL "${url}" must start with /admin or be a supported conditional wrapper.`,
            path: `navigation.${filename}.${entry.htmlID}.pageURL`,
            target: { type: 'navigation', id: entry.htmlID },
          });
        }
      }

      const hasTarget =
        Boolean(entry.pageId) ||
        Boolean(entry.pageURL) ||
        Boolean(entry.children?.length);
      if (!hasTarget) {
        issues.push({
          severity: 'warning',
          code: 'NAV_TARGET_REQUIRED',
          message: `Navigation entry "${entry.htmlID}" has no pageId, pageURL, or children.`,
          path: `navigation.${filename}.${entry.htmlID}`,
          target: { type: 'navigation', id: entry.htmlID },
        });
      }
    });
  }

  walkNavigation(
    (spec.navigation ?? []).flatMap((file) => file.entries ?? []),
    (entry) => {
      if (
        entry.parentHTMLID &&
        !htmlIds.has(String(entry.parentHTMLID))
      ) {
        issues.push({
          severity: 'warning',
          code: 'NAV_PARENT_UNKNOWN',
          message: `Navigation entry "${entry.htmlID}" references parentHTMLID "${entry.parentHTMLID}", which is not defined in this spec. It may be a core category.`,
          path: 'navigation',
          target: { type: 'navigation', id: entry.htmlID },
        });
      }
    },
  );
}

export function validateSpec(
  spec: unknown,
  options: ValidateOptions = {},
): ValidationIssue[] {
  const parsed = specSchema.safeParse(spec);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      severity: 'error' as const,
      code: 'SPEC_INVALID',
      message: issue.message,
      path: issue.path.join('.'),
      target: { type: 'spec' },
    }));
  }

  const s = parsed.data as unknown as SpecLike;
  const issues: ValidationIssue[] = [];

  validatePackage(s, issues);
  validateTables(s, issues);
  validatePages(s, issues);
  validatePermissionMappings(s, issues);
  validateNavigationStructure(s, issues);

  const navVersion = s.plugin?.navVersion;
  if (!navVersion || !String(navVersion).trim()) {
    issues.push({
      severity: 'error',
      code: 'NAV_VERSION_REQUIRED',
      message: 'plugin.navVersion is required so pagecataloging records can be versioned.',
      path: 'plugin.navVersion',
      target: { type: 'navigation' },
    });
  } else if (!NAV_VERSION_RE.test(String(navVersion))) {
    issues.push({
      severity: 'error',
      code: 'NAV_VERSION_INVALID',
      message: `plugin.navVersion "${navVersion}" must be numeric dot-separated (e.g. 1.0.0.0).`,
      path: 'plugin.navVersion',
      target: { type: 'navigation' },
    });
  }

  const previousByHtmlId = new Map<string, NavigationEntryLike>();
  for (const entry of options.previousNavigation ?? []) {
    if (entry.htmlID) previousByHtmlId.set(entry.htmlID, entry);
  }

  for (const file of s.navigation ?? []) {
    walkNavigation(file.entries ?? [], (entry) => {
      const id = entry.htmlID ?? '(missing htmlID)';
      const target = { type: 'navigation', id: entry.htmlID };

      if (!entry.version || !String(entry.version).trim()) {
        issues.push({
          severity: 'error',
          code: 'NAV_VERSION_REQUIRED',
          message: `Navigation entry "${id}" is missing version.`,
          path: `navigation.${file.filename}.${id}.version`,
          target,
        });
        return;
      }

      if (!NAV_VERSION_RE.test(String(entry.version))) {
        issues.push({
          severity: 'error',
          code: 'NAV_VERSION_INVALID',
          message: `Navigation version "${entry.version}" for "${id}" must be numeric dot-separated (e.g. 1.0.0.1).`,
          path: `navigation.${file.filename}.${id}.version`,
          target,
        });
        return;
      }

      const previous = entry.htmlID ? previousByHtmlId.get(entry.htmlID) : undefined;
      if (!previous?.version) return;

      const changed =
        navigationFingerprint(entry) !== navigationFingerprint(previous);
      if (changed && compareVersions(String(entry.version), String(previous.version)) <= 0) {
        issues.push({
          severity: 'error',
          code: 'NAV_VERSION_NOT_INCREMENTED',
          message: `Navigation entry "${id}" changed but version ${entry.version} is not greater than previous ${previous.version}.`,
          path: `navigation.${file.filename}.${id}.version`,
          target,
        });
      }
    });
  }

  const granted = validateAccessRequest(s.accessRequest ?? [], issues);
  validatePowerQueries(s.powerQueries ?? [], granted, issues);

  return issues;
}

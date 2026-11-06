export interface PowerQueryArgLike {
  name?: string;
  column?: string;
}

export interface PowerQueryColumnLike {
  column?: string;
  alias?: string;
}

export interface PowerQueryLike {
  name?: string;
  coreTable?: string;
  args?: PowerQueryArgLike[];
  columns?: PowerQueryColumnLike[];
  sql?: string;
}

export interface PowerQueryFileLike {
  filename?: string;
  queries?: PowerQueryLike[];
}

export interface QueryFieldRef {
  table: string;
  field: string;
  source: 'column' | 'arg' | 'sql';
}

const SQL_KEYWORDS = new Set([
  'as',
  'on',
  'where',
  'group',
  'order',
  'having',
  'union',
  'left',
  'right',
  'inner',
  'outer',
  'full',
  'cross',
  'join',
  'using',
  'connect',
  'start',
  'with',
  'select',
  'from',
  'and',
  'or',
  'not',
  'in',
  'is',
  'null',
  'case',
  'when',
  'then',
  'else',
  'end',
  'fetch',
  'offset',
  'rows',
  'only',
]);

const EXCLUDED_EXACT_TABLES = new Set([
  'BLOBS',
  'CACHE_MESSAGE',
  'DATACOLLEVENT',
  'EMAILQUEUE',
  'EMAILRECIPIENT',
  'FIELDLEVELSECURITY',
  'FIELDSTABLE',
  'FIELDTYPECHANGEREQUEST',
  'KEYSTORE',
  'METAPHONE',
  'OAUTHACCESSTOKEN',
  'OIDSERVERASSOCIATIONSTORE',
  'PAGES',
  'PISA_SESSION',
  'PSM_GRANTEDPERMISSION',
  'QUEUE',
  'SCHED_DEBUG',
  'SERVER_CONFIG',
  'SERVER_INSTANCE',
  'SEQNO',
  'SYB_AUTO_DB_EXTEND_CONTROL',
  'SYS_SEQUENCE',
  'TABLENUMBERMAP',
  'TEACHEREMAILQUEUE',
  'UCOLS',
  'UTABLE',
  'PS_MEMBERSHIP_DEFAULTS',
  'PT_ENROLLMENT_ALL',
  'PT_MEMBERSHIP_DEFAULTS',
]);

const EXCLUDED_PREFIXES = [
  'AU_',
  'AUD_',
  'CUSTOM',
  'DALX_',
  'HLE_',
  'IDP',
  'LG_',
  'PLUGIN',
  'QRTZ_',
  'ROLE',
  'SIF',
  'SRPTMP',
  'TMPDALX',
  'VIRTUAL',
];

const PCAS_EXCEPTIONS = new Set([
  'PCAS_ACCOUNT.USERNAME',
  'PCAS_EMAILCONTACT.EMAILADDRESS',
]);

export function isExcludedField(table: string, field?: string): boolean {
  const t = table.toUpperCase();
  const f = field?.toUpperCase();
  const dotted = f ? `${t}.${f}` : t;

  if (PCAS_EXCEPTIONS.has(dotted)) return false;
  if (t.startsWith('PCAS_')) return true;
  if (EXCLUDED_EXACT_TABLES.has(t)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => t.startsWith(prefix));
}

function parseTableColumn(
  value: string | undefined,
  fallbackTable?: string,
): { table: string; field: string } | null {
  if (!value) return null;
  const text = value.trim();
  const dotted = text.match(
    /^([A-Za-z][A-Za-z0-9_]*)\s*\.\s*([A-Za-z][A-Za-z0-9_]*)$/,
  );
  if (dotted) return { table: dotted[1], field: dotted[2] };
  if (fallbackTable && /^[A-Za-z][A-Za-z0-9_]*$/.test(text)) {
    return { table: fallbackTable, field: text };
  }
  return null;
}

function stripSqlNoise(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''");
}

function collectCteNames(sql: string): Set<string> {
  const names = new Set<string>();
  const re = /(?:\bwith\b|,)\s*([A-Za-z][A-Za-z0-9_]*)\s+as\s*\(/gi;
  for (const match of sql.matchAll(re)) names.add(match[1].toUpperCase());
  return names;
}

function sqlRefs(
  sql: string,
  knownTables: Set<string>,
): Array<{ table: string; field: string }> {
  const cleaned = stripSqlNoise(sql);
  const ctes = collectCteNames(cleaned);

  const aliasMap = new Map<string, string | null>();
  const tableRe =
    /\b(?:from|join)\s+([A-Za-z][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z][A-Za-z0-9_]*))?/gi;

  for (const match of cleaned.matchAll(tableRe)) {
    const table = match[1];
    const alias = match[2];
    const tableKey = table.toUpperCase();
    if (ctes.has(tableKey) || tableKey === 'DUAL') {
      if (alias) aliasMap.set(alias.toUpperCase(), null);
      continue;
    }
    aliasMap.set(tableKey, table);
    knownTables.add(tableKey);
    const aliasKey = alias?.toUpperCase();
    if (aliasKey && !SQL_KEYWORDS.has(aliasKey.toLowerCase())) {
      aliasMap.set(aliasKey, table);
    }
  }

  const refs: Array<{ table: string; field: string }> = [];
  const refRe =
    /\b([A-Za-z][A-Za-z0-9_]*)\s*\.\s*([A-Za-z][A-Za-z0-9_]*)\b/g;
  for (const match of cleaned.matchAll(refRe)) {
    const prefix = match[1];
    const field = match[2];
    const prefixKey = prefix.toUpperCase();
    const mapped = aliasMap.get(prefixKey);

    let table: string | undefined;
    if (mapped === null) continue;
    if (mapped) {
      table = mapped;
    } else if (knownTables.has(prefixKey)) {
      table = prefix;
    } else {
      // Unknown prefix: likely a CTE/subquery alias. Skip rather than emit a
      // false positive.
      continue;
    }

    refs.push({ table, field });
  }

  return refs;
}

export function extractQueryFields(query: PowerQueryLike): QueryFieldRef[] {
  const refs: QueryFieldRef[] = [];
  const seen = new Set<string>();
  const knownTables = new Set<string>();

  const push = (
    table: string | undefined,
    field: string | undefined,
    source: QueryFieldRef['source'],
  ) => {
    if (!table || !field) return;
    const key = `${table.toUpperCase()}.${field.toUpperCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ table, field, source });
  };

  for (const column of query.columns ?? []) {
    const parsed = parseTableColumn(column.column, query.coreTable);
    if (parsed) push(parsed.table, parsed.field, 'column');
  }

  for (const arg of query.args ?? []) {
    const parsed = parseTableColumn(arg.column, query.coreTable);
    if (parsed) push(parsed.table, parsed.field, 'arg');
  }

  if (query.sql) {
    if (query.coreTable) knownTables.add(query.coreTable.toUpperCase());
    for (const ref of sqlRefs(query.sql, knownTables)) {
      push(ref.table, ref.field, 'sql');
    }
  }

  return refs;
}

export type LocalizedText = {
  en: string;
  zh?: string;
};

export type PageContext =
  | 'admin'
  | 'adminStudent'
  | 'teacher'
  | 'teacherStudent'
  | 'guardian'
  | 'student';

export type PageKind =
  | 'list'
  | 'edit'
  | 'settings'
  | 'dashboard'
  | 'custom'
  | 'raw';

export type NavContextType = 'main' | 'student' | 'staff';

export type AccessLevel = 'ViewOnly' | 'FullAccess';

export interface Publisher {
  name: string;
  email: string;
}

export interface PluginOAuth {
  enabled: boolean;
  accessLevelV1Api?: 'NONE' | 'READ' | 'FULL';
}

export interface PluginMeta {
  name: string;
  description: string;
  version: string;
  dbName: string;
  dbDescription: string;
  dbVersion: string;
  navVersion: string;
  publisher: Publisher;
  oauth?: PluginOAuth;
}

export interface FieldSpec {
  name: string;
  type: 'Integer' | 'String' | 'Date' | 'DateTime' | 'Decimal';
  length?: number;
  comment?: string;
}

export interface TableSpec {
  extensionName: string;
  schemaFile?: string;
  tableName: string;
  childName: string;
  comment: string;
  type?: 'standalone' | 'oneToOne' | 'oneToMany';
  primaryKey?: string;
  fields: FieldSpec[];
}

export interface ListColumnSpec {
  column: string;
  label: LocalizedText;
  type?: 'string' | 'number' | 'date' | 'datetime';
  sortable?: boolean;
  width?: string;
}

export interface FormFieldSpec {
  column: string;
  label: LocalizedText;
  widget:
    | 'text'
    | 'textarea'
    | 'integer'
    | 'decimal'
    | 'date'
    | 'checkbox'
    | 'select'
    | 'hidden'
    | 'readonly';
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  maxLength?: number;
  defaultValue?: string;
  options?: Array<{ value: string; label: LocalizedText }>;
  sqlOptions?: { sql: string; valueColumn: string; labelColumn: string };
}

export interface JoinSpec {
  table: string;
  on: string;
  type?: 'left' | 'inner';
}

export interface FilterSpec {
  param: string;
  column: string;
  operator: '=' | '>=' | '<=' | '>';
  widget: 'select' | 'text' | 'date';
  label: LocalizedText;
  options?: Array<{ value: string; label: LocalizedText }>;
  optionsSql?: string;
  clientSide?: boolean;
}

export interface PageSpec {
  id: string;
  kind: PageKind;
  context: PageContext;
  path: string;
  title: LocalizedText;
  table?: string;
  studentScope?: 'curstudid' | 'gpv.studentid' | 'none';
  recordIdParam?: string;
  columns?: ListColumnSpec[];
  fields?: FormFieldSpec[];
  filters?: FilterSpec[];
  joins?: JoinSpec[];
  orderBy?: string;
  csvExport?: boolean;
  customBody?: string;
  chrome?: { header?: string; footer?: string };
  /** API resources this page calls (PowerQuery or Table API), used to validate permission mappings. */
  apiResources?: string[];
}

export interface PermissionResourceSpec {
  path: string;
  allow?: 'get' | 'post' | 'put' | 'delete';
}

export interface PermissionMappingSpec {
  page: string;
  resources: PermissionResourceSpec[];
}

export interface PermissionMappingFileSpec {
  filename: string;
  mappings: PermissionMappingSpec[];
}

export interface NavEntrySpec {
  htmlID: string;
  title: LocalizedText;
  sortOrder: number;
  version: string;
  pageId?: string;
  pageURL?: string | null;
  schoolIds?: number[];
  contextType?: NavContextType;
  requiredContext?: 'student' | 'staff';
  districtLevelContext?: 0 | 1 | 2;
  parentHTMLID?: string;
  isNewTab?: boolean;
  isLandingPage?: boolean;
  checkParams?: boolean;
  children?: NavEntrySpec[];
  extra?: Record<string, unknown>;
}

export interface NavFileSpec {
  filename: string;
  contextType: NavContextType;
  districtLevelContext?: 0 | 1 | 2;
  entries: NavEntrySpec[];
}

export interface WildcardSpec {
  filename: string;
  kind:
    | 'adminLink'
    | 'teacherNavLink'
    | 'teacherStudentPageOption'
    | 'guardianLink'
    | 'raw';
  condition?: {
    schoolIds?: number[];
    guardianOnly?: boolean;
    raw?: string;
  };
  link?: { label: LocalizedText; href: string; htmlID?: string };
  content?: string;
}

export interface MessageKeyFileSpec {
  locale: string;
  filename?: string;
  entries: Array<{ key: string; value: string }>;
}

export interface RawFileRef {
  path: string;
  note?: string;
}

export interface AccessFieldSpec {
  table: string;
  field: string;
  access: AccessLevel;
}

export interface PowerQueryArgSpec {
  name: string;
  column?: string;
  type?: 'primitive' | 'array';
  required?: boolean;
  default?: string;
  casing?: 'upper' | 'lower' | 'none';
  description?: string;
}

export interface PowerQueryColumnSpec {
  column: string;
  alias?: string;
  description?: string;
}

export interface PowerQuerySpec {
  name: string;
  coreTable?: string;
  flattened?: boolean;
  dat?: boolean;
  tags?: string;
  summary?: string;
  description?: string;
  args?: PowerQueryArgSpec[];
  columns: PowerQueryColumnSpec[];
  sql: string;
}

export interface PowerQueryFileSpec {
  filename: string;
  queries: PowerQuerySpec[];
}

export interface PluginSpec {
  schemaVersion: 1;
  key: string;
  plugin: PluginMeta;
  tables: TableSpec[];
  pages: PageSpec[];
  navigation: NavFileSpec[];
  powerQueries: PowerQueryFileSpec[];
  accessRequest: AccessFieldSpec[];
  permissionMappings: PermissionMappingFileSpec[];
  wildcards: WildcardSpec[];
  messageKeys: MessageKeyFileSpec[];
  rawFiles: RawFileRef[];
}

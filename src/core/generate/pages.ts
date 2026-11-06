import type {
  FormFieldSpec,
  LocalizedText,
  PageSpec,
  PluginSpec,
  TableSpec,
} from '../spec/types';

export interface PageFile {
  path: string;
  content: string;
}

export class MissingTableSpecError extends Error {
  constructor(pageId: string, tableName: string | undefined) {
    super(
      `Page "${pageId}" binds table "${tableName ?? '(none)'}", which is not in spec.tables. ` +
        'Add the extension table to tables[] or use a custom/raw page.',
    );
    this.name = 'MissingTableSpecError';
  }
}

function localized(text: LocalizedText): string {
  const zh = text.zh?.trim();
  return zh ? `${zh} ${text.en}` : text.en;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function findTable(spec: PluginSpec, tableName?: string): TableSpec | undefined {
  if (!tableName) return undefined;
  const key = tableName.toUpperCase();
  return spec.tables.find((table) => table.tableName.toUpperCase() === key);
}

function pageUrl(page: PageSpec): string {
  return `/${page.path.replace(/\\/g, '/')}`;
}

function jsonPath(page: PageSpec): string {
  return page.path.endsWith('.html')
    ? `${page.path.slice(0, -5)}.json`
    : `${page.path}.json`;
}

function csvPath(page: PageSpec): string {
  return page.path.endsWith('.html')
    ? `${page.path.slice(0, -5)}.csv`
    : `${page.path}.csv`;
}

function scriptPath(spec: PluginSpec, page: PageSpec): string {
  return `scripts/${spec.key}/${page.id}.js`;
}

function chromeFor(page: PageSpec): { header: string; footer: string } {
  if (page.chrome?.header || page.chrome?.footer) {
    return {
      header: page.chrome.header ?? '',
      footer: page.chrome.footer ?? '',
    };
  }
  switch (page.context) {
    case 'admin':
      return {
        header: '~[wc:admin_header_css]\n~[wc:admin_navigation_css]',
        footer: '~[wc:admin_footer_css]',
      };
    case 'adminStudent':
      return {
        header:
          '~[wc:admin_header_frame_css]\n~[wc:admin_navigation_frame_css]',
        footer: '~[wc:admin_footer_frame_css]',
      };
    case 'teacher':
    case 'teacherStudent':
      return {
        header: '~[wc:teachers_header_fr_css]',
        footer: '~[wc:teachers_footer_fr_css]',
      };
    case 'guardian':
    case 'student':
      return {
        header: '~[wc:guardian_header_yui]',
        footer: '~[wc:guardian_footer]',
      };
    default:
      return { header: '', footer: '' };
  }
}

function titleBlock(page: PageSpec): string {
  const title = escapeHtml(localized(page.title));
  if (page.context === 'adminStudent') {
    return `~[wc:title_student_begin_css]${title}~[wc:title_student_end_css]`;
  }
  return `<h1>${title}</h1>`;
}

function studentIdExpression(page: PageSpec): string | null {
  if (page.studentScope === 'none') return null;
  if (page.studentScope === 'gpv.studentid' || page.context === 'teacherStudent') {
    return '~[tlist_sql;select dcid from students where id = ~(gpv.studentid;num);]~(dcid)[/tlist_sql]';
  }
  if (
    page.context === 'adminStudent' ||
    page.context === 'guardian' ||
    page.context === 'student' ||
    page.studentScope === 'curstudid'
  ) {
    return '~[tlist_sql;select dcid from students where id = ~(curstudid);]~(dcid)[/tlist_sql]';
  }
  return null;
}

function studentSqlExpression(page: PageSpec): string | null {
  if (page.studentScope === 'none') return null;
  if (page.studentScope === 'gpv.studentid' || page.context === 'teacherStudent') {
    return 'select dcid from students where id = ~(gpv.studentid;num)';
  }
  if (
    page.context === 'adminStudent' ||
    page.context === 'guardian' ||
    page.context === 'student' ||
    page.studentScope === 'curstudid'
  ) {
    return 'select dcid from students where id = ~(curstudid)';
  }
  return null;
}

function studentWhere(page: PageSpec, table: TableSpec): string | null {
  if (page.studentScope === 'none') return null;
  if (!table.fields.some((field) => field.name.toLowerCase() === 'studentsdcid')) {
    return null;
  }
  const expression = studentSqlExpression(page);
  return expression
    ? `${table.tableName}.studentsdcid = (${expression})`
    : null;
}

function tableSkeleton(
  page: PageSpec,
  body: string,
  extraHead = '',
): string {
  const chrome = chromeFor(page);
  const title = escapeHtml(localized(page.title));
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  ~[wc:commonscripts]
  <link href="/images/css/screen.css" rel="stylesheet" media="screen">
  <link href="/images/css/print.css" rel="stylesheet" media="print">
${extraHead}
</head>
<body>
${chrome.header}
${titleBlock(page)}
${body}
${chrome.footer}
</body>
</html>
`;
}

function listHtml(
  spec: PluginSpec,
  page: PageSpec,
  table: TableSpec,
  editPage: PageSpec | undefined,
): string {
  const addUrl = editPage
    ? `${pageUrl(editPage)}?id=-1${page.context === 'adminStudent' || page.context === 'student' || page.context === 'guardian' ? '&frn=~(studentfrn)' : ''}`
    : '#';
  const headers = (page.columns ?? [])
    .map(
      (column) =>
        `          <th scope="col" data-key="${escapeHtml(column.column)}">${escapeHtml(localized(column.label))}</th>`,
    )
    .join('\n');
  const actionHeader = editPage
    ? '\n          <th scope="col">Action</th>'
    : '';
  const body = `<div class="box-round">
  <div class="button-row">
    <a class="button" href="${escapeHtml(addUrl)}">Add</a>
  </div>
  <div class="feedback-confirm" id="${escapeHtml(page.id)}-feedback"></div>
  <div class="grid-filter">
    <label for="${escapeHtml(page.id)}-search">Search</label>
    <input type="text" id="${escapeHtml(page.id)}-search">
  </div>
  <table class="grid" id="${escapeHtml(page.id)}-table" data-json="${escapeHtml(jsonPath(page).split('/').pop() as string)}">
    <thead>
      <tr>
${headers}${actionHeader}
      </tr>
    </thead>
    <tbody id="${escapeHtml(page.id)}-tbody"></tbody>
  </table>
  <div id="${escapeHtml(page.id)}-pager" class="pager"></div>
</div>`;
  return tableSkeleton(
    page,
    body,
    `  <script src="/${scriptPath(spec, page)}" defer></script>`,
  );
}

function listJson(
  spec: PluginSpec,
  page: PageSpec,
  table: TableSpec,
): string {
  const primaryKey = table.primaryKey || 'id';
  const columns = page.columns ?? [];
  const select = [
    `${table.tableName}.${primaryKey} AS id`,
    ...columns.map(
      (column, index) =>
        `${qualify(column.column, table.tableName)} AS c${index}`,
    ),
  ].join(',\n       ');

  const student = studentWhere(page, table);
  const joinLines = (page.joins ?? [])
    .map(
      (join) =>
        `${join.type === 'inner' ? 'inner' : 'left'} join ${join.table} on ${join.on}`,
    )
    .join('\n  ');

  const orderColumn = page.orderBy
    ? page.orderBy
    : columns[0]
      ? qualify(columns[0].column, table.tableName)
      : `${table.tableName}.${primaryKey}`;

  const where = student ? `\n where ${student}` : '';
  const json = columns
    .map((column, index) => {
      const key = columnKey(column.column);
      return `"${key}":"~(c${index};json)"`;
    })
    .join(',');

  return `[
~[tlist_sql;
select ${select}
  from ${table.tableName}${joinLines ? `\n  ${joinLines}` : ''}${where}
 order by ${orderColumn}
]{"id":~(id)${json ? `,${json}` : ''}},
[/tlist_sql]
{}]
`;
}

function listCsv(
  spec: PluginSpec,
  page: PageSpec,
  table: TableSpec,
): string {
  const columns = page.columns ?? [];
  const header = columns
    .map((column) => `"${localized(column.label).replace(/"/g, '""')}"`)
    .join(',');
  const select = columns
    .map(
      (column, index) =>
        `${qualify(column.column, table.tableName)} AS c${index}`,
    )
    .join(', ');
  const student = studentWhere(page, table);
  const where = student ? `\n where ${student}` : '';
  const row = columns
    .map((_, index) => `"~(c${index})"`)
    .join(',');
  return `${header}
~[tlist_sql;select ${select} from ${table.tableName}${where}]${row}
[/tlist_sql]`;
}

function listScript(
  spec: PluginSpec,
  page: PageSpec,
  editPage: PageSpec | undefined,
): string {
  const columns = (page.columns ?? []).map((column) => ({
    key: columnKey(column.column),
    label: localized(column.label),
  }));
  return `(function () {
  'use strict';
  var columns = ${JSON.stringify(columns)};
  var editUrl = ${JSON.stringify(editPage ? pageUrl(editPage) : '')};
  var idParam = ${JSON.stringify(page.recordIdParam || 'id')};
  var rows = [];
  var page = 1;
  var pageSize = 25;
  var sortKey = null;
  var sortDir = 1;
  var filter = '';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function filtered() {
    var q = filter.toLowerCase();
    var data = rows;
    if (q) {
      data = data.filter(function (row) {
        return columns.some(function (column) {
          return String(row[column.key] == null ? '' : row[column.key]).toLowerCase().indexOf(q) >= 0;
        });
      });
    }
    if (sortKey) {
      data = data.slice().sort(function (a, b) {
        var x = a[sortKey] == null ? '' : a[sortKey];
        var y = b[sortKey] == null ? '' : b[sortKey];
        return String(x).localeCompare(String(y)) * sortDir;
      });
    }
    return data;
  }

  function render() {
    var data = filtered();
    var pages = Math.max(1, Math.ceil(data.length / pageSize));
    if (page > pages) page = pages;
    var start = (page - 1) * pageSize;
    var tbody = document.getElementById('${page.id}-tbody');
    var colspan = columns.length + (editUrl ? 1 : 0);
    tbody.innerHTML = data.slice(start, start + pageSize).map(function (row) {
      var cells = columns.map(function (column) {
        return '<td>' + escapeHtml(row[column.key]) + '</td>';
      }).join('');
      if (editUrl) {
        var frn = new URLSearchParams(window.location.search).get('frn');
        var href = editUrl + '?' + encodeURIComponent(idParam) + '=' + encodeURIComponent(row.id);
        if (frn) href += '&frn=' + encodeURIComponent(frn);
        cells += '<td><a class="button" href="' + escapeHtml(href) + '">Edit</a></td>';
      }
      return '<tr>' + cells + '</tr>';
    }).join('') || '<tr><td colspan="' + colspan + '">No records found.</td></tr>';

    document.getElementById('${page.id}-pager').innerHTML =
      'Page ' + page + ' / ' + pages;
  }

  function load() {
    jQuery.getJSON('${jsonPath(page).split('/').pop()}', function (data) {
      if (Array.isArray(data) && data.length && Object.keys(data[data.length - 1]).length === 0) {
        data.pop();
      }
      rows = Array.isArray(data) ? data : [];
      render();
    });
  }

  var search = document.getElementById('${page.id}-search');
  if (search) {
    search.addEventListener('input', function () {
      filter = search.value || '';
      page = 1;
      render();
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('#${page.id}-table th'), function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-key');
      if (!key) return;
      var mapped = columns.filter(function (column) { return column.label === th.textContent.trim(); })[0];
      var nextKey = mapped ? mapped.key : key;
      if (sortKey === nextKey) {
        sortDir = -sortDir;
      } else {
        sortKey = nextKey;
        sortDir = 1;
      }
      render();
    });
  });

  load();
})();
`;
}

function fieldWidget(field: FormFieldSpec, table: TableSpec): string {
  const name = `[${table.tableName}]${field.column}`;
  const required = field.required ? ' required' : '';
  const readOnly = field.readonly ? ' readonly' : '';
  const maxLength = field.maxLength ? ` maxlength="${field.maxLength}"` : '';
  const value = field.defaultValue ? ` value="${escapeHtml(field.defaultValue)}"` : '';

  switch (field.widget) {
    case 'textarea':
      return `<textarea name="${escapeHtml(name)}" rows="5" cols="60"${required}${readOnly}></textarea>`;
    case 'integer':
      return `<input type="number" step="1" name="${escapeHtml(name)}"${required}${readOnly}${value}>`;
    case 'decimal':
      return `<input type="number" step="any" name="${escapeHtml(name)}"${required}${readOnly}${value}>`;
    case 'date':
      return `<input type="date" name="${escapeHtml(name)}"${required}${readOnly}${value}>`;
    case 'checkbox':
      return `<input type="checkbox" name="${escapeHtml(name)}" value="1"${required}>`;
    case 'hidden':
      return `<input type="hidden" name="${escapeHtml(name)}"${value}>`;
    case 'select': {
      const options = (field.options ?? [])
        .map(
          (option) =>
            `<option value="${escapeHtml(option.value)}">${escapeHtml(localized(option.label))}</option>`,
        )
        .join('');
      const dynamic = field.sqlOptions
        ? `~[tlist_sql;${field.sqlOptions.sql}]<option value="~(${field.sqlOptions.valueColumn})">~(${field.sqlOptions.labelColumn})</option>[/tlist_sql]`
        : '';
      return `<select name="${escapeHtml(name)}"${required}>${options}${dynamic}</select>`;
    }
    case 'readonly':
      return `<input type="text" name="${escapeHtml(name)}" value="${escapeHtml(field.defaultValue ?? '')}" readonly>`;
    case 'text':
    default:
      return `<input type="text" name="${escapeHtml(name)}"${required}${readOnly}${maxLength}${value}>`;
  }
}

function editHtml(
  spec: PluginSpec,
  page: PageSpec,
  table: TableSpec,
  listPage: PageSpec | undefined,
): string {
  const recordId = page.recordIdParam || 'id';
  const action = listPage ? `${pageUrl(listPage)}?saved=1` : '';
  const rows = (page.fields ?? [])
    .map(
      (field) => `      <tr>
        <td class="bold">${escapeHtml(localized(field.label))}</td>
        <td>${fieldWidget(field, table)}</td>
      </tr>`,
    )
    .join('\n');
  const student = studentIdExpression(page);
  const studentField = table.fields.some(
    (field) => field.name.toLowerCase() === 'studentsdcid',
  )
    ? student
      ? `  <input type="hidden" name="[${table.tableName}]studentsdcid" value="${student}">`
      : ''
    : '';

  const body = `<div class="box-round">
  <form action="${escapeHtml(action)}" method="post" id="${escapeHtml(page.id)}-form" data-json="${escapeHtml(jsonPath(page).split('/').pop() as string)}">
    ~[DirectTable.Select:${table.tableName};ID:~(gpv.${escapeHtml(recordId)};num)]
    <input type="hidden" name="ac" value="prim">
${studentField}
    <table class="linkDescList">
${rows}
    </table>
    <div class="button-row">
~[if#existing.~(gpv.${escapeHtml(recordId)};num)>0]
      <button class="button" type="button" id="${escapeHtml(page.id)}-delete">Delete</button>
[/if#existing]
      <a class="button" href="${escapeHtml(listPage ? pageUrl(listPage) : '#')}">Cancel</a>
      <button class="button" type="submit">Save</button>
    </div>
  </form>
</div>
~[if#existingDelete.~(gpv.${escapeHtml(recordId)};num)>0]
<form action="${escapeHtml(listPage ? `${pageUrl(listPage)}?deleted=1` : '')}" method="post" id="${escapeHtml(page.id)}-delete-form">
  <input type="hidden" name="ac" value="prim">
  <input type="hidden" name="DD-${table.tableName}.ID:~(gpv.${escapeHtml(recordId)};num)" value="1">
</form>
[/if#existingDelete]
<script src="/${scriptPath(spec, page)}"></script>`;

  return tableSkeleton(page, body);
}

function editJson(
  spec: PluginSpec,
  page: PageSpec,
  table: TableSpec,
): string {
  const recordId = page.recordIdParam || 'id';
  const keyColumn = table.primaryKey || 'id';
  const columns = page.fields ?? [];
  const select = [
    `${table.tableName}.${keyColumn} AS id`,
    ...columns.map(
      (field, index) =>
        `${qualify(field.column, table.tableName)} AS c${index}`,
    ),
  ].join(',\n       ');
  const student = studentWhere(page, table);
  const where = [`${table.tableName}.${keyColumn} = ~(gpv.${recordId};num)`];
  if (student) where.push(student);
  const json = columns
    .map((field, index) => {
      const key = columnKey(field.column);
      return `"${key}":"~(c${index};json)"`;
    })
    .join(',');

  return `[
~[tlist_sql;
select ${select}
  from ${table.tableName}
 where ${where.join('\n   and ')}
]{"id":~(id)${json ? `,${json}` : ''}},
[/tlist_sql]
{}]
`;
}

function editScript(page: PageSpec, table: TableSpec): string {
  const recordId = page.recordIdParam || 'id';
  const fieldNames = (page.fields ?? []).map(
    (field) => `[${table.tableName}]${field.column}`,
  );
  return `(function () {
  'use strict';
  var form = document.getElementById('${page.id}-form');
  if (!form) return;
  var id = Number(new URLSearchParams(window.location.search).get('${recordId}') || '-1');
  if (id <= 0) return;
  jQuery.getJSON('${jsonPath(page).split('/').pop()}', { ${recordId}: id }, function (data) {
    if (!Array.isArray(data) || !data.length) return;
    var row = data[0];
    ${JSON.stringify(fieldNames)}.forEach(function (name) {
      var key = name.split(']').pop();
      var input = form.elements[name];
      if (!input || row[key] === undefined) return;
      if (input.type === 'checkbox') {
        input.checked = String(row[key]) === '1' || String(row[key]).toLowerCase() === 'true';
      } else {
        input.value = row[key];
      }
    });
  });
  var deleteButton = document.getElementById('${page.id}-delete');
  var deleteForm = document.getElementById('${page.id}-delete-form');
  if (deleteButton && deleteForm) {
    deleteButton.addEventListener('click', function () {
      if (window.confirm('Delete this record?')) deleteForm.submit();
    });
  }
})();
`;
}

function dashboardHtml(spec: PluginSpec, page: PageSpec): string {
  const links = spec.pages
    .filter(
      (candidate) =>
        candidate.id !== page.id &&
        candidate.context === page.context &&
        candidate.kind !== 'raw',
    )
    .sort((a, b) => localized(a.title).localeCompare(localized(b.title)))
    .map(
      (candidate) =>
        `    <li><a href="${pageUrl(candidate)}">${escapeHtml(localized(candidate.title))}</a></li>`,
    )
    .join('\n');
  const body = `<div class="box-round">
  <ul>
${links}
  </ul>
${page.customBody ?? ''}
</div>`;
  return tableSkeleton(page, body);
}

function customHtml(page: PageSpec): string {
  return tableSkeleton(page, `<div class="box-round">\n${page.customBody ?? ''}\n</div>`);
}

function qualify(column: string, tableName: string): string {
  return column.includes('.') ? column : `${tableName}.${column}`;
}

function columnKey(column: string): string {
  return column.split('.').pop() as string;
}

export function generatePages(spec: PluginSpec): PageFile[] {
  const files: PageFile[] = [];

  for (const page of spec.pages) {
    if (page.kind === 'raw') continue;

    const table = findTable(spec, page.table);
    const listPage = spec.pages.find(
      (candidate) =>
        candidate.kind === 'list' &&
        candidate.table === page.table &&
        candidate.context === page.context,
    );
    const editPage = spec.pages.find(
      (candidate) =>
        candidate.kind === 'edit' &&
        candidate.table === page.table &&
        candidate.context === page.context,
    );

    if (page.kind === 'list') {
      if (!table) throw new MissingTableSpecError(page.id, page.table);
      files.push({ path: page.path, content: listHtml(spec, page, table, editPage) });
      files.push({ path: jsonPath(page), content: listJson(spec, page, table) });
      files.push({
        path: scriptPath(spec, page),
        content: listScript(spec, page, editPage),
      });
      if (page.csvExport) {
        files.push({ path: csvPath(page), content: listCsv(spec, page, table) });
      }
      continue;
    }

    if (page.kind === 'edit' || page.kind === 'settings') {
      if (!table) throw new MissingTableSpecError(page.id, page.table);
      files.push({
        path: page.path,
        content: editHtml(spec, page, table, listPage),
      });
      files.push({ path: jsonPath(page), content: editJson(spec, page, table) });
      files.push({
        path: scriptPath(spec, page),
        content: editScript(page, table),
      });
      continue;
    }

    if (page.kind === 'dashboard') {
      files.push({ path: page.path, content: dashboardHtml(spec, page) });
      continue;
    }

    files.push({ path: page.path, content: customHtml(page) });
  }

  return files;
}

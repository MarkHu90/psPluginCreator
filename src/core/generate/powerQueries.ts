import type { PluginSpec, PowerQuerySpec } from '../spec/types';
import { escapeXml, xmlAttr } from './xml';

export interface PowerQueryFile {
  filename: string;
  content: string;
}

function cdata(sql: string): string {
  return `<![CDATA[\n${sql.replace(/]]>/g, ']]]]><![CDATA[>')}\n]]>`;
}

function generateQuery(query: PowerQuerySpec): string[] {
  const attrs =
    xmlAttr('name', query.name) +
    xmlAttr('coreTable', query.coreTable) +
    xmlAttr('flattened', query.flattened === undefined ? undefined : String(query.flattened)) +
    xmlAttr('dat', query.dat === undefined ? undefined : String(query.dat)) +
    xmlAttr('tags', query.tags);

  const lines: string[] = [`  <query${attrs}>`];
  if (query.summary) lines.push(`    <summary>${escapeXml(query.summary)}</summary>`);
  if (query.description) {
    lines.push(`    <description>${escapeXml(query.description)}</description>`);
  }

  const args = query.args ?? [];
  if (args.length) {
    lines.push('    <args>');
    for (const arg of args) {
      const argAttrs =
        xmlAttr('name', arg.name) +
        xmlAttr('column', arg.column) +
        xmlAttr('type', arg.type) +
        xmlAttr('required', arg.required === undefined ? undefined : String(arg.required)) +
        xmlAttr('default', arg.default) +
        xmlAttr('casing', arg.casing && arg.casing !== 'none' ? arg.casing : undefined) +
        xmlAttr('description', arg.description);
      lines.push(`      <arg${argAttrs}/>`);
    }
    lines.push('    </args>');
  }

  lines.push('    <columns>');
  for (const column of query.columns) {
    const alias = column.alias ?? column.column;
    lines.push(
      `      <column column="${escapeXml(column.column)}">${escapeXml(alias)}</column>`,
    );
  }
  lines.push('    </columns>');

  lines.push(`    <sql>${cdata(query.sql)}</sql>`);
  lines.push('  </query>');
  return lines;
}

export function generatePowerQueries(spec: PluginSpec): PowerQueryFile[] {
  return spec.powerQueries.map((file) => {
    const lines: string[] = ['<queries>'];
    for (const query of file.queries) lines.push(...generateQuery(query));
    lines.push('</queries>');
    lines.push('');
    return { filename: file.filename, content: lines.join('\n') };
  });
}

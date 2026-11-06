import type { PluginSpec, TableSpec } from '../spec/types';
import { escapeXml, xmlAttr } from './xml';

export interface SchemaFile {
  filename: string;
  content: string;
}

export function generateDbSchema(spec: PluginSpec): SchemaFile[] {
  const groups = new Map<string, TableSpec[]>();
  for (const table of spec.tables) {
    const group = groups.get(table.extensionName) ?? [];
    group.push(table);
    groups.set(table.extensionName, group);
  }

  const files: SchemaFile[] = [];
  for (const [extensionName, tables] of groups) {
    const filename = tables[0].schemaFile || `${extensionName}.xml`;
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<psExtension xmlns="http://www.powerschool.com" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.powerschool.com psextension.xsd">`,
      `    <extensionname>${escapeXml(extensionName)}</extensionname>`,
    ];

    for (const table of tables) {
      const attrs =
        xmlAttr('type', table.type ?? 'standalone') +
        xmlAttr('dbTableName', table.tableName) +
        xmlAttr('childName', table.childName) +
        xmlAttr('comment', table.comment);
      lines.push(`    <extendedTable${attrs}>`);
      for (const field of table.fields) {
        const fieldAttrs =
          xmlAttr('name', field.name) +
          xmlAttr('type', field.type) +
          xmlAttr(
            'length',
            field.type === 'String' && field.length !== undefined
              ? field.length
              : undefined,
          ) +
          xmlAttr('comment', field.comment);
        lines.push(`        <field${fieldAttrs}/>`);
      }
      lines.push('    </extendedTable>');
    }

    lines.push('</psExtension>');
    lines.push('');
    files.push({ filename, content: lines.join('\n') });
  }

  return files;
}

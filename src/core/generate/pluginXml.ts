import type { PluginSpec } from '../spec/types';
import { escapeXml, xmlAttr } from './xml';

export type PluginArtifact = 'api' | 'db';

export function generatePluginXml(
  spec: PluginSpec,
  artifact: PluginArtifact,
): string {
  const isDb = artifact === 'db';
  const name = isDb ? spec.plugin.dbName : spec.plugin.name;
  const description = isDb ? spec.plugin.dbDescription : spec.plugin.description;
  const version = isDb ? spec.plugin.dbVersion : spec.plugin.version;

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<plugin xmlns="http://plugin.powerschool.pearson.com" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd" name="${escapeXml(name)}" version="${escapeXml(version)}" description="${escapeXml(description)}">`,
  ];

  if (!isDb && spec.plugin.oauth?.enabled) {
    const level = spec.plugin.oauth.accessLevelV1Api;
    lines.push(
      level
        ? `  <oauth${xmlAttr('accessLevelV1Api', level)}/>`
        : '  <oauth/>',
    );
  }

  if (!isDb && spec.accessRequest.length > 0) {
    lines.push('  <access_request>');
    for (const field of spec.accessRequest) {
      lines.push(
        `    <field table="${escapeXml(field.table)}" field="${escapeXml(field.field)}" access="${escapeXml(field.access)}"/>`,
      );
    }
    lines.push('  </access_request>');
  }

  lines.push(`  <publisher name="${escapeXml(spec.plugin.publisher.name)}">`);
  lines.push(
    `    <contact email="${escapeXml(spec.plugin.publisher.email)}"/>`,
  );
  lines.push('  </publisher>');
  lines.push('</plugin>');
  lines.push('');

  return lines.join('\n');
}

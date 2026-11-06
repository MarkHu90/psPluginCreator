import type { PluginSpec } from '../spec/types';
import { escapeXml, xmlAttr } from './xml';

export interface PermissionFile {
  filename: string;
  content: string;
}

export function generatePermissionMappings(
  spec: PluginSpec,
): PermissionFile[] {
  return spec.permissionMappings.map((file) => {
    const lines: string[] = ['<permission_mappings>'];
    for (const mapping of file.mappings) {
      lines.push(`  <permission name="${escapeXml(mapping.page)}">`);
      for (const resource of mapping.resources) {
        const allow = resource.allow ? xmlAttr('allow', resource.allow) : '';
        lines.push(`    <implies${allow}>${escapeXml(resource.path)}</implies>`);
      }
      lines.push('  </permission>');
    }
    lines.push('</permission_mappings>');
    lines.push('');
    return { filename: file.filename, content: lines.join('\n') };
  });
}

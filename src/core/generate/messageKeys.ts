import type { PluginSpec } from '../spec/types';

export interface MessageKeyFile {
  filename: string;
  content: string;
}

function escapeKey(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([=:#!])/g, '\\$1')
    .replace(/ /g, '\\ ');
}

function escapeValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/([=:#!])/g, '\\$1');
}

export function generateMessageKeys(spec: PluginSpec): MessageKeyFile[] {
  return spec.messageKeys.map((file) => {
    const filename =
      file.filename || `message-keysep.${file.locale}.properties`;
    const entries = [...file.entries].sort((a, b) => a.key.localeCompare(b.key));
    const content = `${entries
      .map((entry) => `${escapeKey(entry.key)}=${escapeValue(entry.value)}`)
      .join('\n')}\n`;
    return { filename, content };
  });
}

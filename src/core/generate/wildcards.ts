import type { LocalizedText, PluginSpec, WildcardSpec } from '../spec/types';

export interface WildcardFile {
  filename: string;
  content: string;
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

function linkSnippet(wildcard: WildcardSpec): string {
  const link = wildcard.link;
  if (!link) return '';
  const label = escapeHtml(localized(link.label));
  const href = escapeHtml(link.href);
  const id = link.htmlID ? ` id="${escapeHtml(link.htmlID)}"` : '';

  switch (wildcard.kind) {
    case 'teacherStudentPageOption':
      return `<option value="${href}">${label}</option>`;
    default:
      return `<li><a href="${href}"${id}>${label}</a></li>`;
  }
}

function applyCondition(content: string, wildcard: WildcardSpec): string {
  let result = content;
  const condition = wildcard.condition;
  if (!condition) return result;

  if (condition.schoolIds?.length) {
    result = `~[if#school.~(curschoolid)=${condition.schoolIds.join(',')}]${result}[/if#school]`;
  }
  if (condition.guardianOnly) {
    result = `~[if#parent.isguardian]${result}[/if#parent.isguardian]`;
  }
  if (condition.raw) {
    const match = condition.raw.match(/~\[if#([A-Za-z0-9_]+)\./);
    const closing = match ? `[/if#${match[1]}]` : '';
    result = `${condition.raw}${result}${closing}`;
  }
  return result;
}

export function generateWildcards(spec: PluginSpec): WildcardFile[] {
  return spec.wildcards.map((wildcard) => {
    const content =
      wildcard.kind === 'raw'
        ? wildcard.content ?? ''
        : applyCondition(linkSnippet(wildcard), wildcard);
    return { filename: wildcard.filename, content };
  });
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function xmlAttr(name: string, value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  return ` ${name}="${escapeXml(String(value))}"`;
}

import type {
  LocalizedText,
  NavEntrySpec,
  NavFileSpec,
  PageSpec,
  PluginSpec,
} from '../spec/types';

export interface NavigationFile {
  filename: string;
  content: string;
}

function localized(text: LocalizedText): string {
  const zh = text.zh?.trim();
  return zh ? `${zh} ${text.en}` : text.en;
}

function schoolCondition(url: string, schoolIds: number[]): string {
  return `~[if#school.~(curschoolid)=${schoolIds.join(',')}]${url}[/if#school]`;
}

function generateEntry(
  entry: NavEntrySpec,
  file: NavFileSpec,
  pagesById: Map<string, PageSpec>,
  parentHtmlId?: string,
): Record<string, unknown> {
  let pageURL: string | null | undefined = entry.pageURL;

  if (pageURL === undefined && entry.pageId) {
    const page = pagesById.get(entry.pageId);
    if (page) {
      pageURL = `/${page.path.replace(/\\/g, '/')}`;
      if (page.context === 'student') {
        pageURL += '?frn=~(studentfrn)';
      }
      if (entry.schoolIds?.length && pageURL.startsWith('/admin/')) {
        pageURL = schoolCondition(pageURL, entry.schoolIds);
      }
    }
  }

  if (pageURL === undefined) pageURL = null;

  const result: Record<string, unknown> = {
    htmlID: entry.htmlID,
    title: localized(entry.title),
    sortOrder: entry.sortOrder,
    version: entry.version,
    pageURL,
    contextType: entry.contextType ?? file.contextType,
  };

  const districtLevelContext =
    entry.districtLevelContext ?? file.districtLevelContext;
  if (districtLevelContext !== undefined) {
    result.districtLevelContext = districtLevelContext;
  }

  if (entry.requiredContext) result.requiredContext = entry.requiredContext;
  if (entry.isNewTab !== undefined) result.isNewTab = entry.isNewTab;
  if (entry.isLandingPage !== undefined) {
    result.isLandingPage = entry.isLandingPage;
  }
  if (entry.checkParams !== undefined) result.checkParams = entry.checkParams;

  if (entry.parentHTMLID) {
    result.parentHTMLID = entry.parentHTMLID;
  } else if (parentHtmlId) {
    result.parentHTMLID = parentHtmlId;
  }

  if (entry.children?.length) {
    result.children = entry.children.map((child) =>
      generateEntry(child, file, pagesById, entry.htmlID),
    );
  }

  return { ...result, ...(entry.extra ?? {}) };
}

export function generateNavigation(spec: PluginSpec): NavigationFile[] {
  const pagesById = new Map(spec.pages.map((page) => [page.id, page]));

  return spec.navigation.map((file) => ({
    filename: file.filename,
    content: `${JSON.stringify(
      {
        pages: file.entries.map((entry) =>
          generateEntry(entry, file, pagesById),
        ),
      },
      null,
      2,
    )}\n`,
  }));
}

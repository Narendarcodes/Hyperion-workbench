import type {
  DiffBlockLabels,
  JsonTreeLabels,
  MarkdownLabels,
  ReadBlockLabels,
  SearchBlockLabels,
  TerminalBlockLabels,
  WebBlockLabels,
} from '../src/index.ts'

export const markdownLabels: MarkdownLabels = {
  code: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  footnotes: 'Footnotes',
}

export const diffBlockLabels: DiffBlockLabels = {
  copy: 'Copy', copied: 'Copied', collapseAria: 'Collapse diff',
  expandAria: hidden => `Expand ${hidden} more diff lines`,
  collapse: 'Collapse', expand: hidden => `… ${hidden} more lines`,
  files: count => `${count} ${count === 1 ? 'file' : 'files'}`,
}

export const readBlockLabels: ReadBlockLabels = {
  window: (shown, total) => `Showing ${shown} of ${total} lines`,
  copy: 'Copy', copied: 'Copied', collapseAria: 'Collapse content',
  expandAria: hidden => `Expand ${hidden} more lines`,
  collapse: 'Collapse', expand: hidden => `… ${hidden} more lines`,
}

export const searchBlockLabels: SearchBlockLabels = {
  pathsSummary: (shown, total, truncated) => truncated
    ? `Showing ${shown} of ${total} paths`
    : `${shown} paths`,
  matchesSummary: (shown, total, files, truncated) => truncated
    ? `Showing ${shown} of ${total} matches · ${files} files`
    : `${shown} matches · ${files} files`,
  copy: 'Copy', copied: 'Copied', noResults: 'No results',
  collapseAria: 'Collapse results',
  expandAria: hidden => `Expand ${hidden} more result lines`,
  collapse: 'Collapse', expand: hidden => `… ${hidden} more lines`,
}

export const terminalBlockLabels: TerminalBlockLabels = {
  signal: signal => `signal ${signal}`,
  exitCode: code => `exit code ${code}`,
  running: 'Running', failed: 'Failed', done: 'Done',
  copy: 'Copy', copied: 'Copied', noOutput: 'No output',
  collapseAria: 'Collapse output', collapse: 'Collapse',
  expandAria: hidden => `Expand the remaining ${hidden} output lines`,
  expand: hidden => `… ${hidden} more lines`,
}

export const jsonTreeLabels: JsonTreeLabels = {
  copyValue: 'Copy value', copyJson: 'Copy JSON', copyPath: 'Copy property path',
  copyPrettyJson: 'Copy pretty JSON', copyCompactJson: 'Copy compact JSON',
  copied: 'Copied', copyFailed: 'Copy failed',
  collapseNode: 'Collapse JSON node', expandNode: 'Expand JSON node',
  copyButtonTitle: action => `${action}; right-click for copy options`,
}

export const webBlockLabels: WebBlockLabels = {
  noResults: 'No results found', sourcesTruncated: 'Showing part of the source list; open tool details for the rest.',
  sourcesChecked: count => `Sources checked (${count})`,
  verifyNotice: 'Links may be wrong or unrelated. Open each source before relying on it.',
  http: 'HTTP', contentTruncated: 'Content truncated', markdown: markdownLabels,
}

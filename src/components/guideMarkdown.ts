import type { JSONContent } from '@tiptap/react';

type Mark = {
  type: 'bold' | 'italic' | 'strike' | 'code' | 'link';
  attrs?: Record<string, unknown>;
};

type ListKind = 'bullet' | 'ordered' | 'task';

type ListMatch = {
  indent: number;
  kind: ListKind;
  text: string;
  checked?: boolean;
};

function createTextNode(text: string, marks?: Mark[]): JSONContent | null {
  if (!text) return null;
  return {
    type: 'text',
    text,
    ...(marks && marks.length > 0 ? { marks } : {}),
  };
}

function appendText(nodes: JSONContent[], text: string, marks?: Mark[]) {
  const nextNode = createTextNode(text, marks);
  if (nextNode) nodes.push(nextNode);
}

function appendHardBreak(nodes: JSONContent[]) {
  nodes.push({ type: 'hardBreak' });
}

function addMark(nodes: JSONContent[], mark: Mark): JSONContent[] {
  return nodes.map((node) => {
    if (node.type !== 'text') return node;
    const existingMarks = Array.isArray(node.marks) ? node.marks : [];
    return {
      ...node,
      marks: [...existingMarks, mark],
    };
  });
}

function parseInline(text: string): JSONContent[] {
  const output: JSONContent[] = [];
  let remaining = text;

  while (remaining) {
    const candidates = [
      { type: 'code' as const, match: /`([^`]+)`/.exec(remaining) },
      { type: 'link' as const, match: /\[([^\]]+)\]\(([^)]+)\)/.exec(remaining) },
      { type: 'autolink' as const, match: /<(https?:\/\/[^>\s]+)>/.exec(remaining) },
      { type: 'url' as const, match: /https?:\/\/[^\s<]+[^\s<.,:;"')\]]/.exec(remaining) },
      { type: 'bold' as const, match: /\*\*([^*]+)\*\*/.exec(remaining) },
      { type: 'boldAlt' as const, match: /__([^_]+)__/.exec(remaining) },
      { type: 'strike' as const, match: /~~([^~]+)~~/.exec(remaining) },
      { type: 'italic' as const, match: /\*([^*]+)\*/.exec(remaining) },
      { type: 'italicAlt' as const, match: /_([^_]+)_/.exec(remaining) },
    ].filter((item) => item.match);

    if (candidates.length === 0) {
      appendText(output, remaining);
      break;
    }

    const next = candidates.reduce((earliest, current) => {
      if (!earliest.match) return current;
      if (!current.match) return earliest;
      return current.match.index < earliest.match.index ? current : earliest;
    });

    if (!next.match) {
      appendText(output, remaining);
      break;
    }

    const start = next.match.index;
    if (start > 0) {
      appendText(output, remaining.slice(0, start));
    }

    if (next.type === 'code') {
      appendText(output, next.match[1], [{ type: 'code' }]);
    }

    if (next.type === 'link') {
      const inner = parseInline(next.match[1]);
      output.push(...addMark(inner, { type: 'link', attrs: { href: next.match[2].trim() } }));
    }

    if (next.type === 'autolink' || next.type === 'url') {
      const href = String(next.match[1] || next.match[0] || '').trim();
      if (!href) {
        remaining = remaining.slice(start + next.match[0].length);
        continue;
      }
      appendText(output, href, [{ type: 'link', attrs: { href } }]);
    }

    if (next.type === 'bold' || next.type === 'boldAlt') {
      const inner = parseInline(next.match[1]);
      output.push(...addMark(inner, { type: 'bold' }));
    }

    if (next.type === 'strike') {
      const inner = parseInline(next.match[1]);
      output.push(...addMark(inner, { type: 'strike' }));
    }

    if (next.type === 'italic' || next.type === 'italicAlt') {
      const inner = parseInline(next.match[1]);
      output.push(...addMark(inner, { type: 'italic' }));
    }

    remaining = remaining.slice(start + next.match[0].length);
  }

  return output;
}

function createParagraphFromLines(lines: string[]): JSONContent {
  const content: JSONContent[] = [];

  lines.forEach((line, index) => {
    const hasHardBreak = /(?: {2,}|\\)$/.test(line);
    const normalized = line.replace(/(?: {2,}|\\)$/, '').trim();
    const inlineNodes = parseInline(normalized);
    if (inlineNodes.length > 0) {
      content.push(...inlineNodes);
    }

    if (index < lines.length - 1) {
      if (hasHardBreak) {
        appendHardBreak(content);
      } else if (content.length > 0) {
        appendText(content, ' ');
      }
    }
  });

  return {
    type: 'paragraph',
    ...(content.length > 0 ? { content } : {}),
  };
}

function createHeading(level: number, text: string): JSONContent {
  const content = parseInline(text.trim());
  return {
    type: 'heading',
    attrs: {
      level: Math.min(4, Math.max(2, level)),
    },
    ...(content.length > 0 ? { content } : {}),
  };
}

function createCodeBlock(lines: string[], language?: string): JSONContent {
  const text = lines.join('\n');
  return {
    type: 'codeBlock',
    ...(language ? { attrs: { language } } : {}),
    content: text ? [{ type: 'text', text }] : [],
  };
}

function expandIndent(line: string) {
  return line.replace(/\t/g, '    ');
}

function getLeadingIndent(line: string) {
  const match = /^(\s*)/.exec(expandIndent(line));
  return match ? match[1].length : 0;
}

function stripIndent(line: string, indent: number) {
  const expanded = expandIndent(line);
  return expanded.slice(Math.min(indent, expanded.length));
}

function getFenceMarker(line: string) {
  const match = /^(```+|~~~+)/.exec(line.trim());
  return match ? match[1][0] : null;
}

function isHorizontalRule(line: string) {
  return /^(\*{3,}|-{3,}|_{3,})$/.test(line.trim());
}

function isHeading(line: string) {
  return /^(#{1,6})\s+/.test(line);
}

function isBlockquote(line: string) {
  return /^\s*>\s?/.test(line);
}

function isStandaloneImage(line: string) {
  return /^!\[[^\]]*]\((.+)\)$/.test(line.trim());
}

function createStandaloneImage(line: string): JSONContent | null {
  const match = /^!\[([^\]]*)]\((.+)\)$/.exec(line.trim());
  if (!match) return null;
  const src = match[2].trim();
  if (!src) return null;
  return {
    type: 'image',
    attrs: {
      src,
      alt: match[1].trim(),
    },
  };
}

function splitTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return [];
  const normalized = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return normalized.split('|').map((cell) => cell.trim());
}

function parseTableAlignments(line: string): Array<'left' | 'center' | 'right' | null> {
  return splitTableRow(line).map((cell) => {
    if (!/^:?-{3,}:?$/.test(cell)) return null;
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });
}

function isTableSeparatorRow(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableStart(lines: string[], index: number) {
  if (index + 1 >= lines.length) return false;
  const header = splitTableRow(lines[index]);
  if (header.length < 2) return false;
  return isTableSeparatorRow(lines[index + 1]);
}

function createTableRow(cells: string[], header: boolean, aligns: Array<'left' | 'center' | 'right' | null>): JSONContent {
  return {
    type: 'tableRow',
    content: cells.map((cell, index) => ({
      type: header ? 'tableHeader' : 'tableCell',
      ...(aligns[index] ? { attrs: { align: aligns[index] } } : {}),
      content: [createParagraphFromLines([cell])],
    })),
  };
}

function parseTableBlock(lines: string[], index: number) {
  const headerCells = splitTableRow(lines[index]);
  const aligns = parseTableAlignments(lines[index + 1]);
  const rows: JSONContent[] = [createTableRow(headerCells, true, aligns)];
  index += 2;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) break;
    const cells = splitTableRow(line);
    if (cells.length < 2) break;
    rows.push(createTableRow(cells, false, aligns));
    index += 1;
  }

  return {
    node: {
      type: 'table',
      content: rows,
    } as JSONContent,
    nextIndex: index,
  };
}

function matchListLine(line: string): ListMatch | null {
  const expanded = expandIndent(line);

  const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(expanded);
  if (taskMatch) {
    return {
      indent: taskMatch[1].length,
      kind: 'task',
      checked: taskMatch[2].toLowerCase() === 'x',
      text: taskMatch[3].trim(),
    };
  }

  const bulletMatch = /^(\s*)[-*+]\s+(.*)$/.exec(expanded);
  if (bulletMatch) {
    return {
      indent: bulletMatch[1].length,
      kind: 'bullet',
      text: bulletMatch[2].trim(),
    };
  }

  const orderedMatch = /^(\s*)\d+[.)]\s+(.*)$/.exec(expanded);
  if (orderedMatch) {
    return {
      indent: orderedMatch[1].length,
      kind: 'ordered',
      text: orderedMatch[2].trim(),
    };
  }

  return null;
}

function parseBlocks(lines: string[]): JSONContent[] {
  const content: JSONContent[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^<!--.*-->$/.test(trimmed)) {
      index += 1;
      continue;
    }

    if (!trimmed.startsWith('<!--') && index + 1 < lines.length && /^(=+|-+)\s*$/.test(lines[index + 1].trim())) {
      const nextLine = lines[index + 1].trim();
      const level = nextLine.startsWith('=') ? 1 : 2;
      content.push(createHeading(level, line));
      index += 2;
      continue;
    }

    const fenceMarker = getFenceMarker(trimmed);
    if (fenceMarker) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && getFenceMarker(lines[index].trim()) !== fenceMarker) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && getFenceMarker(lines[index].trim()) === fenceMarker) {
        index += 1;
      }
      const languageMatch = /^(?:```+|~~~+)\s*([A-Za-z0-9_+-]+)?/.exec(trimmed);
      const language = languageMatch?.[1]?.trim() || undefined;
      content.push(createCodeBlock(codeLines, language));
      continue;
    }

    if (isHorizontalRule(trimmed)) {
      content.push({ type: 'horizontalRule' });
      index += 1;
      continue;
    }

    if (isHeading(line)) {
      const match = /^(#{1,6})\s+(.+)$/.exec(line);
      if (match) {
        content.push(createHeading(match[1].length, match[2]));
        index += 1;
        continue;
      }
    }

    if (isStandaloneImage(line)) {
      const image = createStandaloneImage(line);
      if (image) content.push(image);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableBlock = parseTableBlock(lines, index);
      content.push(tableBlock.node);
      index = tableBlock.nextIndex;
      continue;
    }

    const listMatch = matchListLine(line);
    if (listMatch) {
      const listBlock = parseListBlock(lines, index, listMatch.indent);
      content.push(listBlock.node);
      index = listBlock.nextIndex;
      continue;
    }

    if (isBlockquote(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && isBlockquote(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      content.push({
        type: 'blockquote',
        content: parseBlocks(quoteLines),
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^<!--.*-->$/.test(lines[index].trim()) &&
      !getFenceMarker(lines[index].trim()) &&
      !isHorizontalRule(lines[index].trim()) &&
      !isHeading(lines[index]) &&
      !isStandaloneImage(lines[index]) &&
      !isBlockquote(lines[index]) &&
      !isTableStart(lines, index) &&
      !matchListLine(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    content.push(createParagraphFromLines(paragraphLines));
  }

  return content;
}

function parseIndentedChildBlocks(lines: string[], start: number, parentIndent: number) {
  const nestedLines: string[] = [];
  let index = start;

  while (index < lines.length) {
    const current = lines[index];
    if (!current.trim()) {
      nestedLines.push('');
      index += 1;
      continue;
    }

    const listMatch = matchListLine(current);
    if (listMatch && listMatch.indent <= parentIndent) break;
    if (!listMatch && getLeadingIndent(current) <= parentIndent) break;

    nestedLines.push(stripIndent(current, parentIndent + 2));
    index += 1;
  }

  return {
    blocks: parseBlocks(nestedLines),
    nextIndex: index,
  };
}

function parseListBlock(lines: string[], start: number, indent: number): { node: JSONContent; nextIndex: number } {
  const firstMatch = matchListLine(lines[start]);
  if (!firstMatch) {
    return {
      node: { type: 'bulletList', content: [] },
      nextIndex: start,
    };
  }

  const listType =
    firstMatch.kind === 'task' ? 'taskList' : firstMatch.kind === 'ordered' ? 'orderedList' : 'bulletList';
  const items: JSONContent[] = [];
  let index = start;

  while (index < lines.length) {
    while (index < lines.length && !lines[index].trim()) {
      index += 1;
    }

    const match = index < lines.length ? matchListLine(lines[index]) : null;
    if (!match || match.indent !== indent || match.kind !== firstMatch.kind) break;

    const itemContent: JSONContent[] = [createParagraphFromLines([match.text])];
    const item: JSONContent =
      match.kind === 'task'
        ? { type: 'taskItem', attrs: { checked: !!match.checked }, content: itemContent }
        : { type: 'listItem', content: itemContent };

    index += 1;

    while (index < lines.length) {
      if (!lines[index].trim()) {
        index += 1;
        continue;
      }

      const nextMatch = matchListLine(lines[index]);
      if (nextMatch) {
        if (nextMatch.indent > indent) {
          const nested = parseListBlock(lines, index, nextMatch.indent);
          itemContent.push(nested.node);
          index = nested.nextIndex;
          continue;
        }
        break;
      }

      if (getLeadingIndent(lines[index]) > indent) {
        const nested = parseIndentedChildBlocks(lines, index, indent);
        itemContent.push(...nested.blocks);
        index = nested.nextIndex;
        continue;
      }

      break;
    }

    items.push(item);
  }

  return {
    node: {
      type: listType,
      content: items,
    },
    nextIndex: index,
  };
}

export function importMarkdownToGuideDoc(markdown: string): JSONContent {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return { type: 'doc', content: [] };
  }

  return {
    type: 'doc',
    content: parseBlocks(normalized.split('\n')),
  };
}

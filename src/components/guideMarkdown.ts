import type { JSONContent } from '@tiptap/react';

type Mark = {
  type: 'bold' | 'italic' | 'code' | 'link';
  attrs?: Record<string, unknown>;
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
      { type: 'bold' as const, match: /\*\*([^*]+)\*\*/.exec(remaining) },
      { type: 'italic' as const, match: /\*([^*]+)\*/.exec(remaining) },
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

    if (next.type === 'bold') {
      const inner = parseInline(next.match[1]);
      output.push(...addMark(inner, { type: 'bold' }));
    }

    if (next.type === 'italic') {
      const inner = parseInline(next.match[1]);
      output.push(...addMark(inner, { type: 'italic' }));
    }

    remaining = remaining.slice(start + next.match[0].length);
  }

  return output;
}

function createParagraph(text: string): JSONContent {
  const content = parseInline(text.trim());
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

function createListItem(text: string): JSONContent {
  return {
    type: 'listItem',
    content: [createParagraph(text)],
  };
}

function isHorizontalRule(line: string) {
  return /^(\*{3,}|-{3,}|_{3,})$/.test(line.trim());
}

function isFence(line: string) {
  return /^```/.test(line.trim());
}

function isHeading(line: string) {
  return /^(#{1,6})\s+/.test(line);
}

function isBulletItem(line: string) {
  return /^[-*+]\s+/.test(line);
}

function isOrderedItem(line: string) {
  return /^\d+\.\s+/.test(line);
}

function isBlockquote(line: string) {
  return /^>\s?/.test(line);
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

function createCodeBlock(lines: string[]): JSONContent {
  const text = lines.join('\n');
  return {
    type: 'codeBlock',
    content: text ? [{ type: 'text', text }] : [],
  };
}

function createBlockquote(lines: string[]): JSONContent {
  const groups: string[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      if (buffer.length > 0) {
        groups.push(buffer.join(' '));
        buffer = [];
      }
      continue;
    }
    buffer.push(line.trim());
  }

  if (buffer.length > 0) {
    groups.push(buffer.join(' '));
  }

  return {
    type: 'blockquote',
    content: groups.map((group) => createParagraph(group)),
  };
}

export function importMarkdownToGuideDoc(markdown: string): JSONContent {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return { type: 'doc', content: [] };
  }

  const lines = normalized.split('\n');
  const content: JSONContent[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isFence(trimmed)) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !isFence(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && isFence(lines[index].trim())) {
        index += 1;
      }
      content.push(createCodeBlock(codeLines));
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

    if (isBulletItem(line)) {
      const items: JSONContent[] = [];
      while (index < lines.length && isBulletItem(lines[index])) {
        items.push(createListItem(lines[index].replace(/^[-*+]\s+/, '').trim()));
        index += 1;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    if (isOrderedItem(line)) {
      const items: JSONContent[] = [];
      while (index < lines.length && isOrderedItem(lines[index])) {
        items.push(createListItem(lines[index].replace(/^\d+\.\s+/, '').trim()));
        index += 1;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    if (isBlockquote(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && isBlockquote(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      content.push(createBlockquote(quoteLines));
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isFence(lines[index].trim()) &&
      !isHorizontalRule(lines[index].trim()) &&
      !isHeading(lines[index]) &&
      !isStandaloneImage(lines[index]) &&
      !isBulletItem(lines[index]) &&
      !isOrderedItem(lines[index]) &&
      !isBlockquote(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    content.push(createParagraph(paragraphLines.join(' ')));
  }

  return {
    type: 'doc',
    content,
  };
}

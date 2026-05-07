import {
  BoldOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  InsertRowBelowOutlined,
  ItalicOutlined,
  LinkOutlined,
  LoadingOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  UndoOutlined,
  UploadOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Mark, Node, mergeAttributes } from '@tiptap/core';
import { Alert, Button, Collapse, Form, Input, InputNumber, Modal, Space, Tooltip, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import type { Editor, JSONContent } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useState } from 'react';
import { importMarkdownToGuideDoc } from './guideMarkdown';
import { uploadGuideCover } from '../services/guides';
import { getErrorMessage } from '../services/request';

type GuideRichTextEditorProps = {
  value?: string;
  onChange?: (value?: string) => void;
};

type Gw2AttrDefinition = {
  name: string;
  label: string;
  numeric?: boolean;
  required?: boolean;
};

type Gw2NodeDefinition = {
  name: 'gw2-item' | 'gw2-skill' | 'gw2-trait' | 'gw2-build' | 'gw2-chatcode';
  title: string;
  block?: boolean;
  attrs: Gw2AttrDefinition[];
};

type Gw2NodeFormValue = string | number | null | undefined;
type Gw2NodeFormValues = Record<string, Gw2NodeFormValue>;

type Gw2NodeModalState = {
  mode: 'create' | 'edit';
  definition: Gw2NodeDefinition;
  initialAttrs?: Gw2NodeFormValues;
};

type GuideImageFormValues = {
  src?: string;
  alt?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: 'none' | 'left' | 'right';
};

type ImageModalState = {
  mode: 'create' | 'edit';
  initialValues?: GuideImageFormValues;
};

type MarkdownImportState = {
  value: string;
};

const DEFAULT_DOC: JSONContent = {
  type: 'doc',
  content: [],
};

const GW2_NODE_DEFINITIONS: Gw2NodeDefinition[] = [
  {
    name: 'gw2-item',
    title: 'GW2 物品',
    attrs: [
      { name: 'itemId', label: '物品 ID', numeric: true, required: true },
      { name: 'label', label: '显示名称' },
    ],
  },
  {
    name: 'gw2-skill',
    title: 'GW2 技能',
    attrs: [
      { name: 'skillId', label: '技能 ID', numeric: true, required: true },
      { name: 'label', label: '显示名称' },
    ],
  },
  {
    name: 'gw2-trait',
    title: 'GW2 特性',
    attrs: [
      { name: 'traitId', label: '特性 ID', numeric: true, required: true },
      { name: 'specializationId', label: '专精 ID', numeric: true },
      { name: 'label', label: '显示名称' },
    ],
  },
  {
    name: 'gw2-build',
    title: 'GW2 Build',
    block: true,
    attrs: [
      { name: 'buildCode', label: 'Build Chat Link', required: true },
      { name: 'specializationId', label: '专精 ID', numeric: true },
      { name: 'label', label: '显示名称' },
    ],
  },
  {
    name: 'gw2-chatcode',
    title: 'GW2 Chat Link',
    block: true,
    attrs: [
      { name: 'value', label: 'Chat Link', required: true },
      { name: 'label', label: '显示名称' },
    ],
  },
];

const SUPPORTED_NODE_TYPES = new Set([
  'doc',
  'text',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'image',
  'hardBreak',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'taskList',
  'taskItem',
  ...GW2_NODE_DEFINITIONS.map((item) => item.name),
]);

const SUPPORTED_MARK_TYPES = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link', 'textColor']);
const MAX_INLINE_IMAGE_SIZE_MB = 5;

function normalizeImageWidth(value: unknown): string | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return `${raw}px`;
  if (/^\d+(\.\d+)?(px|%)$/.test(raw)) return raw;
  return null;
}

function normalizeImageAlign(value: unknown): 'left' | 'center' | 'right' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'left' || raw === 'center' || raw === 'right') return raw;
  return null;
}

function normalizeImageWrap(value: unknown): 'none' | 'left' | 'right' {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'left' || raw === 'right') return raw;
  return 'none';
}

function buildImageStyle(width: unknown, align: unknown, wrap: unknown) {
  const normalizedWidth = normalizeImageWidth(width);
  const normalizedAlign = normalizeImageAlign(align);
  const normalizedWrap = normalizeImageWrap(wrap);
  const styles: string[] = [];

  if (normalizedWidth) {
    styles.push(`width: ${normalizedWidth}`);
  }

  if (normalizedWrap === 'left') {
    styles.push('float: left', 'margin: 0 16px 12px 0');
    return styles.join('; ');
  }

  if (normalizedWrap === 'right') {
    styles.push('float: right', 'margin: 0 0 12px 16px');
    return styles.join('; ');
  }

  if (normalizedAlign === 'center') {
    styles.push('display: block', 'margin-left: auto', 'margin-right: auto');
  } else if (normalizedAlign === 'right') {
    styles.push('display: block', 'margin-left: auto', 'margin-right: 0');
  } else if (normalizedAlign === 'left') {
    styles.push('display: block', 'margin-left: 0', 'margin-right: auto');
  }

  return styles.join('; ');
}

function normalizeTextColor(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw;
}

function normalizeTableAlign(value: unknown): 'left' | 'center' | 'right' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'left' || raw === 'center' || raw === 'right') return raw;
  return null;
}

function renderTableAlign(alignment: unknown) {
  const align = normalizeTableAlign(alignment);
  if (!align) return {};
  return {
    'data-align': align,
    style: `text-align: ${align};`,
  };
}

const GuideImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-width') || element.style.width || null,
        renderHTML: (attributes) => {
          const width = normalizeImageWidth(attributes.width);
          return width ? { 'data-width': width } : {};
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => normalizeImageAlign(element.getAttribute('data-align')) || 'center',
        renderHTML: (attributes) => {
          const align = normalizeImageAlign(attributes.align);
          return align ? { 'data-align': align } : {};
        },
      },
      wrap: {
        default: 'none',
        parseHTML: (element) => normalizeImageWrap(element.getAttribute('data-wrap')),
        renderHTML: (attributes) => {
          const wrap = normalizeImageWrap(attributes.wrap);
          return wrap !== 'none' ? { 'data-wrap': wrap } : {};
        },
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    const width = normalizeImageWidth(node.attrs.width);
    const align = normalizeImageAlign(node.attrs.align) || 'center';
    const wrap = normalizeImageWrap(node.attrs.wrap);
    const style = buildImageStyle(width, align, wrap);

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...(width ? { 'data-width': width } : {}),
        'data-align': align,
        ...(wrap !== 'none' ? { 'data-wrap': wrap } : {}),
        ...(style ? { style } : {}),
      }),
    ];
  },
});

const GuideCodeBlock = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: (element) => {
          const codeElement = element.querySelector('code');
          const className = codeElement?.getAttribute('class') || '';
          const match = /language-([A-Za-z0-9_+-]+)/.exec(className);
          return (
            String(element.getAttribute('data-language') || match?.[1] || '').trim() || null
          );
        },
        renderHTML: (attributes) => {
          const language = String(attributes.language || '').trim();
          return language ? { 'data-language': language } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'pre' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const language = String(node.attrs.language || '').trim();
    return [
      'pre',
      mergeAttributes(HTMLAttributes, language ? { 'data-language': language } : {}),
      ['code', language ? { class: `language-${language}` } : {}, 0],
    ];
  },

  addCommands() {
    return {
      setCodeBlock:
        (attributes) =>
        ({ commands }) =>
          commands.setNode(this.name, attributes),
      toggleCodeBlock:
        (attributes) =>
        ({ commands }) =>
          commands.toggleNode(this.name, 'paragraph', attributes),
    };
  },
});

const GuideUnderline = Mark.create({
  name: 'underline',

  parseHTML() {
    return [
      { tag: 'u' },
      {
        style: 'text-decoration',
        getAttrs: (value) => (String(value || '').includes('underline') ? {} : false),
      },
    ];
  },

  renderHTML() {
    return ['u', 0];
  },
});

const GuideTextColor = Mark.create({
  name: 'textColor',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => normalizeTextColor(element.style.color),
        renderHTML: (attributes) => {
          const color = normalizeTextColor(attributes.color);
          if (!color) return {};
          return {
            'data-guide-text-color': color,
            style: `color: ${color};`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-guide-text-color]',
      },
      {
        style: 'color',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

const GuideTable = Node.create({
  name: 'table',
  group: 'block',
  content: 'tableRow+',

  parseHTML() {
    return [{ tag: 'table' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['table', HTMLAttributes, ['tbody', 0]];
  },
});

const GuideTableRow = Node.create({
  name: 'tableRow',
  content: '(tableHeader|tableCell)+',

  parseHTML() {
    return [{ tag: 'tr' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['tr', HTMLAttributes, 0];
  },
});

const GuideTableCell = Node.create({
  name: 'tableCell',
  content: 'block+',

  addAttributes() {
    return {
      align: {
        default: null,
        parseHTML: (element) =>
          normalizeTableAlign(element.getAttribute('data-align') || element.style.textAlign),
        renderHTML: (attributes) => renderTableAlign(attributes.align),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'td' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['td', HTMLAttributes, 0];
  },
});

const GuideTableHeader = Node.create({
  name: 'tableHeader',
  content: 'block+',

  addAttributes() {
    return {
      align: {
        default: null,
        parseHTML: (element) =>
          normalizeTableAlign(element.getAttribute('data-align') || element.style.textAlign),
        renderHTML: (attributes) => renderTableAlign(attributes.align),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'th' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['th', HTMLAttributes, 0];
  },
});

const GuideTaskList = Node.create({
  name: 'taskList',
  group: 'block',
  content: 'taskItem+',

  parseHTML() {
    return [{ tag: 'ul[data-type="taskList"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes(HTMLAttributes, { 'data-type': 'taskList' }), 0];
  },
});

const GuideTaskItem = Node.create({
  name: 'taskItem',
  content: 'paragraph block*',
  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-checked') === 'true',
        renderHTML: (attributes) => ({
          'data-checked': attributes.checked ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'li[data-type="taskItem"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'taskItem' }), 0];
  },
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectUnsupportedEntries(node: unknown, output: Set<string>) {
  if (!isPlainObject(node)) return;

  const nodeType = typeof node.type === 'string' ? node.type.trim() : '';
  if (nodeType && !SUPPORTED_NODE_TYPES.has(nodeType)) {
    output.add(`node:${nodeType}`);
  }

  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (!isPlainObject(mark)) continue;
      const markType = typeof mark.type === 'string' ? mark.type.trim() : '';
      if (markType && !SUPPORTED_MARK_TYPES.has(markType)) {
        output.add(`mark:${markType}`);
      }
    }
  }

  if (!Array.isArray(node.content)) return;
  for (const child of node.content) {
    collectUnsupportedEntries(child, output);
  }
}

function parseDocument(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) {
    return { document: DEFAULT_DOC, error: null as string | null, unsupported: [] as string[] };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return { document: null, error: 'contentJson 必须是 JSON 对象', unsupported: [] as string[] };
    }

    const unsupported = new Set<string>();
    collectUnsupportedEntries(parsed, unsupported);

    return {
      document: parsed as JSONContent,
      error: null as string | null,
      unsupported: Array.from(unsupported).sort(),
    };
  } catch {
    return { document: null, error: 'contentJson 不是合法的 JSON', unsupported: [] as string[] };
  }
}

function serializeDocument(value: JSONContent) {
  return JSON.stringify(value, null, 2);
}

function findGw2NodeDefinition(name: string) {
  return GW2_NODE_DEFINITIONS.find((item) => item.name === name) || null;
}

function pickGw2NodeDisplay(attrs: Record<string, unknown>, fallback: string) {
  const candidates = [attrs.label, attrs.name, attrs.value, attrs.buildCode];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  const firstKnown = Object.values(attrs).find((value) => {
    if (typeof value === 'number') return Number.isFinite(value);
    return typeof value === 'string' && value.trim();
  });

  if (typeof firstKnown === 'number') return String(firstKnown);
  if (typeof firstKnown === 'string' && firstKnown.trim()) return firstKnown.trim();
  return fallback;
}

function createGw2Node(definition: Gw2NodeDefinition) {
  const tagName = definition.block ? 'div' : 'span';

  return Node.create({
    name: definition.name,
    group: definition.block ? 'block' : 'inline',
    inline: !definition.block,
    atom: true,
    selectable: true,

    addAttributes() {
      return definition.attrs.reduce<Record<string, { default: null }>>((acc, attr) => {
        acc[attr.name] = { default: null };
        return acc;
      }, {});
    },

    parseHTML() {
      return [{ tag: `${tagName}[data-gw2-node="${definition.name}"]` }];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
      const attrs = isPlainObject(HTMLAttributes) ? HTMLAttributes : {};
      const display = pickGw2NodeDisplay(attrs, definition.title);
      const metaPairs = Object.entries(attrs)
        .filter(([key, value]) => key !== 'class' && value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}: ${String(value)}`);

      if (definition.block) {
        return [
          'div',
          {
            ...HTMLAttributes,
            'data-gw2-node': definition.name,
            class: 'guide-gw2-block-card',
            contenteditable: 'false',
          },
          ['div', { class: 'guide-gw2-node-kicker' }, definition.title],
          ['div', { class: 'guide-gw2-node-body' }, display],
          ...(metaPairs.length > 0 ? [['div', { class: 'guide-gw2-node-meta' }, metaPairs.join(' | ')]] : []),
        ];
      }

      return [
        'span',
        {
          ...HTMLAttributes,
          'data-gw2-node': definition.name,
          class: 'guide-gw2-inline-token',
          contenteditable: 'false',
        },
        `${definition.title}: ${display}`,
      ];
    },
  });
}

const gw2NodeExtensions = GW2_NODE_DEFINITIONS.map((item) => createGw2Node(item));

function getSelectedGw2Node(editor: ReturnType<typeof useEditor> | null) {
  if (!editor) return null;

  const selection = editor.state.selection as unknown;
  if (!isPlainObject(selection) || !('node' in selection) || !isPlainObject(selection.node)) {
    return null;
  }

  const node = selection.node;
  const nodeType = isPlainObject(node.type) && typeof node.type.name === 'string' ? node.type.name : '';
  const definition = findGw2NodeDefinition(nodeType);
  if (!definition) return null;

  return {
    definition,
    attrs: isPlainObject(node.attrs) ? toGw2NodeFormValues(node.attrs) : {},
  };
}

function buildGw2NodeAttrs(
  definition: Gw2NodeDefinition,
  values: Gw2NodeFormValues,
  mode: 'create' | 'edit'
) {
  return definition.attrs.reduce<Record<string, string | number | null>>((acc, attr) => {
    const value = values[attr.name];

    if (value === undefined || value === null || value === '') {
      if (mode === 'edit') {
        acc[attr.name] = null;
      }
      return acc;
    }

    acc[attr.name] = attr.numeric ? Number(value) : String(value).trim();
    return acc;
  }, {});
}

function toGw2NodeFormValues(attrs: Record<string, unknown>): Gw2NodeFormValues {
  return Object.entries(attrs).reduce<Gw2NodeFormValues>((acc, [key, value]) => {
    if (
      value === undefined ||
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function getSelectedImage(editor: ReturnType<typeof useEditor> | null): GuideImageFormValues | null {
  if (!editor || !editor.isActive('image')) return null;

  const attrs = editor.getAttributes('image');
  if (!isPlainObject(attrs)) return null;

  return {
    src: typeof attrs.src === 'string' ? attrs.src : '',
    alt: typeof attrs.alt === 'string' ? attrs.alt : '',
    width: typeof attrs.width === 'string' ? attrs.width : '',
    align: normalizeImageAlign(attrs.align) || 'center',
    wrap: normalizeImageWrap(attrs.wrap),
  };
}

function getSelectedTableContext(editor: ReturnType<typeof useEditor> | null) {
  if (!editor) return null;

  const { $from } = editor.state.selection;
  let tableDepth = -1;
  let rowDepth = -1;
  let cellDepth = -1;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const nodeName = $from.node(depth).type.name;
    if (cellDepth < 0 && (nodeName === 'tableCell' || nodeName === 'tableHeader')) {
      cellDepth = depth;
      continue;
    }
    if (rowDepth < 0 && nodeName === 'tableRow') {
      rowDepth = depth;
      continue;
    }
    if (nodeName === 'table') {
      tableDepth = depth;
      break;
    }
  }

  if (tableDepth < 0 || rowDepth < 0 || cellDepth < 0) {
    return null;
  }

  return {
    tableDepth,
    rowDepth,
    cellDepth,
    tablePos: $from.before(tableDepth),
    tableNode: $from.node(tableDepth),
    rowNode: $from.node(rowDepth),
    cellNode: $from.node(cellDepth),
    rowIndex: $from.index(tableDepth),
    colIndex: $from.index(rowDepth),
  };
}

function getTableSelectionState(editor: ReturnType<typeof useEditor> | null) {
  const context = getSelectedTableContext(editor);
  if (!context) return null;

  const currentRow = context.rowNode.toJSON() as JSONContent;
  const isHeaderRow =
    context.rowIndex === 0 &&
    Array.isArray(currentRow.content) &&
    currentRow.content.length > 0 &&
    currentRow.content.every((cell) => cell.type === 'tableHeader');

  return {
    rowIndex: context.rowIndex,
    colIndex: context.colIndex,
    rowCount: context.tableNode.childCount,
    colCount: context.rowNode.childCount,
    isHeaderRow,
    canInsertRowBefore: !isHeaderRow,
    canRemoveRow: !isHeaderRow && context.tableNode.childCount > 1,
  };
}

function createEmptyParagraphNode(): JSONContent {
  return {
    type: 'paragraph',
    content: [],
  };
}

function getTableCellAttrs(cell: JSONContent | undefined) {
  if (!cell || !isPlainObject(cell.attrs)) return undefined;
  const align = normalizeTableAlign(cell.attrs.align);
  return align ? { align } : undefined;
}

function createEmptyTableCellLike(
  cell: JSONContent | undefined,
  forcedType?: 'tableCell' | 'tableHeader'
): JSONContent {
  return {
    type: forcedType || (cell?.type === 'tableHeader' ? 'tableHeader' : 'tableCell'),
    ...(getTableCellAttrs(cell) ? { attrs: getTableCellAttrs(cell) } : {}),
    content: [createEmptyParagraphNode()],
  };
}

function updateSelectedTable(
  editor: ReturnType<typeof useEditor> | null,
  updater: (table: JSONContent, context: NonNullable<ReturnType<typeof getSelectedTableContext>>) => JSONContent
) {
  const context = getSelectedTableContext(editor);
  if (!editor || !context) return false;

  const currentTable = context.tableNode.toJSON() as JSONContent;
  const nextTable = updater(currentTable, context);
  const nextNode = editor.schema.nodeFromJSON(nextTable);
  const tr = editor.state.tr.replaceWith(
    context.tablePos,
    context.tablePos + context.tableNode.nodeSize,
    nextNode
  );

  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

function deleteSelectedTableNode(editor: Editor | null) {
  const context = getSelectedTableContext(editor);
  if (!editor || !context) return false;

  const tr = editor.state.tr.delete(
    context.tablePos,
    context.tablePos + context.tableNode.nodeSize
  );

  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

export default function GuideRichTextEditor({ value, onChange }: GuideRichTextEditorProps) {
  const parsed = useMemo(() => parseDocument(value), [value]);
  const canUseVisualEditor = !parsed.error && parsed.unsupported.length === 0;
  const serializedSupportedDoc = canUseVisualEditor ? JSON.stringify(parsed.document || DEFAULT_DOC) : '';
  const [gw2NodeModal, setGw2NodeModal] = useState<Gw2NodeModalState | null>(null);
  const [gw2NodeForm] = Form.useForm<Gw2NodeFormValues>();
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageForm] = Form.useForm<GuideImageFormValues>();
  const [markdownImport, setMarkdownImport] = useState<MarkdownImportState | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
      }),
      GuideUnderline,
      GuideTextColor,
      GuideCodeBlock,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      GuideImage,
      GuideTable,
      GuideTableRow,
      GuideTableCell,
      GuideTableHeader,
      GuideTaskList,
      GuideTaskItem,
      ...gw2NodeExtensions,
    ],
    content: parsed.document || DEFAULT_DOC,
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (!editor) return false;
        if (!event.ctrlKey && !event.metaKey) return false;
        if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

        const removed = deleteSelectedTableNode(editor);
        if (!removed) return false;

        event.preventDefault();
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(serializeDocument(currentEditor.getJSON()));
    },
  });

  const selectedGw2Node = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => getSelectedGw2Node(currentEditor),
  });
  const selectedImage = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => getSelectedImage(currentEditor),
  });
  const selectedTable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => getTableSelectionState(currentEditor),
  });

  useEffect(() => {
    if (!editor || !canUseVisualEditor) return;
    const nextJson = parsed.document || DEFAULT_DOC;
    if (JSON.stringify(editor.getJSON()) === serializedSupportedDoc) return;
    editor.commands.setContent(nextJson, { emitUpdate: false });
  }, [canUseVisualEditor, editor, parsed.document, serializedSupportedDoc]);

  useEffect(() => {
    if (!gw2NodeModal) {
      gw2NodeForm.resetFields();
      return;
    }

    gw2NodeForm.setFieldsValue(gw2NodeModal.initialAttrs || {});
  }, [gw2NodeForm, gw2NodeModal]);

  useEffect(() => {
    if (!imageModal) {
      imageForm.resetFields();
      return;
    }

    imageForm.setFieldsValue(imageModal.initialValues || {});
  }, [imageForm, imageModal]);

  const rawJsonEditor = (
    <Input.TextArea
      value={value}
      rows={18}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder='{"type":"doc","content":[]}'
    />
  );

  const openGw2NodeModal = (
    mode: 'create' | 'edit',
    definition: Gw2NodeDefinition,
    initialAttrs?: Gw2NodeFormValues
  ) => {
    setGw2NodeModal({ mode, definition, initialAttrs });
  };

  const closeGw2NodeModal = () => {
    setGw2NodeModal(null);
  };

  const openImageModal = (mode: 'create' | 'edit', initialValues?: GuideImageFormValues) => {
    setImageModal({ mode, initialValues });
  };

  const closeImageModal = () => {
    setImageModal(null);
  };

  const openMarkdownImport = () => {
    setMarkdownImport({ value: '' });
  };

  const closeMarkdownImport = () => {
    setMarkdownImport(null);
  };

  const submitGw2NodeModal = async () => {
    if (!editor || !gw2NodeModal) return;

    try {
      const values = await gw2NodeForm.validateFields();
      const attrs = buildGw2NodeAttrs(gw2NodeModal.definition, values, gw2NodeModal.mode);

      if (gw2NodeModal.mode === 'create') {
        editor.chain().focus().insertContent({ type: gw2NodeModal.definition.name, attrs }).run();
      } else {
        editor.chain().focus().updateAttributes(gw2NodeModal.definition.name, attrs).run();
      }

      closeGw2NodeModal();
    } catch {
      return;
    }
  };

  const toggleLink = () => {
    if (!editor) return;
    const previousHref = String(editor.getAttributes('link').href || '').trim();
    const nextHref = window.prompt('请输入链接地址', previousHref || 'https://');
    if (nextHref === null) return;
    const normalized = nextHref.trim();
    if (!normalized) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  const applyTextColor = () => {
    if (!editor) return;
    const previous = normalizeTextColor(editor.getAttributes('textColor').color) || '#1677ff';
    const next = window.prompt('请输入文本颜色，例如 #1677ff 或 rgb(22,119,255)', previous);
    if (next === null) return;
    const color = normalizeTextColor(next);
    if (!color) {
      editor.chain().focus().unsetMark('textColor').run();
      return;
    }
    editor.chain().focus().setMark('textColor', { color }).run();
  };

  const insertBasicTable = () => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '列 1' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '列 2' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '列 3' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容 1' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容 2' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容 3' }] }] },
          ],
        },
      ],
    }).run();
  };

  const insertTableRow = (direction: 'before' | 'after') => {
    updateSelectedTable(editor, (table, context) => {
      const rows = Array.isArray(table.content) ? [...table.content] : [];
      const referenceRow = rows[context.rowIndex];
      const referenceCells = Array.isArray(referenceRow?.content) ? referenceRow.content : [];
      const isHeaderRow =
        context.rowIndex === 0 &&
        Array.isArray(referenceRow?.content) &&
        referenceRow.content.length > 0 &&
        referenceRow.content.every((cell) => cell.type === 'tableHeader');
      if (direction === 'before' && isHeaderRow) {
        return table;
      }
      const nextRow: JSONContent = {
        type: 'tableRow',
        content: referenceCells.map((cell) =>
          createEmptyTableCellLike(cell, isHeaderRow ? 'tableCell' : undefined)
        ),
      };

      const insertIndex = direction === 'before' ? context.rowIndex : context.rowIndex + 1;
      rows.splice(insertIndex, 0, nextRow);

      return {
        ...table,
        content: rows,
      };
    });
  };

  const insertTableColumn = (direction: 'before' | 'after') => {
    updateSelectedTable(editor, (table, context) => {
      const rows = Array.isArray(table.content) ? table.content : [];
      const insertOffset = direction === 'before' ? 0 : 1;

      return {
        ...table,
        content: rows.map((row) => {
          const cells = Array.isArray(row.content) ? [...row.content] : [];
          const referenceCell = cells[context.colIndex];
          const insertIndex = Math.min(context.colIndex + insertOffset, cells.length);
          cells.splice(insertIndex, 0, createEmptyTableCellLike(referenceCell));

          return {
            ...row,
            content: cells,
          };
        }),
      };
    });
  };

  const removeTableRow = () => {
    if (!selectedTable || !selectedTable.canRemoveRow) return;

    updateSelectedTable(editor, (table, context) => {
      const rows = Array.isArray(table.content) ? [...table.content] : [];
      rows.splice(context.rowIndex, 1);

      return {
        ...table,
        content: rows,
      };
    });
  };

  const removeTableColumn = () => {
    if (!selectedTable || selectedTable.colCount <= 1) return;

    updateSelectedTable(editor, (table, context) => {
      const rows = Array.isArray(table.content) ? table.content : [];

      return {
        ...table,
        content: rows.map((row) => {
          const cells = Array.isArray(row.content) ? [...row.content] : [];
          cells.splice(context.colIndex, 1);

          return {
            ...row,
            content: cells,
          };
        }),
      };
    });
  };

  const removeSelectedTable = () => {
    deleteSelectedTableNode(editor);
  };

  const submitImageModal = async () => {
    if (!editor) return;

      try {
        const values = await imageForm.validateFields();
        const src = String(values.src || '').trim();
        const alt = String(values.alt || '').trim();
        const width = normalizeImageWidth(values.width);
        const align = normalizeImageAlign(values.align) || 'center';
        const wrap = normalizeImageWrap(values.wrap);
        if (!src) return;
        if (imageModal?.mode === 'edit' && selectedImage) {
          editor.chain().focus().updateAttributes('image', { src, alt, width, align, wrap }).run();
        } else {
          editor.chain().focus().insertContent({ type: 'image', attrs: { src, alt, width, align, wrap } }).run();
        }
        closeImageModal();
      } catch {
      return;
    }
  };

  const beforeImageUpload: UploadProps['beforeUpload'] = (file) => {
    const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isAllowed) {
      message.error('仅支持 JPG、PNG 和 WEBP 图片');
      return Upload.LIST_IGNORE;
    }

    const isSizeOk = file.size / 1024 / 1024 <= MAX_INLINE_IMAGE_SIZE_MB;
    if (!isSizeOk) {
      message.error('图片大小不能超过 5MB');
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const uploadInlineImage: UploadProps['customRequest'] = async (options) => {
    try {
      setImageUploading(true);
      const uploaded = await uploadGuideCover(options.file as File);
      imageForm.setFieldsValue({ src: uploaded.url || uploaded.path });
      message.success('图片上传成功');
      options.onSuccess?.(uploaded);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '图片上传失败'));
      options.onError?.(error as Error);
    } finally {
      setImageUploading(false);
    }
  };

  const editSelectedGw2Node = () => {
    if (!selectedGw2Node) return;
    openGw2NodeModal('edit', selectedGw2Node.definition, selectedGw2Node.attrs);
  };

  const editSelectedImage = () => {
    if (!selectedImage) return;
    openImageModal('edit', selectedImage);
  };

  const applySelectedImagePreset = (patch: Partial<GuideImageFormValues>) => {
    if (!editor || !selectedImage) return;
    const nextWidth =
      patch.width !== undefined ? normalizeImageWidth(patch.width) : normalizeImageWidth(selectedImage.width);
    const nextAlign =
      patch.align !== undefined ? normalizeImageAlign(patch.align) || 'center' : normalizeImageAlign(selectedImage.align) || 'center';
    const nextWrap =
      patch.wrap !== undefined ? normalizeImageWrap(patch.wrap) : normalizeImageWrap(selectedImage.wrap);

    editor
      .chain()
      .focus()
      .updateAttributes('image', {
        src: selectedImage.src,
        alt: selectedImage.alt,
        width: nextWidth,
        align: nextAlign,
        wrap: nextWrap,
      })
      .run();
  };

  const removeSelectedImage = () => {
    if (!editor || !selectedImage) return;
    editor.chain().focus().deleteSelection().run();
  };

  const removeSelectedGw2Node = () => {
    if (!editor || !selectedGw2Node) return;
    editor.chain().focus().deleteSelection().run();
  };

  const submitMarkdownImport = () => {
    const raw = String(markdownImport?.value || '');
    if (!raw.trim()) {
      message.error('请先粘贴 Markdown 内容');
      return;
    }

    try {
      const document = importMarkdownToGuideDoc(raw);
      const serialized = serializeDocument(document);
      if (editor) {
        editor.commands.setContent(document, { emitUpdate: false });
      }
      onChange?.(serialized);
      message.success('Markdown 已导入到编辑器');
      closeMarkdownImport();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Markdown 导入失败'));
    }
  };

  const markdownImportButton = (
    <Button size="small" onClick={openMarkdownImport}>
      导入 Markdown
    </Button>
  );

  const markdownImportModal = (
    <Modal
      title="导入 Markdown"
      open={!!markdownImport}
      onCancel={closeMarkdownImport}
      onOk={submitMarkdownImport}
      destroyOnHidden
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          支持基础 Markdown 导入：标题、段落、无序列表、有序列表、引用、代码块、分割线、链接和独立图片。
        </Typography.Text>
        <Typography.Text type="secondary">
          导入后会覆盖当前编辑器内容，并统一转换为现有 `contentJson` 结构。
        </Typography.Text>
        <Input.TextArea
          rows={16}
          value={markdownImport?.value || ''}
          onChange={(event) =>
            setMarkdownImport((current) => ({
              ...(current || {}),
              value: event.target.value,
            }))
          }
          placeholder="# 标题&#10;&#10;正文段落&#10;&#10;- 列表项 A&#10;- 列表项 B"
        />
      </Space>
    </Modal>
  );

  if (parsed.error) {
    return (
      <>
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {markdownImportButton}
          <Alert
            type="error"
            showIcon
            title="当前只能使用原始 JSON 编辑"
            description={`${parsed.error}。请先修复 JSON 内容，再使用可视化编辑器。`}
          />
          {rawJsonEditor}
        </Space>
        {markdownImportModal}
      </>
    );
  }

  if (parsed.unsupported.length > 0) {
    return (
      <>
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {markdownImportButton}
          <Alert
            type="warning"
            showIcon
            title="检测到暂不支持的自定义节点"
            description={`当前文章包含可视化编辑器暂未识别的节点或标记：${parsed.unsupported.join(', ')}。为避免现有内容丢失，页面保留原始 JSON 编辑模式。`}
          />
          {rawJsonEditor}
        </Space>
        {markdownImportModal}
      </>
    );
  }

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <div className="guide-richtext-editor">
        <div className="guide-richtext-toolbar-shell">
        <Space wrap className="guide-richtext-toolbar">
          {markdownImportButton}
          <Tooltip title="正文段落">
            <Button size="small" onClick={() => editor?.chain().focus().setParagraph().run()}>
              P
            </Button>
          </Tooltip>
          <Tooltip title="二级标题">
            <Button size="small" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </Button>
          </Tooltip>
          <Tooltip title="三级标题">
            <Button size="small" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </Button>
          </Tooltip>
          <Tooltip title="加粗">
            <Button size="small" icon={<BoldOutlined />} onClick={() => editor?.chain().focus().toggleBold().run()} />
          </Tooltip>
          <Tooltip title="斜体">
            <Button size="small" icon={<ItalicOutlined />} onClick={() => editor?.chain().focus().toggleItalic().run()} />
          </Tooltip>
          <Tooltip title="下划线">
            <Button size="small" onClick={() => editor?.chain().focus().toggleMark('underline').run()}>
              U
            </Button>
          </Tooltip>
          <Tooltip title="文字颜色">
            <Button size="small" onClick={applyTextColor}>
              色
            </Button>
          </Tooltip>
          <Tooltip title="行内代码">
            <Button size="small" icon={<CodeOutlined />} onClick={() => editor?.chain().focus().toggleCode().run()} />
          </Tooltip>
          <Tooltip title="无序列表">
            <Button
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
          </Tooltip>
          <Tooltip title="任务列表">
            <Button
              size="small"
              onClick={() =>
                editor?.chain().focus().insertContent({
                  type: 'taskList',
                  content: [
                    {
                      type: 'taskItem',
                      attrs: { checked: false },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: '待办事项' }] }],
                    },
                  ],
                }).run()
              }
            >
              任务
            </Button>
          </Tooltip>
          <Tooltip title="引用">
            <Button size="small" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              引用
            </Button>
          </Tooltip>
          <Tooltip title="代码块">
            <Button size="small" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
              代码块
            </Button>
          </Tooltip>
          <Tooltip title="分割线">
            <Button size="small" icon={<InsertRowBelowOutlined />} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
          </Tooltip>
          <Tooltip title="链接">
            <Button size="small" icon={<LinkOutlined />} onClick={toggleLink} />
          </Tooltip>
          <Tooltip title="图片">
            <Button size="small" icon={<PictureOutlined />} onClick={() => openImageModal('create')} />
          </Tooltip>
          <Tooltip title="基础表格">
            <Button size="small" onClick={insertBasicTable}>
              表格
            </Button>
          </Tooltip>
          <Tooltip title="在当前单元格上方插入一行">
            <Button size="small" disabled={!selectedTable || !selectedTable.canInsertRowBefore} onClick={() => insertTableRow('before')}>
              上方行
            </Button>
          </Tooltip>
          <Tooltip title="在当前单元格下方插入一行">
            <Button size="small" disabled={!selectedTable} onClick={() => insertTableRow('after')}>
              下方行
            </Button>
          </Tooltip>
          <Tooltip title="在当前单元格左侧插入一列">
            <Button size="small" disabled={!selectedTable} onClick={() => insertTableColumn('before')}>
              左侧列
            </Button>
          </Tooltip>
          <Tooltip title="在当前单元格右侧插入一列">
            <Button size="small" disabled={!selectedTable} onClick={() => insertTableColumn('after')}>
              右侧列
            </Button>
          </Tooltip>
          <Tooltip title="删除当前单元格所在行">
            <Button
              size="small"
              danger
              disabled={!selectedTable || !selectedTable.canRemoveRow}
              onClick={removeTableRow}
            >
              删除行
            </Button>
          </Tooltip>
          <Tooltip title="删除当前单元格所在列">
            <Button
              size="small"
              danger
              disabled={!selectedTable || selectedTable.colCount <= 1}
              onClick={removeTableColumn}
            >
              删除列
            </Button>
          </Tooltip>
          <Tooltip title="编辑当前选中的图片">
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!selectedImage}
              onClick={editSelectedImage}
            />
          </Tooltip>
          <Tooltip title="图片宽度 50%">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ width: '50%' })}>
              图 50%
            </Button>
          </Tooltip>
          <Tooltip title="图片宽度 75%">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ width: '75%' })}>
              图 75%
            </Button>
          </Tooltip>
          <Tooltip title="图片宽度 100%">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ width: '100%' })}>
              图 100%
            </Button>
          </Tooltip>
          <Tooltip title="图片左对齐">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ align: 'left' })}>
              图左
            </Button>
          </Tooltip>
          <Tooltip title="图片居中">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ align: 'center' })}>
              图中
            </Button>
          </Tooltip>
          <Tooltip title="图片右对齐">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ align: 'right' })}>
              图右
            </Button>
          </Tooltip>
          <Tooltip title="图片不环绕">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ wrap: 'none' })}>
              不环绕
            </Button>
          </Tooltip>
          <Tooltip title="图片左侧文字环绕">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ wrap: 'left' })}>
              左环绕
            </Button>
          </Tooltip>
          <Tooltip title="图片右侧文字环绕">
            <Button size="small" disabled={!selectedImage} onClick={() => applySelectedImagePreset({ wrap: 'right' })}>
              右环绕
            </Button>
          </Tooltip>
          <Tooltip title="删除当前选中的图片">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!selectedImage}
              onClick={removeSelectedImage}
            />
          </Tooltip>
          <Tooltip title="撤销">
            <Button size="small" icon={<UndoOutlined />} onClick={() => editor?.chain().focus().undo().run()} />
          </Tooltip>
          <Tooltip title="重做">
            <Button size="small" icon={<RedoOutlined />} onClick={() => editor?.chain().focus().redo().run()} />
          </Tooltip>
        </Space>

        <Space wrap className="guide-richtext-toolbar guide-richtext-toolbar-secondary">
          <Button size="small" danger disabled={!selectedTable} onClick={removeSelectedTable}>
            删除表格
          </Button>
          {GW2_NODE_DEFINITIONS.map((definition) => (
            <Button key={definition.name} size="small" onClick={() => openGw2NodeModal('create', definition)}>
              {definition.title}
            </Button>
          ))}
          <Tooltip title="编辑当前选中的 GW2 节点">
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!selectedGw2Node}
              onClick={editSelectedGw2Node}
            >
              编辑所选
            </Button>
          </Tooltip>
          <Tooltip title="删除当前选中的 GW2 节点">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!selectedGw2Node}
              onClick={removeSelectedGw2Node}
            >
              删除所选
            </Button>
          </Tooltip>
        </Space>
        </div>

        <div className="guide-richtext-surface">
          <EditorContent editor={editor} />
        </div>
      </div>

      <Collapse
        size="small"
        items={[
          {
            key: 'raw-json',
            label: '原始 JSON',
            children: rawJsonEditor,
          },
        ]}
      />

      <Modal
        title={gw2NodeModal ? `${gw2NodeModal.mode === 'create' ? '插入' : '编辑'} ${gw2NodeModal.definition.title}` : 'GW2 节点'}
        open={!!gw2NodeModal}
        onCancel={closeGw2NodeModal}
        onOk={() => void submitGw2NodeModal()}
        destroyOnHidden
      >
        {gw2NodeModal ? (
          <Form form={gw2NodeForm} layout="vertical">
            {gw2NodeModal.definition.attrs.map((attr) => (
              <Form.Item
                key={attr.name}
                name={attr.name}
                label={attr.label}
                rules={attr.required ? [{ required: true, message: `请填写${attr.label}` }] : undefined}
              >
                {attr.numeric ? <InputNumber style={{ width: '100%' }} precision={0} /> : <Input />}
              </Form.Item>
            ))}
          </Form>
        ) : null}
      </Modal>

      <Modal
        title={imageModal?.mode === 'edit' ? '编辑图片' : '插入图片'}
        open={!!imageModal}
        onCancel={closeImageModal}
        onOk={() => void submitImageModal()}
        destroyOnHidden
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            可将本地图片上传到服务器，或直接粘贴已有图片地址。
          </Typography.Text>

          <Upload
            accept=".jpg,.jpeg,.png,.webp"
            showUploadList={false}
            beforeUpload={beforeImageUpload}
            customRequest={uploadInlineImage}
          >
            <Button icon={imageUploading ? <LoadingOutlined /> : <UploadOutlined />} loading={imageUploading}>
              上传本地图片
            </Button>
          </Upload>

          <Form form={imageForm} layout="vertical">
            <Form.Item
              name="src"
              label="图片地址"
              rules={[{ required: true, message: '请填写图片地址' }]}
            >
              <Input placeholder="https://example.com/image.png 或 /uploads/guides/..." />
            </Form.Item>
            <Form.Item name="alt" label="替代文本">
              <Input placeholder="选填，用于补充图片说明" />
            </Form.Item>
            <Form.Item
              name="width"
              label="宽度"
              rules={[
                {
                  validator: (_, value) => {
                    if (!String(value || '').trim()) return Promise.resolve();
                    return normalizeImageWidth(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error('请输入 480px、50% 或纯数字'));
                  },
                },
              ]}
            >
              <Input placeholder="例如 480px、50%，留空则按原始宽度显示" />
            </Form.Item>
            <Space wrap size={8}>
              <Button size="small" onClick={() => imageForm.setFieldValue('width', '50%')}>50%</Button>
              <Button size="small" onClick={() => imageForm.setFieldValue('width', '75%')}>75%</Button>
              <Button size="small" onClick={() => imageForm.setFieldValue('width', '100%')}>100%</Button>
              <Button size="small" onClick={() => imageForm.setFieldValue('width', '480px')}>480px</Button>
              <Button size="small" onClick={() => imageForm.setFieldValue('width', '720px')}>720px</Button>
            </Space>
            <Form.Item name="align" label="对齐" initialValue="center">
              <Space wrap size={8}>
                <Button size="small" onClick={() => imageForm.setFieldValue('align', 'left')}>左对齐</Button>
                <Button size="small" onClick={() => imageForm.setFieldValue('align', 'center')}>居中</Button>
                <Button size="small" onClick={() => imageForm.setFieldValue('align', 'right')}>右对齐</Button>
              </Space>
            </Form.Item>
            <Form.Item name="wrap" label="文字环绕" initialValue="none">
              <Space wrap size={8}>
                <Button size="small" onClick={() => imageForm.setFieldValue('wrap', 'none')}>不环绕</Button>
                <Button size="small" onClick={() => imageForm.setFieldValue('wrap', 'left')}>左环绕</Button>
                <Button size="small" onClick={() => imageForm.setFieldValue('wrap', 'right')}>右环绕</Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      {markdownImportModal}
    </Space>
  );
}

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
import { Node } from '@tiptap/core';
import { Alert, Button, Collapse, Form, Input, InputNumber, Modal, Space, Tooltip, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useState } from 'react';
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
};

type ImageModalState = {
  mode: 'create' | 'edit';
  initialValues?: GuideImageFormValues;
};

const DEFAULT_DOC: JSONContent = {
  type: 'doc',
  content: [],
};

const GW2_NODE_DEFINITIONS: Gw2NodeDefinition[] = [
  {
    name: 'gw2-item',
    title: 'GW2 Item',
    attrs: [
      { name: 'itemId', label: 'Item ID', numeric: true, required: true },
      { name: 'label', label: 'Label' },
    ],
  },
  {
    name: 'gw2-skill',
    title: 'GW2 Skill',
    attrs: [
      { name: 'skillId', label: 'Skill ID', numeric: true, required: true },
      { name: 'label', label: 'Label' },
    ],
  },
  {
    name: 'gw2-trait',
    title: 'GW2 Trait',
    attrs: [
      { name: 'traitId', label: 'Trait ID', numeric: true, required: true },
      { name: 'specializationId', label: 'Specialization ID', numeric: true },
      { name: 'label', label: 'Label' },
    ],
  },
  {
    name: 'gw2-build',
    title: 'GW2 Build',
    block: true,
    attrs: [
      { name: 'buildCode', label: 'Build Chat Link', required: true },
      { name: 'specializationId', label: 'Specialization ID', numeric: true },
      { name: 'label', label: 'Label' },
    ],
  },
  {
    name: 'gw2-chatcode',
    title: 'GW2 Chatcode',
    block: true,
    attrs: [
      { name: 'value', label: 'Chatcode', required: true },
      { name: 'label', label: 'Label' },
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
  ...GW2_NODE_DEFINITIONS.map((item) => item.name),
]);

const SUPPORTED_MARK_TYPES = new Set(['bold', 'italic', 'code', 'link']);
const MAX_INLINE_IMAGE_SIZE_MB = 5;

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
      return { document: null, error: 'contentJson must be a JSON object', unsupported: [] as string[] };
    }

    const unsupported = new Set<string>();
    collectUnsupportedEntries(parsed, unsupported);

    return {
      document: parsed as JSONContent,
      error: null as string | null,
      unsupported: Array.from(unsupported).sort(),
    };
  } catch {
    return { document: null, error: 'contentJson is not valid JSON', unsupported: [] as string[] };
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
  };
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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Image,
      ...gw2NodeExtensions,
    ],
    content: parsed.document || DEFAULT_DOC,
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
    const nextHref = window.prompt('Link URL', previousHref || 'https://');
    if (nextHref === null) return;
    const normalized = nextHref.trim();
    if (!normalized) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  const submitImageModal = async () => {
    if (!editor) return;

    try {
      const values = await imageForm.validateFields();
      const src = String(values.src || '').trim();
      const alt = String(values.alt || '').trim();
      if (!src) return;
      if (imageModal?.mode === 'edit' && selectedImage) {
        editor.chain().focus().updateAttributes('image', { src, alt }).run();
      } else {
        editor.chain().focus().setImage({ src, alt }).run();
      }
      closeImageModal();
    } catch {
      return;
    }
  };

  const beforeImageUpload: UploadProps['beforeUpload'] = (file) => {
    const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isAllowed) {
      message.error('Only JPG, PNG, and WEBP images are supported');
      return Upload.LIST_IGNORE;
    }

    const isSizeOk = file.size / 1024 / 1024 <= MAX_INLINE_IMAGE_SIZE_MB;
    if (!isSizeOk) {
      message.error('Image must be 5MB or smaller');
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const uploadInlineImage: UploadProps['customRequest'] = async (options) => {
    try {
      setImageUploading(true);
      const uploaded = await uploadGuideCover(options.file as File);
      imageForm.setFieldsValue({ src: uploaded.url });
      message.success('Image uploaded');
      options.onSuccess?.(uploaded);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Image upload failed'));
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

  const removeSelectedImage = () => {
    if (!editor || !selectedImage) return;
    editor.chain().focus().deleteSelection().run();
  };

  const removeSelectedGw2Node = () => {
    if (!editor || !selectedGw2Node) return;
    editor.chain().focus().deleteSelection().run();
  };

  if (parsed.error) {
    return (
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="error"
          showIcon
          title="Raw JSON required"
          description={`${parsed.error}. Fix the JSON first, then the visual editor will become available.`}
        />
        {rawJsonEditor}
      </Space>
    );
  }

  if (parsed.unsupported.length > 0) {
    return (
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          title="Unsupported custom nodes detected"
          description={`This article contains nodes or marks the visual editor does not understand yet: ${parsed.unsupported.join(', ')}. Raw JSON editing stays enabled so existing content is not lost.`}
        />
        {rawJsonEditor}
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <div className="guide-richtext-editor">
        <Space wrap className="guide-richtext-toolbar">
          <Tooltip title="Paragraph">
            <Button size="small" onClick={() => editor?.chain().focus().setParagraph().run()}>
              P
            </Button>
          </Tooltip>
          <Tooltip title="Heading 2">
            <Button size="small" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </Button>
          </Tooltip>
          <Tooltip title="Heading 3">
            <Button size="small" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </Button>
          </Tooltip>
          <Tooltip title="Bold">
            <Button size="small" icon={<BoldOutlined />} onClick={() => editor?.chain().focus().toggleBold().run()} />
          </Tooltip>
          <Tooltip title="Italic">
            <Button size="small" icon={<ItalicOutlined />} onClick={() => editor?.chain().focus().toggleItalic().run()} />
          </Tooltip>
          <Tooltip title="Inline Code">
            <Button size="small" icon={<CodeOutlined />} onClick={() => editor?.chain().focus().toggleCode().run()} />
          </Tooltip>
          <Tooltip title="Bullet List">
            <Button
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
          </Tooltip>
          <Tooltip title="Ordered List">
            <Button
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
          </Tooltip>
          <Tooltip title="Quote">
            <Button size="small" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              Quote
            </Button>
          </Tooltip>
          <Tooltip title="Code Block">
            <Button size="small" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
              Block
            </Button>
          </Tooltip>
          <Tooltip title="Divider">
            <Button size="small" icon={<InsertRowBelowOutlined />} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
          </Tooltip>
          <Tooltip title="Link">
            <Button size="small" icon={<LinkOutlined />} onClick={toggleLink} />
          </Tooltip>
          <Tooltip title="Image">
            <Button size="small" icon={<PictureOutlined />} onClick={() => openImageModal('create')} />
          </Tooltip>
          <Tooltip title="Edit the currently selected image">
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!selectedImage}
              onClick={editSelectedImage}
            />
          </Tooltip>
          <Tooltip title="Remove the currently selected image">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!selectedImage}
              onClick={removeSelectedImage}
            />
          </Tooltip>
          <Tooltip title="Undo">
            <Button size="small" icon={<UndoOutlined />} onClick={() => editor?.chain().focus().undo().run()} />
          </Tooltip>
          <Tooltip title="Redo">
            <Button size="small" icon={<RedoOutlined />} onClick={() => editor?.chain().focus().redo().run()} />
          </Tooltip>
        </Space>

        <Space wrap className="guide-richtext-toolbar guide-richtext-toolbar-secondary">
          {GW2_NODE_DEFINITIONS.map((definition) => (
            <Button key={definition.name} size="small" onClick={() => openGw2NodeModal('create', definition)}>
              {definition.title}
            </Button>
          ))}
          <Tooltip title="Edit the currently selected GW2 node">
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!selectedGw2Node}
              onClick={editSelectedGw2Node}
            >
              Edit Selected
            </Button>
          </Tooltip>
          <Tooltip title="Remove the currently selected GW2 node">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!selectedGw2Node}
              onClick={removeSelectedGw2Node}
            >
              Remove Selected
            </Button>
          </Tooltip>
        </Space>

        <div className="guide-richtext-surface">
          <EditorContent editor={editor} />
        </div>
      </div>

      <Collapse
        size="small"
        items={[
          {
            key: 'raw-json',
            label: 'Raw JSON',
            children: rawJsonEditor,
          },
        ]}
      />

      <Modal
        title={gw2NodeModal ? `${gw2NodeModal.mode === 'create' ? 'Insert' : 'Edit'} ${gw2NodeModal.definition.title}` : 'GW2 Node'}
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
                rules={attr.required ? [{ required: true, message: `${attr.label} is required` }] : undefined}
              >
                {attr.numeric ? <InputNumber style={{ width: '100%' }} precision={0} /> : <Input />}
              </Form.Item>
            ))}
          </Form>
        ) : null}
      </Modal>

      <Modal
        title={imageModal?.mode === 'edit' ? 'Edit Image' : 'Insert Image'}
        open={!!imageModal}
        onCancel={closeImageModal}
        onOk={() => void submitImageModal()}
        destroyOnHidden
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Upload a local image to the server, or paste an existing image URL.
          </Typography.Text>

          <Upload
            accept=".jpg,.jpeg,.png,.webp"
            showUploadList={false}
            beforeUpload={beforeImageUpload}
            customRequest={uploadInlineImage}
          >
            <Button icon={imageUploading ? <LoadingOutlined /> : <UploadOutlined />} loading={imageUploading}>
              Upload Local Image
            </Button>
          </Upload>

          <Form form={imageForm} layout="vertical">
            <Form.Item
              name="src"
              label="Image URL"
              rules={[{ required: true, message: 'Image URL is required' }]}
            >
              <Input placeholder="https://example.com/image.png or /uploads/guides/..." />
            </Form.Item>
            <Form.Item name="alt" label="Alt Text">
              <Input placeholder="Optional image description" />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </Space>
  );
}

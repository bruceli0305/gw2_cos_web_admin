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
  const [markdownImport, setMarkdownImport] = useState<MarkdownImportState | null>(null);

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
      imageForm.setFieldsValue({ src: uploaded.path || uploaded.url });
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
          <Tooltip title="编辑当前选中的图片">
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!selectedImage}
              onClick={editSelectedImage}
            />
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
          </Form>
        </Space>
      </Modal>

      {markdownImportModal}
    </Space>
  );
}

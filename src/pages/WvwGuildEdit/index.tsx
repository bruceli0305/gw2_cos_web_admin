import {
  PageContainer,
  ProCard,
} from '@ant-design/pro-components';
import {
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormSwitch,
  ProFormList,
} from '@ant-design/pro-form';
import { ProForm } from '@ant-design/pro-form/es/layouts/ProForm';
import { Button, Card, Col, Row, Statistic, message, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageNoticeAlert } from '../../components/listPageState';
import { request } from '../../services/request';

type FaqItem = {
  q?: string;
  a?: string;
};

type ScheduleItem = {
  day?: string;
  cet?: string;
  bj?: string;
  note?: string;
};

type JoinStepItem = Record<string, unknown>;

type OperationCard = {
  title?: string;
  bullets?: string[];
};

type OperationCardFormItem = {
  title?: string;
  bulletsText?: unknown;
};

type PageDoc = {
  heroPoem?: string;
  heroIntro?: string;
  sideCardTag?: string;
  sideCardBlurb?: string;
  sideCardMetaVoice?: string;
  sideCardMetaReply?: string;
  introTemplate?: string;
  operationTitle?: string;
  operationDesc?: string;
  operationCards?: OperationCard[];
  provideBullets?: string[];
  needBullets?: string[];
  joinTitle?: string;
  joinDesc?: string;
  joinSteps?: JoinStepItem[];
  footerAbout?: string;
  footerTip?: string;
  footerDisclaimerTitle?: string;
  footerDisclaimer?: string;
};

type Doc = {
  slug?: string;
  name?: string;
  tag?: string;
  region?: string;
  server?: string;
  summary?: string;
  isRecruiting?: boolean;
  playStyle?: string;
  language?: string;
  primeTimeCET?: string;
  primeTimeBJ?: string;
  voicePlatform?: string;
  voiceInvite?: string;
  recruiters?: string[];
  gameIds?: string[];
  tags?: string[];
  regionLabel?: string;
  serverOrAlliance?: string;
  highlights?: string[];
  requirementsMust?: string[];
  requirementsExpect?: string[];
  requirementsNotFit?: string[];
  schedule?: ScheduleItem[];
  faq?: FaqItem[];
  page?: PageDoc;
};

type PageFormValues = {
  heroPoem?: string;
  heroIntro?: string;
  sideCardTag?: string;
  sideCardBlurb?: string;
  sideCardMetaVoice?: string;
  sideCardMetaReply?: string;
  introTemplate?: string;
  operationTitle?: string;
  operationDesc?: string;
  operationCards?: OperationCardFormItem[];
  provideBulletsText?: unknown;
  needBulletsText?: unknown;
  joinTitle?: string;
  joinDesc?: string;
  joinSteps?: JoinStepItem[];
  footerAbout?: string;
  footerTip?: string;
  footerDisclaimerTitle?: string;
  footerDisclaimer?: string;
};

type FormValues = {
  slug?: string;
  name?: string;
  tag?: string;
  region?: string;
  server?: string;
  summary?: string;
  isRecruiting?: boolean;
  playStyle?: string;
  language?: string;
  primeTimeCET?: string;
  primeTimeBJ?: string;
  voicePlatform?: string;
  voiceInvite?: string;
  recruitersText?: unknown;
  gameIdsText?: unknown;
  tags?: string[];
  regionLabel?: string;
  serverOrAlliance?: string;
  highlightsText?: unknown;
  requirementsMustText?: unknown;
  requirementsExpectText?: unknown;
  requirementsNotFitText?: unknown;
  schedule?: ScheduleItem[];
  faq?: FaqItem[];
  page?: PageFormValues;
};

function arrayToLines(v: unknown): string {
  if (!Array.isArray(v)) return '';
  return v
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

function linesToArray(v: unknown): string[] {
  const raw = String(v ?? '');
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateLines(min: number, max: number, label: string) {
  return async (_: unknown, v: unknown) => {
    const arr = linesToArray(v);
    if (arr.length < min) throw new Error(`${label}至少填写 ${min} 项`);
    if (arr.length > max) throw new Error(`${label}最多填写 ${max} 项`);
  };
}

export default function WvwGuildEditPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const isCreate = id === 'new';
  const [loading, setLoading] = useState(!isCreate);
  const [doc, setDoc] = useState<Doc | null>(null);

  useEffect(() => {
    if (isCreate || !id) return;

    let active = true;

    async function loadDoc() {
      try {
        const nextDoc = await request<Doc>(`/admin/v1/wvw-guilds/${id}`);
        if (active) setDoc(nextDoc);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDoc().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id, isCreate]);

  const initialValues = useMemo(() => {
    if (isCreate) {
      return {
        region: 'EU',
        isRecruiting: true,
        playStyle: 'zerg',
        language: 'zh-en',

        voicePlatform: 'discord',
        voiceInvite: '',

        recruitersText: '',
        gameIdsText: '',

        tags: ['休闲', '养老', '氛围友好'],
        regionLabel: '欧服 EU · WvW 战场',
        serverOrAlliance: '',

        highlightsText: '休闲养老：不卷 KPI，稳定跟团\n氛围友好：新人/回坑都能跟\n不强制语音：能听得到即可\n打不过就撤：优先保人，不做无谓硬拼',
        requirementsMustText: '能听语音（Discord/KOOK/黑盒语音，按实际填写）\n跟标记走，不擅自开怪\n不骂人、不引战、不带节奏',
        requirementsExpectText: '能切一套团队向配装（有的话更好）\n愿意学习基本指令（push / pull / regroup）\n偶尔能帮忙拉人/补位',
        requirementsNotFitText: '只想单排冲分、拒绝沟通\n开麦喷人/甩锅/阴阳怪气\n长期 AFK 占位置',
        faq: [
          { q: '需要会玩/有配装吗？', a: '不强制。能听指挥、愿意跟团就行；配装我们会给建议。' },
          { q: '必须开麦吗？', a: '不需要。能听得到即可；想说话当然更好。' },
        ],
        schedule: [
          { day: '周一', cet: '全天', bj: '全天', note: '看心情开团' },
          { day: '周末', cet: '晚间', bj: '凌晨/白天', note: '通常有团（以公告为准）' },
        ],

        page: {
          heroPoem: '黑曜为刃，雾海为甲。\n不求一击封神，只求同路共行。',
          heroIntro: '来试一次团，你就知道这里适不适合你。',
          sideCardTag: '休闲养老',
          sideCardBlurb: '不卷不喷，想打就打，累了就撤。跟着标记走，我们一起把攻城打成战报。',
          sideCardMetaVoice: '能听得到即可',
          sideCardMetaReply: '通常 24 小时内',
          introTemplate:
            '游戏ID：\n招募员：\n常在线时段（CET/北京时间）：\n主玩职业/定位：\n语音：能听 / 可说\n一句话介绍：',
          operationTitle: '今晚行动 · 轻松跟团',
          operationDesc: '不需要你很强，只需要你愿意跟着标记走。',
          operationCards: [
            { title: '集合方式', bulletsText: '进语音听指挥\n跟随标记集合\n准备补给与攻城器械' },
            { title: '战斗节奏', bulletsText: '能打就打，打不过就撤\n先保人再拿点\n不做无谓硬拼' },
            { title: '你只要做到', bulletsText: '跟标记走\n不擅自开怪\n需要时回城补给' },
          ],
          provideBulletsText: '稳定指挥与标记\n攻防节奏清晰\n新人友好、回坑友好\n必要时提供配装建议',
          needBulletsText: '能听语音\n愿意跟团行动\n尊重队友，不引战\n保持基本补给',
          joinTitle: '加入流程（4 步）',
          joinDesc: '上车很简单：跟一次团，你就知道适不适合。',
          joinSteps: [
            { n: '1', title: '加入语音', desc: '通过邀请链接加入语音频道（Discord/KOOK/黑盒语音）。' },
            { n: '2', title: '打个招呼', desc: '发一句“你好/回坑/新人”，我们会告诉你怎么跟团。' },
            { n: '3', title: '跟一次团', desc: '先体验一晚：攻城/守点/拉扯，看看节奏你喜不喜欢。' },
            { n: '4', title: '常驻一起玩', desc: '合适就一起常玩；不合适也没关系，祝你找回快乐。' },
          ],
          footerAbout: '欧服 WvW · 休闲养老 / 氛围友好 · 黑曜石攻城战报单页',
          footerTip: '建议把本页链接直接发给想来试团的朋友。',
          footerDisclaimerTitle: '免责声明',
          footerDisclaimer: '与 ArenaNet 无官方隶属关系。不提供金币/代练等交易服务信息。',
        },
      };
    }

    const page = doc?.page || {};
    return {
      ...doc,

      recruitersText: arrayToLines(doc?.recruiters),
      gameIdsText: arrayToLines(doc?.gameIds),

      highlightsText: arrayToLines(doc?.highlights),
      requirementsMustText: arrayToLines(doc?.requirementsMust),
      requirementsExpectText: arrayToLines(doc?.requirementsExpect),
      requirementsNotFitText: arrayToLines(doc?.requirementsNotFit),
      page: {
        ...page,
        provideBulletsText: arrayToLines(page?.provideBullets),
        needBulletsText: arrayToLines(page?.needBullets),
        operationCards: Array.isArray(page?.operationCards)
          ? page.operationCards.map((card: OperationCard) => ({
              title: card.title,
              bulletsText: arrayToLines(card.bullets),
            }))
          : [],
      },
    };
  }, [doc, isCreate]);

  const pageSummary = useMemo(() => {
    const scheduleCount = Array.isArray(initialValues.schedule) ? initialValues.schedule.length : 0;
    const faqCount = Array.isArray(initialValues.faq) ? initialValues.faq.length : 0;
    const operationCardCount = Array.isArray(initialValues.page?.operationCards) ? initialValues.page.operationCards.length : 0;
    return {
      mode: isCreate ? '新建招募页' : '编辑现有页',
      recruiting: initialValues.isRecruiting ? '招募中' : '暂停招募',
      voicePlatform: String(initialValues.voicePlatform || '-'),
      scheduleCount,
      faqCount,
      operationCardCount,
    };
  }, [initialValues, isCreate]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  return (
    <PageContainer
      title={isCreate ? '新增 WvW 工会' : `编辑：${doc?.name || ''}`}
      extra={[
        <Button key="back" onClick={() => nav('/wvw-guilds')}>
          返回列表
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页同时维护招募数据与落地单页内容"
        description={(
          <div>
            <div>1. “基础信息”决定列表页、招募状态和公会基础展示。</div>
            <div>2. “单页内容”决定对外落地页的首屏、行动卡、加入流程和页脚文案。</div>
            <div>3. “要求 / 团表 / 常见问题”控制加入门槛、时间表与 FAQ，不会自动从基础信息推导。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="编辑模式" value={pageSummary.mode} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前表单是在创建新招募页，还是编辑已有招募页。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="招募状态" value={pageSummary.recruiting} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>对应前台目录上的当前招募展示状态。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="团表 / FAQ" value={`${pageSummary.scheduleCount} / ${pageSummary.faqCount}`} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前文档里已经配置的团表行数与常见问题数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="语音 / 行动卡" value={`${pageSummary.voicePlatform} / ${pageSummary.operationCardCount}`} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>用于快速判断当前落地页的沟通渠道与行动模块数量。</div>
          </Card>
        </Col>
      </Row>

      <ProForm<FormValues>
        initialValues={initialValues}
        submitter={{
          searchConfig: { submitText: '保存' },
          resetButtonProps: false,
        }}
        onFinish={async (values) => {
          const payload = {
            slug: String(values.slug || '').trim(),
            name: String(values.name || '').trim(),
            tag: String(values.tag || '').trim(),
            region: values.region,
            server: String(values.server || '').trim(),
            summary: String(values.summary || '').trim(),
            isRecruiting: Boolean(values.isRecruiting),
            playStyle: values.playStyle,
            language: values.language,
            primeTimeCET: String(values.primeTimeCET || '').trim(),
            primeTimeBJ: String(values.primeTimeBJ || '').trim(),

            voicePlatform: values.voicePlatform,
            voiceInvite: String(values.voiceInvite || '').trim(),

            recruiters: linesToArray(values.recruitersText),
            gameIds: linesToArray(values.gameIdsText),

            tags: Array.isArray(values.tags) ? values.tags : [],
            regionLabel: String(values.regionLabel || '').trim(),
            serverOrAlliance: String(values.serverOrAlliance || '').trim(),
            highlights: linesToArray(values.highlightsText),
            requirementsMust: linesToArray(values.requirementsMustText),
            requirementsExpect: linesToArray(values.requirementsExpectText),
            requirementsNotFit: linesToArray(values.requirementsNotFitText),
            schedule: Array.isArray(values.schedule) ? values.schedule : [],
            faq: Array.isArray(values.faq) ? values.faq : [],
            page: {
              heroPoem: String(values?.page?.heroPoem || '').trim(),
              heroIntro: String(values?.page?.heroIntro || '').trim(),
              sideCardTag: String(values?.page?.sideCardTag || '').trim(),
              sideCardBlurb: String(values?.page?.sideCardBlurb || '').trim(),
              sideCardMetaVoice: String(values?.page?.sideCardMetaVoice || '').trim(),
              sideCardMetaReply: String(values?.page?.sideCardMetaReply || '').trim(),
              introTemplate: String(values?.page?.introTemplate || ''),
              operationTitle: String(values?.page?.operationTitle || '').trim(),
              operationDesc: String(values?.page?.operationDesc || '').trim(),
              operationCards: Array.isArray(values?.page?.operationCards)
                ? values.page.operationCards.map((card: OperationCardFormItem) => ({
                    title: String(card?.title || '').trim(),
                    bullets: linesToArray(card?.bulletsText),
                  }))
                : [],
              provideBullets: linesToArray(values?.page?.provideBulletsText),
              needBullets: linesToArray(values?.page?.needBulletsText),
              joinTitle: String(values?.page?.joinTitle || '').trim(),
              joinDesc: String(values?.page?.joinDesc || '').trim(),
              joinSteps: Array.isArray(values?.page?.joinSteps) ? values.page.joinSteps : [],
              footerAbout: String(values?.page?.footerAbout || '').trim(),
              footerTip: String(values?.page?.footerTip || '').trim(),
              footerDisclaimerTitle: String(values?.page?.footerDisclaimerTitle || '').trim(),
              footerDisclaimer: String(values?.page?.footerDisclaimer || '').trim(),
            },
          };

          if (isCreate) {
            await request('/admin/v1/wvw-guilds', { method: 'POST', body: JSON.stringify(payload) });
            message.success('创建成功');
            nav('/wvw-guilds');
            return true;
          }

          await request(`/admin/v1/wvw-guilds/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
          message.success('保存成功');
          return true;
        }}
      >
        <ProCard
          tabs={{
            type: 'card',
          }}
        >
          <ProCard.TabPane key="base" tab="基础信息">
            <ProFormText name="slug" label="页面标识" rules={[{ required: true }]} tooltip="只能小写字母/数字/短横线" />
            <ProFormText name="name" label="公会名" rules={[{ required: true }]} fieldProps={{ placeholder: '例如：黑曜石攻城战报' }} />
            <ProFormText name="tag" label="公会标签" rules={[{ required: true }]} fieldProps={{ placeholder: '例如：OVO' }} />

            <ProFormSelect
              name="region"
              label="地区"
              rules={[{ required: true }]}
              options={[
                { label: 'EU', value: 'EU' },
                { label: 'NA', value: 'NA' },
              ]}
            />
            <ProFormText name="server" label="服务器/联盟（原始）" rules={[{ required: true }]} fieldProps={{ placeholder: '例如：Piken Square / Alliance X' }} />
            <ProFormSwitch name="isRecruiting" label="是否招募中" />

            <ProFormSelect
              name="playStyle"
              label="玩法"
              rules={[{ required: true }]}
              options={[
                { label: '大团跟车', value: 'zerg' },
                { label: '小队游走', value: 'roam' },
                { label: '混合玩法', value: 'mixed' },
                { label: '教学带练', value: 'training' },
              ]}
            />
            <ProFormSelect
              name="language"
              label="语言"
              rules={[{ required: true }]}
              options={[
                { label: '中文为主', value: 'zh' },
                { label: '中文为主 · 英指令 OK', value: 'zh-en' },
              ]}
            />

            <ProFormText name="primeTimeCET" label="活跃时间（CET/CEST）" rules={[{ required: true }]} fieldProps={{ placeholder: '例如：19:00-23:30 / 全天' }} />
            <ProFormText name="primeTimeBJ" label="活跃时间（北京时间）" rules={[{ required: true }]} fieldProps={{ placeholder: '例如：02:00-06:30 / 全天' }} />

            <ProFormSelect
              name="voicePlatform"
              label="语音平台"
              rules={[{ required: true }]}
              options={[
                { label: 'Discord', value: 'discord' },
                { label: 'KOOK', value: 'kook' },
                { label: '黑盒语音', value: 'heibox' },
              ]}
            />
            <ProFormText
              name="voiceInvite"
              label="语音邀请链接"
              rules={[{ required: true }]}
              fieldProps={{ placeholder: 'Discord Invite / KOOK 邀请 / 黑盒房间链接' }}
            />

            <ProFormTextArea
              name="recruitersText"
              label="招募员（每行一个）"
              fieldProps={{ rows: 3, placeholder: '例如：Miskoto#1234\nAnotherRecruiter#8888' }}
              rules={[{ validator: validateLines(1, 3, '招募员') }]}
            />
            <ProFormTextArea
              name="gameIdsText"
              label="游戏ID（每行一个）"
              fieldProps={{ rows: 3, placeholder: '例如：Miskoto.9568\nAltAccount.1234' }}
              rules={[{ validator: validateLines(1, 3, '游戏ID') }]}
            />

            <ProFormSelect name="tags" label="标签" mode="tags" fieldProps={{ tokenSeparators: [',', '，', ' '] }} />

            <ProFormText
              name="regionLabel"
              label="地区标签（展示）"
              rules={[{ required: true }]}
              fieldProps={{ placeholder: '例如：欧服 EU · WvW 战场' }}
            />
            <ProFormText
              name="serverOrAlliance"
              label="服务器/联盟（展示）"
              rules={[{ required: true }]}
              fieldProps={{ placeholder: '例如：EU：Piken Square / Alliance：Obsidian' }}
            />

            <ProFormTextArea name="summary" label="一句话简介" fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
          </ProCard.TabPane>

          <ProCard.TabPane key="landing" tab="单页内容">
            <ProFormTextArea name="highlightsText" label="亮点（每行一条）" fieldProps={{ rows: 6 }} rules={[{ required: true }]} />

            <ProFormTextArea name={['page', 'heroPoem']} label="首屏短诗" fieldProps={{ rows: 2 }} rules={[{ required: true }]} />
            <ProFormTextArea name={['page', 'heroIntro']} label="首屏介绍句" fieldProps={{ rows: 2 }} rules={[{ required: true }]} />

            <ProFormText name={['page', 'sideCardTag']} label="参战卡标签" rules={[{ required: true }]} />
            <ProFormTextArea name={['page', 'sideCardBlurb']} label="参战卡说明" fieldProps={{ rows: 2 }} rules={[{ required: true }]} />
            <ProFormText name={['page', 'sideCardMetaVoice']} label="参战卡：语音文案" rules={[{ required: true }]} />
            <ProFormText name={['page', 'sideCardMetaReply']} label="参战卡：回复" rules={[{ required: true }]} />

            <ProFormTextArea
              name={['page', 'introTemplate']}
              label="自我介绍模板（原样显示）"
              fieldProps={{ rows: 6 }}
              rules={[{ required: true }]}
            />

            <ProFormText name={['page', 'operationTitle']} label="今晚行动标题" rules={[{ required: true }]} />
            <ProFormText name={['page', 'operationDesc']} label="今晚行动描述" rules={[{ required: true }]} />

            <ProFormList
              name={['page', 'operationCards']}
              label="今晚行动卡片"
              creatorButtonProps={{ creatorButtonText: '新增卡片' }}
              itemRender={({ listDom, action }, { record }) => (
                <ProCard title={record?.title ? `卡片：${record.title}` : '卡片'} extra={action} style={{ marginBlockEnd: 12 }}>
                  {listDom}
                </ProCard>
              )}
            >
              <ProFormText name="title" label="标题" rules={[{ required: true }]} />
              <ProFormTextArea name="bulletsText" label="要点（每行一条）" fieldProps={{ rows: 4 }} rules={[{ required: true }]} />
            </ProFormList>

            <ProFormTextArea name={['page', 'provideBulletsText']} label="我们提供（每行一条）" fieldProps={{ rows: 5 }} rules={[{ required: true }]} />
            <ProFormTextArea name={['page', 'needBulletsText']} label="你需要（每行一条）" fieldProps={{ rows: 5 }} rules={[{ required: true }]} />

            <ProFormText name={['page', 'joinTitle']} label="加入流程标题" rules={[{ required: true }]} />
            <ProFormText name={['page', 'joinDesc']} label="加入流程描述" rules={[{ required: true }]} />

            <ProFormList
              name={['page', 'joinSteps']}
              label="加入流程步骤"
              creatorButtonProps={{ creatorButtonText: '新增步骤' }}
              itemRender={({ listDom, action }, { record }) => (
                <ProCard title={record?.n ? `步骤 ${record.n}` : '步骤'} extra={action} style={{ marginBlockEnd: 12 }}>
                  {listDom}
                </ProCard>
              )}
            >
              <ProFormText name="n" label="序号" rules={[{ required: true }]} />
              <ProFormText name="title" label="标题" rules={[{ required: true }]} />
              <ProFormTextArea name="desc" label="描述" fieldProps={{ rows: 2 }} rules={[{ required: true }]} />
            </ProFormList>

            <ProFormText name={['page', 'footerAbout']} label="页脚简介" rules={[{ required: true }]} />
            <ProFormText name={['page', 'footerTip']} label="页脚提示" rules={[{ required: true }]} />
            <ProFormText name={['page', 'footerDisclaimerTitle']} label="免责声明标题" rules={[{ required: true }]} />
            <ProFormTextArea name={['page', 'footerDisclaimer']} label="免责声明内容" fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
          </ProCard.TabPane>

          <ProCard.TabPane key="req" tab="要求 / 团表 / 常见问题">
            <ProFormTextArea name="requirementsMustText" label="必须（每行一条）" fieldProps={{ rows: 6 }} rules={[{ required: true }]} />
            <ProFormTextArea name="requirementsExpectText" label="期望（每行一条）" fieldProps={{ rows: 6 }} rules={[{ required: true }]} />
            <ProFormTextArea name="requirementsNotFitText" label="不适合（每行一条）" fieldProps={{ rows: 6 }} rules={[{ required: true }]} />

            <ProFormList
              name="schedule"
              label="团表"
              creatorButtonProps={{ creatorButtonText: '新增一行' }}
              itemRender={({ listDom, action }, { record }) => (
                <ProCard title={record?.day ? record.day : '团表行'} extra={action} style={{ marginBlockEnd: 12 }}>
                  {listDom}
                </ProCard>
              )}
            >
              <ProFormText name="day" label="星期" rules={[{ required: true }]} />
              <ProFormText name="cet" label="CET/CEST" rules={[{ required: true }]} />
              <ProFormText name="bj" label="北京时间" rules={[{ required: true }]} />
              <ProFormText name="note" label="备注" rules={[{ required: true }]} />
            </ProFormList>

            <ProFormList
              name="faq"
              label="常见问题"
              creatorButtonProps={{ creatorButtonText: '新增问答' }}
              itemRender={({ listDom, action }, { record }) => (
                <ProCard title={record?.q ? record.q : '问题'} extra={action} style={{ marginBlockEnd: 12 }}>
                  {listDom}
                </ProCard>
              )}
            >
              <ProFormText name="q" label="问题" rules={[{ required: true }]} />
              <ProFormTextArea name="a" label="回答" fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
            </ProFormList>
          </ProCard.TabPane>
        </ProCard>
      </ProForm>
    </PageContainer>
  );
}

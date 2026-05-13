import type { Gw2ApiTypeGroup, Gw2ApiTypeMeta, Language } from './types';

export const LANGUAGE_OPTIONS: Array<{ label: string; value: Language }> = [
  { label: '中文 (zh)', value: 'zh' },
  { label: '英文 (en)', value: 'en' },
];

export const GW2_API_TYPE_META: Record<string, Gw2ApiTypeMeta> = {
  professions: {
    type: 'professions',
    title: '职业',
    endpoint: '/v2/professions',
    description: '职业基础定义，数量少，适合和专精、技能、特性一起查看。',
  },
  specializations: {
    type: 'specializations',
    title: '专精',
    endpoint: '/v2/specializations',
    description: '专精定义，和职业、特性强相关。',
  },
  traits: {
    type: 'traits',
    title: '特性',
    endpoint: '/v2/traits',
    description: '特性定义，管理员需要按 ID、名称、职业关系检索。',
  },
  skills: {
    type: 'skills',
    title: '技能',
    endpoint: '/v2/skills',
    description: '技能定义，数量较大，需要重点查看名称、本地化和原始 payload。',
  },
  pets: {
    type: 'pets',
    title: '宠物',
    endpoint: '/v2/pets',
    description: 'Ranger 宠物定义，属于角色战斗规则补充。',
  },
  legends: {
    type: 'legends',
    title: '传奇姿态',
    endpoint: '/v2/legends',
    description: 'Revenant 传奇姿态定义，属于角色战斗规则补充。',
  },
  items: {
    type: 'items',
    title: '物品',
    endpoint: '/v2/items',
    description: '全量物品库，体量最大，应独立管理。',
  },
  itemstats: {
    type: 'itemstats',
    title: '装备属性',
    endpoint: '/v2/itemstats',
    description: '装备属性组合，数量小，和物品装备数据属于同一查看域。',
  },
  'pvp-amulets': {
    type: 'pvp-amulets',
    title: 'PvP 护符',
    endpoint: '/v2/pvp/amulets',
    description: 'PvP 护符配置，官方端点稳定可用。',
  },
  'pvp-heroes': {
    type: 'pvp-heroes',
    title: 'PvP 英雄',
    endpoint: '/v2/pvp/heroes',
    description: 'PvP 英雄与皮肤配置，官方端点稳定可用。',
  },
  'pvp-ranks': {
    type: 'pvp-ranks',
    title: 'PvP 等级',
    endpoint: '/v2/pvp/ranks',
    description: 'PvP 等级和终结技配置，官方端点稳定可用。',
  },
  'pvp-seasons': {
    type: 'pvp-seasons',
    title: 'PvP 赛季',
    endpoint: '/v2/pvp/seasons',
    description: 'PvP 赛季、分段和排行榜配置，官方端点稳定可用。',
  },
  'pvp-runes': {
    type: 'pvp-runes',
    title: 'PvP 符文',
    endpoint: '/v2/pvp/runes',
    description: '官方暴露但当前实测返回 503，不纳入稳定一键同步。',
    stable: false,
  },
  'pvp-sigils': {
    type: 'pvp-sigils',
    title: 'PvP 法印',
    endpoint: '/v2/pvp/sigils',
    description: '官方暴露但当前实测返回 503，不纳入稳定一键同步。',
    stable: false,
  },
  'pvp-rewardtracks': {
    type: 'pvp-rewardtracks',
    title: 'PvP 奖励分支',
    endpoint: '/v2/pvp/rewardtracks',
    description: '官方暴露但当前实测返回 503，不纳入稳定一键同步。',
    stable: false,
  },
};

export const GW2_API_TYPE_GROUPS: Gw2ApiTypeGroup[] = [
  {
    key: 'characters-combat',
    title: '角色与战斗规则',
    description: '职业、专精、特性、技能，以及 Ranger 宠物和 Revenant 传奇姿态。',
    types: ['professions', 'specializations', 'traits', 'skills', 'pets', 'legends'],
  },
  {
    key: 'items-equipment',
    title: '物品与装备属性',
    description: '全量物品库和装备属性组合。items 体量最大，应作为独立数据域重点管理。',
    types: ['items', 'itemstats'],
  },
  {
    key: 'pvp-config',
    title: 'PvP 基础配置',
    description: '官方当前稳定可获取的 PvP 公共配置。',
    types: ['pvp-amulets', 'pvp-heroes', 'pvp-ranks', 'pvp-seasons'],
  },
  {
    key: 'pvp-unavailable',
    title: 'PvP 官方不可用端点',
    description: '官方目录暴露但当前返回 503，仅用于查看和诊断，不参与一键同步。',
    types: ['pvp-runes', 'pvp-sigils', 'pvp-rewardtracks'],
    syncable: false,
  },
];

export function getTypeMeta(type: string): Gw2ApiTypeMeta {
  return GW2_API_TYPE_META[type] || {
    type,
    title: type,
    endpoint: `/v2/${type}`,
    description: '当前类型尚未配置中文说明。',
  };
}

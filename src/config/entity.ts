/**
 * 单景点 SEO 实体绑定配置变量表
 * ------------------------------------------------------------------
 * 本文件是全站唯一的地理实体数据源（Single Source of Truth）。
 * 所有结构化数据、TDK、正文语义绑定、地图嵌入与外链均从这里的
 * "变量占位符" 读取，替换景点时只需修改本文件。
 *
 * 变量占位符对照表
 * | 变量占位符                 | 说明与当前取值                                        |
 * | -------------------------- | ----------------------------------------------------- |
 * | {{DOMAIN_NAME}}            | odaibastatueofliberty.com                             |
 * | {{ATTRACTION_FULL_NAME}}   | "Statue of Liberty Odaiba"（官方全称，见 siteUrl）    |
 * | {{ATTRACTION_SHORT_NAME}}  | "Statue of Liberty"（域名对应含义 / 常用俗称）        |
 * | {{CITY_NAME}}              | Minato City                                           |
 * | {{STATE_PROVINCE}}         | Tokyo                                                 |
 * | {{COUNTRY_NAME}}           | Japan                                                 |
 * | {{COUNTRY_CODE_2LETTER}}   | JP                                                    |
 * | {{POSTAL_CODE}}            | 135-0091                                              |
 * | {{LATITUDE}}               | 35.6279                                               |
 * | {{LONGITUDE}}              | 139.7719                                              |
 * | {{MAPS_SHARE_URL}}         | https://maps.app.goo.gl/XypCJLEZwme5RSjc8             |
 * | {{MAPS_EMBED_SRC}}         | 见下方 mapsEmbedUrl()                                  |
 * | {{NEARBY_LANDMARK_1}}      | Rainbow Bridge                                        |
 * | {{NEARBY_LANDMARK_2}}      | Fuji Television Headquarters                          |
 * | {{GOVT_TOURISM_URL}}       | https://www.gotokyo.org/spot/363/                     |
 */

export const entity = {
  /* ── {{DOMAIN_NAME}} ─────────────────────────────────────────── */
  domain: 'odaibastatueofliberty.com',
  siteUrl: 'https://odaibastatueofliberty.com',

  /* ── 实体名称 ────────────────────────────────────────────────── */
  /** {{ATTRACTION_FULL_NAME}} 官方全称（英文） */
  fullName: 'Statue of Liberty Odaiba',
  /** {{ATTRACTION_SHORT_NAME}} 域名对应含义 / 常用俗称 */
  shortName: 'Statue of Liberty',

  /* ── {{CITY_NAME}} / {{STATE_PROVINCE}} / {{COUNTRY_NAME}} ──── */
  city: 'Minato City',
  stateProvince: 'Tokyo',
  country: 'Japan',
  countryCode: 'JP',
  postalCode: '135-0091',
  streetAddress: '1 Chome-4-2 Daiba',
  /** 便于展示的完整地址行（英文，NAP 一致性用） */
  addressLine: '1 Chome-4-2 Daiba, Minato City, Tokyo 135-0091, Japan',
  /** 联系电话：公共开放景点无独立电话，保持与地图资料一致（不列出电话即一致） */
  telephone: null as string | null,

  /* ── {{LATITUDE}} / {{LONGITUDE}} ───────────────────────────── */
  /**
   * 雕像本体坐标（WGS84）。
   * 取值来源：Google Maps Plus Code「JQHC+4P」解码（35.62775, 139.77175）
   * 与 OpenStreetMap way 1360709259（35.6278603, 139.7718513）互相印证。
   * 注意：不要使用地图嵌入 URL 里的地图中心点，那是镜头中心而非雕像坐标。
   */
  latitude: 35.6279,
  longitude: 139.7719,

  /* ── 地图与权威外链 ─────────────────────────────────────────── */
  /** {{MAPS_SHARE_URL}} Google Maps 分享短链接 */
  mapsShareUrl: 'https://maps.app.goo.gl/XypCJLEZwme5RSjc8',
  /** {{GOVT_TOURISM_URL}} 当地政府 / 官方旅游局链接（.org 权威站） */
  govtTourismUrl: 'https://www.gotokyo.org/spot/363/',
  /** 官方公园管理方（海上公園なび，东京都港湾局体系） */
  officialParkUrl: 'https://www.tptc.co.jp/park/01_02',
  /** 港区役所（.jp 政府站） */
  cityGovUrl: 'https://www.city.minato.tokyo.jp/',
  /** 临海副都心官方街区站 */
  odaibaOfficialUrl: 'https://www.tokyo-odaiba.net/',
  /** ゆりかもめ（铁道运营方，官方交通信息） */
  railOperatorUrl: 'https://www.yurikamome.co.jp/sightseeing/facility/000650.html',
  /** 日本政府观光局 */
  jntoUrl: 'https://www.japan.travel/',

  /* ── {{NEARBY_LANDMARK_1}} / {{NEARBY_LANDMARK_2}} ─────────── */
  /** {{NEARBY_LANDMARK_1}} */
  nearbyLandmark1: 'Rainbow Bridge',
  /** {{NEARBY_LANDMARK_2}} */
  nearbyLandmark2: 'Fuji Television Headquarters',

  /* ── 视觉资产（结构化数据 image / og:image / Hero alt） ─────── */
  /**
   * 图片命名规范：{{SLUG}}-{{序号}}.jpg
   * 每张图同时输出两个尺寸：原图（最长边 1600px）与 -800 缩略图（最长边 800px），
   * 由 scripts 一次性压缩生成，配合 srcset 做响应式加载。
   */
  imageSlug: 'odaiba-statue-of-liberty',
  heroImagePath: '/gallery/odaiba-statue-of-liberty-1.jpg',
  /** schema.org image 数组（必须是绝对 URL） */
  imagePaths: [
    '/gallery/odaiba-statue-of-liberty-1.jpg',
    '/gallery/odaiba-statue-of-liberty-2.jpg',
    '/gallery/odaiba-statue-of-liberty-3.jpg',
    '/gallery/odaiba-statue-of-liberty-9.jpg',
  ],

  /* ── 结构化数据补充字段 ─────────────────────────────────────── */
  openingHoursOpens: '00:00',
  openingHoursCloses: '23:59',
  ratingValue: '4.5',
  reviewCount: '5236',
  touristTypes: [
    'Families',
    'Photographers',
    'Couples',
    'Anime & pop-culture fans',
    'First-time visitors to Japan',
  ],
} as const;

/** 将站内路径转换为可被搜索引擎抓取的绝对 URL */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${entity.siteUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * {{MAPS_EMBED_SRC}} Google Maps 嵌入链接。
 * 沿用官方 pb 参数格式，但做两处修正：
 *   1. 地图中心落在雕像本体坐标上（原值为镜头中心，偏离约 2.9 公里）；
 *   2. 界面语言跟随页面语言，避免所有语种都显示中文地图。
 */
export function mapsEmbedUrl(lang: string): string {
  const hl = lang === 'zh' ? 'zh-CN' : lang;
  const pb = [
    '!1m14!1m8!1m3!1d6482.0',
    `!2d${entity.longitude}`,
    `!3d${entity.latitude}`,
    '!3m2!1i1024!2i768!4f13.1',
    '!3m3!1m2!1s0x60188be32451f7a7%3A0xbc7e67300e8691a3!2z6Ieq55Sx5aWz56We5YOP',
    `!5e0!3m2!1s${hl}!2sjp!4v1789097982999!5m2!1s${hl}!2sjp`,
  ].join('');
  return `https://www.google.com/maps/embed?pb=${pb}`;
}

/**
 * 生成规范的图库图片路径。
 * galleryImage(1)      -> /gallery/odaiba-statue-of-liberty-1.jpg
 * galleryImage(1, 800) -> /gallery/odaiba-statue-of-liberty-1-800.jpg
 */
export function galleryImage(index: number, width?: 800): string {
  const suffix = width ? `-${width}` : '';
  return `/gallery/${entity.imageSlug}-${index}${suffix}.jpg`;
}

/** 图库总张数（public/gallery 中的实际图片数量） */
export const galleryCount = 20;

export default entity;

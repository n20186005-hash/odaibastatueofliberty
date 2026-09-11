export const siteConfig = {
  name: 'Statue of Liberty Odaiba',
  baseUrl: 'https://odaibastatueofliberty.com',
  locales: ['zh', 'en', 'ja', 'ko', 'de', 'nl', 'it'] as const,
};

export const ogLocale: Record<string, string> = {
  zh: 'zh_CN',
  en: 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  de: 'de_DE',
  nl: 'nl_NL',
  it: 'it_IT',
};

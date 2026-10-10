'use strict';

// 覆盖主题语言包中的个别文案，避免直接修改主题子模块
const OVERRIDES = {
  'zh-CN': {
    'title.archive': '文章仓库',
  },
};

hexo.extend.filter.register('before_generate', () => {
  const { i18n } = hexo.theme;
  for (const [lang, data] of Object.entries(OVERRIDES)) {
    // set() 会整体替换该语言的数据，所以需要与已有文案合并
    i18n.set(lang, { ...(i18n.data[lang] || {}), ...data });
  }
});

'use strict';

// 覆盖主题语言包中的个别文案，避免直接修改主题子模块
const OVERRIDES = {
  'zh-CN': {
    'title.archive': '作品',
    'title.post': '作品',
    'title.tagcloud': '标签',
    'title.categories_list': '分类',
    'title.collection': '合集',
    'list_page_count_message.collections': '当前共有 %d 个合集 (゜-゜)つロ 干杯~',
    'post_meta.collection_in': '合集',
    'post_meta.section': '板块',
  },
};

hexo.extend.filter.register('before_generate', () => {
  const { i18n } = hexo.theme;
  for (const [lang, data] of Object.entries(OVERRIDES)) {
    // set() 会整体替换该语言的数据，所以需要与已有文案合并
    i18n.set(lang, { ...(i18n.data[lang] || {}), ...data });
  }
});

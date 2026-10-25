'use strict';

const { escapeHTML } = require('hexo-util');

// 板块 = source/_posts/ 下的一级子目录，名称与颜色在 _config.yml 的 sections 中配置
const getSections = () =>
  (hexo.config.sections || []).map((s) => ({ name: String(s.name), color: s.color || '#888888' }));

const sectionOf = (post) => {
  const parts = String(post.source || '').split('/');
  const name = parts[0] === '_posts' && parts.length > 2 ? parts[1] : '';
  return getSections().find((s) => s.name === name) || null;
};

const cssString = (v) => String(v).replace(/["\\]/g, '\\$&');

hexo.extend.helper.register('get_sections', getSections);
hexo.extend.helper.register('post_section', sectionOf);

hexo.extend.helper.register('section_name', (post) => {
  const s = sectionOf(post);
  return s ? s.name : '';
});

hexo.extend.helper.register('section_badge', (post) => {
  const s = sectionOf(post);
  return s ? `<span class="sec-badge" style="--sec:${escapeHTML(s.color)}">${escapeHTML(s.name)}</span>` : '';
});

// 多选筛选条：纯 CSS 实现（未勾选任何板块 = 显示全部；“全部”按钮重置表单），可随 PJAX 一起替换
hexo.extend.helper.register('section_filter', () => {
  const sections = getSections();
  if (!sections.length) return '';

  const rules = [
    '#main:has(.sec-filter :checked) [data-section=""] { display: none; }',
    '#main:has(.sec-filter :checked) .arch-year { display: none; }',
  ];
  sections.forEach((s, i) => {
    const name = cssString(s.name);
    rules.push(
      `#main:has(.sec-filter :checked):not(:has(.sec-filter input[data-i="${i}"]:checked)) [data-section="${name}"] { display: none; }`,
      `#main:has(.sec-filter input[data-i="${i}"]:checked) .arch-year[data-secs~="${name}"] { display: block; }`,
    );
  });

  const chips = sections
    .map(
      (s, i) =>
        `<label class="sec-chip" style="--sec:${escapeHTML(s.color)}"><input type="checkbox" data-i="${i}" value="${escapeHTML(s.name)}"><span>${escapeHTML(s.name)}</span></label>`,
    )
    .join('');

  return `<style>${rules.join('\n')}</style>
<form class="sec-filter" onsubmit="return false" aria-label="板块筛选">
  <button type="reset" class="sec-chip sec-all">全部</button>${chips}
</form>`;
});

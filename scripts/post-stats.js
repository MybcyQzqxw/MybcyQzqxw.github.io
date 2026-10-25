'use strict';

const { escapeHTML } = require('hexo-util');

// 统计页：服务端只负责输出文章数据与页面骨架，图表在浏览器端按所选板块实时绘制（见 source/js/stats.js）
hexo.extend.generator.register('post-stats', function (locals) {
  const root = this.config.root || '/';
  const sections = hexo.extend.helper.get('get_sections')();
  const sectionOf = hexo.extend.helper.get('post_section');

  const posts = locals.posts
    .filter((p) => p.title && !p.link)
    .sort('date', 1)
    .toArray();

  const tagPaths = {};
  const counts = sections.map(() => 0);
  const items = posts.map((p) => {
    const section = sectionOf(p);
    const s = section ? sections.findIndex((x) => x.name === section.name) : -1;
    if (s >= 0) counts[s] += 1;
    const tags = p.tags.toArray().map((t) => {
      tagPaths[t.name] = t.path;
      return t.name;
    });
    return { d: p.date.format('YYYY-MM-DD'), s, t: p.title, g: tags };
  });

  const json = JSON.stringify({ root, sections, posts: items, tags: tagPaths }).replace(/</g, '\\u003c');

  const chips = sections
    .map(
      (s, i) =>
        `<label class="sec-chip" style="--sec:${escapeHTML(s.color)}"><input type="checkbox" data-i="${i}" value="${escapeHTML(s.name)}"><span>${escapeHTML(s.name)}</span><span class="sec-count">${counts[i]}</span></label>`,
    )
    .join('');

  const content = `
<div class="kr-stats" id="kr-stats">
  <div class="st-lead">文章发布频率一览（可多选板块，不选即为全部）</div>
  <form class="sec-filter st-filter" onsubmit="return false" aria-label="板块筛选">
    <button type="reset" class="sec-chip sec-all">全部</button>${chips}
  </form>
  <div class="st-summary" id="st-summary"></div>
  <section class="st-section" id="st-heat"></section>
  <section class="st-section" id="st-bars"></section>
  <section class="st-section" id="st-line"></section>
  <section class="st-section" id="st-tags"></section>
  <noscript><div class="st-empty">统计图表需要启用 JavaScript。</div></noscript>
  <script type="application/json" id="kr-stats-data">${json}</script>
  <script src="${root}js/stats.js"></script>
</div>`;

  const lastDate = posts.length ? posts[posts.length - 1].date : null;

  return {
    path: 'stats/index.html',
    layout: ['page'],
    data: {
      title: '统计',
      type: 'stats',
      content,
      updated: lastDate || new Date(),
      comments: false,
      show_copyright: false,
      donate: false,
      share: false,
    },
  };
});

'use strict';

const fs = require('fs');
const path = require('path');

// 合集 = source/_collections/ 下的配置文件（.yml）+ 文章 front-matter 中的 collections 字段。
// 只有在 _collections 里有配置文件的合集才会生效，文章里引用了未配置的合集会被忽略。
//
// 配置文件示例（文件名建议与合集名称相同）：
//   name: 线性系统理论
//   description: 简介
//   cover: /assets/collections/线性系统理论.jpg   # 可选；不写则从下面的默认封面库中随机取一张
let configs = [];

// 默认封面库：配置文件没有 cover 时使用。每组是一对渐变色（起点、终点），图案统一；
// 想增加新的颜色，往这里加一行即可，封面图会在生成站点时自动输出到 /images/collection-covers/
const COVER_PALETTES = {
  red: ['#c8372d', '#5e1a1a'],
  pink: ['#d6598f', '#6b2748'],
  amber: ['#e6b84f', '#7a4a2a'],
  orange: ['#d98a4e', '#6b3a27'],
  green: ['#5aa469', '#1f4a33'],
  teal: ['#3fa7a3', '#174a55'],
  blue: ['#4f86d6', '#1f3a6b'],
  violet: ['#8a62d1', '#3d2670'],
};

const coverSvg = ([from, to]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2">
    <circle cx="640" cy="120" r="150"/>
    <circle cx="640" cy="120" r="100"/>
    <circle cx="640" cy="120" r="50"/>
    <path d="M0 360 C150 300 250 420 400 360 S650 300 800 360"/>
    <path d="M0 400 C150 340 250 460 400 400 S650 340 800 400"/>
  </g>
</svg>
`;

const coverUrl = (id) => `/images/collection-covers/${id}.svg`;

// 洗牌袋：库里的颜色都用过一轮后才会重复，避免相邻合集撞色；每次生成站点重新随机
let bag = [];
const drawDefaultCover = () => {
  if (!bag.length) {
    bag = Object.keys(COVER_PALETTES);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return coverUrl(bag.pop());
};

const normalize = (value) => {
  const list = Array.isArray(value) ? value.flat(Infinity) : value == null ? [] : [value];
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
};

const collectionPath = (name) => `collections/${name.replace(/[《》]/g, '').replace(/[\\/]/g, '-')}/`;

const loadConfigs = () => {
  const dir = path.join(hexo.source_dir, '_collections');
  configs = [];
  bag = [];
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir).sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
    if (!/\.ya?ml$/i.test(file)) continue;
    let data;
    try {
      data = hexo.render.renderSync({ text: fs.readFileSync(path.join(dir, file), 'utf8'), engine: 'yaml' });
    } catch (err) {
      hexo.log.warn(`合集配置 ${file} 解析失败：${err.message}`);
      continue;
    }
    const name = String((data && data.name) || path.basename(file, path.extname(file))).trim();
    if (!name) continue;
    if (configs.some((c) => c.name === name)) {
      hexo.log.warn(`合集 "${name}" 存在重复的配置文件（${file}），已忽略`);
      continue;
    }
    configs.push({
      name,
      description: data && data.description ? String(data.description).trim() : '',
      cover: data && data.cover ? String(data.cover).trim() : drawDefaultCover(),
      path: collectionPath(name),
    });
  }
};

const configOf = (name) => configs.find((c) => c.name === name);
const postCollectionNames = (post) => normalize(post.collections).filter((name) => configOf(name));

const collect = (posts) =>
  configs.map((config) => ({
    ...config,
    posts: posts
      .filter((post) => post.title && !post.link && postCollectionNames(post).includes(config.name))
      .sort((a, b) => b.date - a.date),
  }));

hexo.extend.filter.register('before_generate', loadConfigs);

hexo.extend.generator.register('collection-covers', () =>
  Object.entries(COVER_PALETTES).map(([id, palette]) => ({
    path: coverUrl(id).replace(/^\//, ''),
    data: coverSvg(palette),
  })),
);

hexo.extend.helper.register('post_collections', (post) => postCollectionNames(post).map(configOf));

hexo.extend.helper.register('get_collections', function () {
  return collect(this.site.posts.toArray());
});

hexo.extend.generator.register('collections', (locals) => {
  const posts = locals.posts.toArray();
  for (const post of posts) {
    for (const name of normalize(post.collections)) {
      if (!configOf(name)) {
        hexo.log.warn(`文章 "${post.title}" 引用了未配置的合集 "${name}"，请在 source/_collections/ 中新建对应的配置文件`);
      }
    }
  }

  const result = [
    {
      path: 'collections/',
      layout: ['_pages/collections'],
      data: { title_i18n: 'title.collection' },
    },
  ];
  for (const c of collect(posts)) {
    result.push({
      path: c.path,
      layout: ['collection', 'index'],
      data: {
        title: `合集: ${c.name}`,
        collection: c.name,
        collection_info: { name: c.name, description: c.description, cover: c.cover, count: c.posts.length },
        posts: locals.posts
          .filter((post) => post.title && !post.link && postCollectionNames(post).includes(c.name))
          .sort('date', -1),
      },
    });
  }
  return result;
});

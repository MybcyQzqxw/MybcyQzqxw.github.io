'use strict';

const fs = require('fs');
const path = require('path');

// 合集 = source/_collections/ 下的配置文件（.yml）+ 文章 front-matter 中的 collections 字段。
// 只有在 _collections 里有配置文件的合集才会生效，文章里引用了未配置的合集会被忽略。
//
// 配置文件示例（文件名建议与合集名称相同）：
//   name: 线性系统理论
//   description: 简介
//   cover: /assets/collections/线性系统理论.svg
let configs = [];

const normalize = (value) => {
  const list = Array.isArray(value) ? value.flat(Infinity) : value == null ? [] : [value];
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
};

const collectionPath = (name) => `collections/${name.replace(/[\\/]/g, '-')}/`;

const loadConfigs = () => {
  const dir = path.join(hexo.source_dir, '_collections');
  configs = [];
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
      cover: data && data.cover ? String(data.cover).trim() : '',
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

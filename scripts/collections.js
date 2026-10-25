'use strict';

// 合集：由文章 front-matter 中的 collections 字段决定（字符串或列表，一篇文章可同时属于多个合集，也可不属于任何合集）
const normalize = (value) => {
  const list = Array.isArray(value) ? value.flat(Infinity) : value == null ? [] : [value];
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
};

const collectionPath = (name) => `collections/${name.replace(/[\\/]/g, '-')}/`;

const collect = (posts) => {
  const map = new Map();
  for (const post of posts) {
    if (!post.title || post.link) continue;
    for (const name of normalize(post.collections)) {
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(post);
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      path: collectionPath(name),
      posts: list.sort((a, b) => b.date - a.date),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
};

hexo.extend.helper.register('post_collections', (post) =>
  normalize(post.collections).map((name) => ({ name, path: collectionPath(name) })),
);

hexo.extend.helper.register('get_collections', function () {
  return collect(this.site.posts.toArray());
});

hexo.extend.generator.register('collections', (locals) => {
  const list = collect(locals.posts.toArray());
  const result = [
    {
      path: 'collections/',
      layout: ['_pages/collections'],
      data: { title_i18n: 'title.collection' },
    },
  ];
  for (const c of list) {
    result.push({
      path: c.path,
      layout: ['collection', 'index'],
      data: {
        title: `合集: ${c.name}`,
        collection: c.name,
        posts: locals.posts.filter((post) => post.title && !post.link && normalize(post.collections).includes(c.name)).sort('date', -1),
      },
    });
  }
  return result;
});

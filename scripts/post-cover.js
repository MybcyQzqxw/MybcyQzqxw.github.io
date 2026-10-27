'use strict';

const fs = require('fs');
const path = require('path');

// 文章封面：
//   1. front-matter 的 cover 写文件名（如 cover.png），图片放在 source/assets/posts/<板块>/<文章名>/ 下，与文章内的插图同目录；
//      也可以写以 / 开头的站内绝对路径，或 http(s):// 开头的外链；cover 留空或 false 表示不显示封面。
//   2. 未指定 cover 时，从主题配置 posts.default_covers 中随机取一张（每次生成站点时重新随机）。
const EXTERNAL = /^(#|\/\/|http(s)?:)/;
const warned = new Set();

// 文章 source 形如 _posts/学习/机器人动力学.md → 资源目录 assets/posts/学习/机器人动力学
const assetDirOf = (post) => {
  const source = String(post.source || '').replace(/\\/g, '/');
  return source.replace(/^_posts\//, '').replace(/\.[^./]+$/, '');
};

const defaultCovers = () => {
  const posts = (hexo.theme.config && hexo.theme.config.posts) || {};
  const list = Array.isArray(posts.default_covers) ? posts.default_covers : [];
  const covers = list.map(String).filter(Boolean);
  return covers.length ? covers : [posts.default_cover].filter(Boolean);
};

// 稳定模式用于 og:image 等需要结果可复现的场合
const hashPick = (post, covers) => {
  const key = String(post.source || post.path || '');
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return covers[hash % covers.length];
};

// 随机取图时用“洗牌袋”：五张都用过一轮后才会重复，避免相邻文章撞图；
// 同一次生成中，同一篇文章在各个页面（首页、合集、标签页……）里使用同一张
let bag = [];
const assigned = new Map();
hexo.extend.filter.register('before_generate', () => {
  bag = [];
  assigned.clear();
});

const drawFromBag = (covers) => {
  if (!bag.length) {
    bag = covers.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
};

const pickDefault = (post, stable) => {
  const covers = defaultCovers();
  if (!covers.length) return '';
  if (stable) return hashPick(post, covers);
  const key = String(post.source || post.path || '');
  if (!assigned.has(key)) assigned.set(key, drawFromBag(covers));
  return assigned.get(key);
};

hexo.extend.helper.register('post_cover', function (post, options = {}) {
  const cover = post.cover;

  // 显式留空 / false：不显示封面
  if (cover === null || cover === false || cover === '') return '';

  if (cover !== undefined) {
    const value = String(cover).trim();
    if (EXTERNAL.test(value) || value.startsWith('/')) return this.url_for(value);

    const relative = `/assets/posts/${assetDirOf(post)}/${value}`;
    const file = path.join(hexo.source_dir, relative);
    if (fs.existsSync(file)) return this.url_for(relative);
    if (!warned.has(post.source)) {
      warned.add(post.source);
      hexo.log.warn(`Cover image not found for "${post.source}": ${relative}`);
    }
  }

  const fallback = pickDefault(post, options.stable);
  return fallback ? this.url_for(fallback) : '';
});

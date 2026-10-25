'use strict';

// <poem> 标签：在 Markdown 里按“一行一句、空行分段”书写诗词，构建时转换为居中排版，无需手写 <br>
//
//   <poem>
//   光阴七载忽如梦，
//   风雨半程难了情。
//
//   且拾书囊辞旧阁，
//   再携长剑踏歌行。
//   </poem>
const POEM_RE = /<poem>([\s\S]*?)<\/poem>/g;
const MORE_RE = /<!--\s*more\s*-->/i;

const renderPoem = (body) => {
  const stanzas = body
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n[ \t]*\n/)
    .map((stanza) =>
      stanza
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('<br>'),
    )
    .filter(Boolean);
  // 输出中不能出现空行，否则 Markdown 会提前结束 HTML 块
  return `\n\n<div class="poem">${stanzas.map((s) => `<p>${s}</p>`).join('')}</div>\n\n`;
};

hexo.extend.filter.register('before_post_render', (data) => {
  if (typeof data.content !== 'string') return data;

  data.content = data.content.replace(POEM_RE, (_, body) => renderPoem(body));

  // 开启了 center_intro 的板块（见 _config.yml 的 sections）：引子，即 <!-- more --> 之前的内容居中显示
  const section = hexo.extend.helper.get('post_section')({ source: data.source });
  if (section && section.centerIntro) {
    const match = MORE_RE.exec(data.content);
    if (match) {
      const intro = data.content.slice(0, match.index).trim();
      if (intro) {
        data.content = `<div class="poem-intro">\n\n${intro}\n\n</div>\n\n${data.content.slice(match.index)}`;
      }
    }
  }
  return data;
});

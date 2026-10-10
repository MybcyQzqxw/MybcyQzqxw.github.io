'use strict';

const { escapeHTML } = require('hexo-util');

const SEGMENTS = 4; // 每月分为 4 格，约一周一格
const SEGMENT_DAYS = 7;
const SEGMENT_LABEL = '1/4 个月';

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (y, m) => y * 12 + m;
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const segmentOf = (day) => Math.min(Math.floor((day - 1) / SEGMENT_DAYS), SEGMENTS - 1);
const niceMax = (v) => Math.max(4, Math.ceil(v / 4) * 4);

const STYLE = `
<style>
  .kr-stats {
    --st-accent: #1e8cdb;
    --st-card: rgba(128, 128, 128, 0.08);
    --st-border: rgba(128, 128, 128, 0.22);
    --st-empty: rgba(128, 128, 128, 0.16);
    --st-tip-bg: rgba(30, 34, 40, 0.96);
    --st-tip-fg: #fff;
    padding: 0 4px 12px;
  }
  html[data-theme="dark"] .kr-stats {
    --st-accent: #51aded;
    --st-card: rgba(255, 255, 255, 0.06);
    --st-border: rgba(255, 255, 255, 0.16);
    --st-empty: rgba(255, 255, 255, 0.1);
    --st-tip-bg: rgba(240, 244, 250, 0.96);
    --st-tip-fg: #1b1f27;
  }
  .kr-stats div, .kr-stats section { margin: 0; }
  .kr-stats .st-lead { text-align: center; opacity: 0.7; margin: 0 0 22px; font-size: 14px; }

  .kr-stats .st-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 26px; }
  .kr-stats .st-card { background: var(--st-card); border: 1px solid var(--st-border); border-radius: 10px; padding: 14px 10px; text-align: center; }
  .kr-stats .st-num { font-size: 26px; font-weight: 600; line-height: 1.2; color: var(--st-accent); }
  .kr-stats .st-num small { font-size: 13px; font-weight: 400; margin-left: 2px; opacity: 0.7; }
  .kr-stats .st-num.st-date { font-size: 20px; line-height: 36px; white-space: nowrap; }
  .kr-stats .st-label { font-size: 12px; opacity: 0.65; margin-top: 4px; }

  .kr-stats .st-section { background: var(--st-card); border: 1px solid var(--st-border); border-radius: 10px; padding: 16px 18px 18px; margin-bottom: 20px; }
  .kr-stats .st-title { margin: 0 0 14px; font-size: 16px; font-weight: 600; line-height: 1.4; }
  .kr-stats .st-title i { color: var(--st-accent); margin-right: 6px; }
  .kr-stats .st-title small { font-size: 12px; font-weight: 400; opacity: 0.6; margin-left: 8px; }
  .kr-stats .st-empty { text-align: center; opacity: 0.6; padding: 18px 0; font-size: 14px; }

  .kr-stats [data-tip] { position: relative; }
  .kr-stats [data-tip]:hover::after {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: 240px;
    padding: 6px 10px;
    border-radius: 6px;
    background: var(--st-tip-bg);
    color: var(--st-tip-fg);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.55;
    white-space: pre-line;
    text-align: left;
    pointer-events: none;
    z-index: 30;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  }
  .kr-stats .tip-l:hover::after { left: 0; transform: none; }
  .kr-stats .tip-r:hover::after { left: auto; right: 0; transform: none; }

  .kr-stats .hm-scroll { overflow-x: visible; }
  .kr-stats .hm { display: grid; row-gap: 6px; }
  .kr-stats .hm-row { display: grid; grid-template-columns: 40px 1fr; align-items: center; column-gap: 8px; }
  .kr-stats .hm-year { font-size: 12px; opacity: 0.7; text-align: right; font-variant-numeric: tabular-nums; }
  .kr-stats .hm-months { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 8px; }
  .kr-stats .hm-month-label { font-size: 11px; opacity: 0.6; text-align: left; line-height: 1.2; }
  .kr-stats .hm-month { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
  .kr-stats .hm-cell { display: block; aspect-ratio: 1 / 1; border-radius: 3px; background: var(--st-empty); }
  .kr-stats .hm-cell.future { background: transparent; border: 1px dashed var(--st-border); }
  .kr-stats .hm-cell.l1 { background: color-mix(in srgb, var(--st-accent) 30%, transparent); }
  .kr-stats .hm-cell.l2 { background: color-mix(in srgb, var(--st-accent) 52%, transparent); }
  .kr-stats .hm-cell.l3 { background: color-mix(in srgb, var(--st-accent) 76%, transparent); }
  .kr-stats .hm-cell.l4 { background: var(--st-accent); }
  .kr-stats a.hm-cell { cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .kr-stats a.hm-cell:hover { transform: scale(1.25); box-shadow: 0 0 0 1px var(--st-accent); z-index: 2; }
  .kr-stats .hm-foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px 16px; margin-top: 14px; font-size: 12px; opacity: 0.75; }
  .kr-stats .hm-legend { display: inline-flex; align-items: center; gap: 4px; }
  .kr-stats .hm-legend .hm-cell { width: 12px; height: 12px; aspect-ratio: auto; }

  .kr-stats .bars { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; align-items: end; }
  .kr-stats .bar-col { display: flex; flex-direction: column; align-items: center; min-width: 0; }
  .kr-stats .bar-val { font-size: 12px; height: 18px; line-height: 18px; opacity: 0.8; font-variant-numeric: tabular-nums; }
  .kr-stats .bar-track { position: relative; width: 100%; height: 150px; display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid var(--st-border); }
  .kr-stats .bar-fill { width: 70%; max-width: 34px; min-height: 2px; border-radius: 4px 4px 0 0; background: var(--st-accent); opacity: 0.85; transition: opacity 0.15s ease; }
  .kr-stats .bar-fill.zero { background: var(--st-empty); opacity: 1; }
  .kr-stats .bar-col:hover .bar-fill:not(.zero) { opacity: 1; }
  .kr-stats .bar-label { margin-top: 6px; font-size: 11px; opacity: 0.7; line-height: 1.3; text-align: center; }
  .kr-stats .bar-label em { display: block; font-style: normal; font-size: 10px; opacity: 0.7; min-height: 13px; }

  .kr-stats .line-svg { display: block; width: 100%; height: auto; }
  .kr-stats .ln-grid { stroke: currentColor; opacity: 0.12; }
  .kr-stats .ln-tick { fill: currentColor; opacity: 0.6; font-size: 11px; }
  .kr-stats .ln-area { fill: var(--st-accent); opacity: 0.14; }
  .kr-stats .ln-line { fill: none; stroke: var(--st-accent); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
  .kr-stats .ln-dot { fill: var(--st-accent); stroke: var(--st-card); stroke-width: 1.5; }
  .kr-stats .ln-dot:hover { r: 5.5; }

  .kr-stats .tags-list { display: grid; row-gap: 10px; }
  .kr-stats .tag-row { display: grid; grid-template-columns: minmax(70px, 130px) 1fr 28px; align-items: center; column-gap: 12px; font-size: 14px; }
  .kr-stats .tag-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kr-stats .tag-track { height: 10px; border-radius: 5px; background: var(--st-empty); overflow: hidden; }
  .kr-stats .tag-fill { height: 100%; border-radius: 5px; background: var(--st-accent); opacity: 0.85; }
  .kr-stats .tag-count { text-align: right; opacity: 0.75; font-variant-numeric: tabular-nums; }

  @media (max-width: 767px) {
    .kr-stats .st-summary { grid-template-columns: repeat(2, 1fr); }
    .kr-stats .st-num.st-date { font-size: 17px; }
    .kr-stats .st-section { padding: 14px 12px 16px; }
    .kr-stats .hm-scroll { overflow-x: auto; padding-bottom: 6px; }
    .kr-stats .hm { min-width: 520px; }
    .kr-stats .bars { gap: 3px; }
    .kr-stats .tag-row { grid-template-columns: minmax(60px, 96px) 1fr 24px; column-gap: 8px; }
  }
</style>`;

hexo.extend.generator.register('post-stats', function (locals) {
  const root = this.config.root || '/';
  const posts = locals.posts
    .filter((p) => p.title && !p.link)
    .sort('date', 1)
    .toArray();

  const now = new Date();
  const nowY = now.getFullYear();
  const nowM = now.getMonth();

  // 按月、按 1/4 月分桶
  const months = new Map();
  for (const p of posts) {
    const y = p.date.year();
    const m = p.date.month();
    const key = monthKey(y, m);
    if (!months.has(key)) {
      months.set(key, { y, m, count: 0, segs: Array.from({ length: SEGMENTS }, () => []) });
    }
    const entry = months.get(key);
    entry.count += 1;
    entry.segs[segmentOf(p.date.date())].push(p.title);
  }

  const total = posts.length;
  const firstDate = total ? posts[0].date : null;
  const lastDate = total ? posts[total - 1].date : null;

  let maxCell = 1;
  for (const e of months.values()) {
    for (const s of e.segs) maxCell = Math.max(maxCell, s.length);
  }

  // 最长连续活跃月数
  const keys = [...months.keys()].sort((a, b) => a - b);
  let streak = 0;
  let longest = 0;
  keys.forEach((k, i) => {
    streak = i > 0 && k - keys[i - 1] === 1 ? streak + 1 : 1;
    longest = Math.max(longest, streak);
  });

  const summary = `
<div class="st-summary">
  <div class="st-card"><div class="st-num">${total}<small>篇</small></div><div class="st-label">文章总数</div></div>
  <div class="st-card"><div class="st-num">${months.size}<small>个月</small></div><div class="st-label">活跃月份</div></div>
  <div class="st-card"><div class="st-num">${longest}<small>个月</small></div><div class="st-label">最长连续活跃</div></div>
  <div class="st-card"><div class="st-num st-date">${lastDate ? lastDate.format('YYYY-MM-DD') : '—'}</div><div class="st-label">最近发布</div></div>
</div>`;

  // 热度图
  const firstYear = firstDate ? firstDate.year() : nowY;
  const lastYear = Math.max(nowY, lastDate ? lastDate.year() : nowY);
  const levelOf = (count) => (count ? Math.min(4, Math.ceil((count * 4) / maxCell)) : 0);

  const monthLabels = Array.from({ length: 12 }, (_, m) => `<div class="hm-month-label">${m + 1}月</div>`).join('');
  let heatRows = `<div class="hm-row"><div class="hm-year"></div><div class="hm-months">${monthLabels}</div></div>`;

  for (let y = lastYear; y >= firstYear; y--) {
    let cols = '';
    for (let m = 0; m < 12; m++) {
      const entry = months.get(monthKey(y, m));
      const tipClass = m < 2 ? ' tip-l' : m > 9 ? ' tip-r' : '';
      let cells = '';
      for (let s = 0; s < SEGMENTS; s++) {
        const titles = entry ? entry.segs[s] : [];
        const count = titles.length;
        const from = s * SEGMENT_DAYS + 1;
        const to = s === SEGMENTS - 1 ? daysIn(y, m) : from + SEGMENT_DAYS - 1;
        const range = `${y}-${pad(m + 1)}-${pad(from)} ~ ${pad(to)}`;
        if (count) {
          const shown = titles.slice(0, 3).map((t) => `· ${t}`);
          if (titles.length > 3) shown.push(`…等 ${titles.length} 篇`);
          const tip = escapeHTML(`${range}\n${count} 篇\n${shown.join('\n')}`);
          cells += `<a class="hm-cell l${levelOf(count)}${tipClass}" href="${root}archives/${y}/${pad(m + 1)}/" data-tip="${tip}" aria-label="${escapeHTML(range)}：${count} 篇"></a>`;
        } else if (new Date(y, m, from) > now) {
          cells += '<span class="hm-cell future"></span>';
        } else {
          cells += `<span class="hm-cell${tipClass}" data-tip="${escapeHTML(`${range}\n无文章`)}"></span>`;
        }
      }
      cols += `<div class="hm-month">${cells}</div>`;
    }
    heatRows += `<div class="hm-row"><div class="hm-year">${y}</div><div class="hm-months">${cols}</div></div>`;
  }

  const legend = [0, 1, 2, 3, 4].map((l) => `<span class="hm-cell l${l}"></span>`).join('');
  const heatmap = `
<section class="st-section">
  <div class="st-title" role="heading" aria-level="3"><i class="fa fa-th"></i>发布热度图<small>每格为 ${SEGMENT_LABEL}（1–7 日、8–14 日、15–21 日、22 日至月底）</small></div>
  <div class="hm-scroll"><div class="hm">${heatRows}</div></div>
  <div class="hm-foot">
    <span>点击有文章的格子可查看当月归档</span>
    <span class="hm-legend">少 ${legend} 多</span>
  </div>
</section>`;

  // 近 12 个月柱状图
  const recent = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowY, nowM - i, 1);
    const entry = months.get(monthKey(d.getFullYear(), d.getMonth()));
    recent.push({ y: d.getFullYear(), m: d.getMonth(), count: entry ? entry.count : 0 });
  }
  const barMax = niceMax(Math.max(...recent.map((r) => r.count)));
  const bars = recent
    .map((r, i) => {
      const tipClass = i < 2 ? ' tip-l' : i > 9 ? ' tip-r' : '';
      const pct = (r.count / barMax) * 100;
      const showYear = i === 0 || r.m === 0;
      const tip = escapeHTML(`${r.y}-${pad(r.m + 1)}\n${r.count} 篇`);
      return `<div class="bar-col${tipClass}" data-tip="${tip}">
      <div class="bar-val">${r.count || ''}</div>
      <div class="bar-track"><div class="bar-fill${r.count ? '' : ' zero'}" style="height:${r.count ? pct : 0}%"></div></div>
      <div class="bar-label">${r.m + 1}月<em>${showYear ? r.y : ''}</em></div>
    </div>`;
    })
    .join('');
  const barChart = `
<section class="st-section">
  <div class="st-title" role="heading" aria-level="3"><i class="fa fa-bar-chart"></i>月度发文量<small>最近 12 个月</small></div>
  <div class="bars">${bars}</div>
</section>`;

  // 累计文章数折线图
  const startKey = Math.min(keys.length ? keys[0] : Infinity, monthKey(nowY, nowM) - 11);
  const endKey = Math.max(monthKey(nowY, nowM), keys.length ? keys[keys.length - 1] : -Infinity);
  const points = [];
  let acc = 0;
  for (let k = startKey; k <= endKey; k++) {
    const entry = months.get(k);
    acc += entry ? entry.count : 0;
    points.push({ y: Math.floor(k / 12), m: k % 12, acc });
  }
  const W = 640;
  const H = 240;
  const L = 36;
  const R = 18;
  const T = 16;
  const B = 30;
  const lineMax = niceMax(total);
  const px = (i) => (points.length === 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (points.length - 1));
  const py = (v) => T + (H - T - B) * (1 - v / lineMax);

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (lineMax / 4) * i;
    const y = py(v).toFixed(1);
    grid += `<line class="ln-grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="ln-tick" x="${L - 8}" y="${(+y + 4).toFixed(1)}" text-anchor="end">${v}</text>`;
  }
  const step = Math.ceil(points.length / 8);
  let xLabels = '';
  points.forEach((p, i) => {
    const isLast = i === points.length - 1;
    if (isLast || (i % step === 0 && points.length - 1 - i >= step)) {
      xLabels += `<text class="ln-tick" x="${px(i).toFixed(1)}" y="${H - 8}" text-anchor="${isLast && points.length > 1 ? 'end' : 'middle'}">${p.y}-${pad(p.m + 1)}</text>`;
    }
  });
  const linePts = points.map((p, i) => `${px(i).toFixed(1)},${py(p.acc).toFixed(1)}`);
  const linePath = `M${linePts.join(' L')}`;
  const areaPath = `${linePath} L${px(points.length - 1).toFixed(1)},${py(0).toFixed(1)} L${px(0).toFixed(1)},${py(0).toFixed(1)} Z`;
  const dots = points
    .map((p, i) => `<circle class="ln-dot" cx="${px(i).toFixed(1)}" cy="${py(p.acc).toFixed(1)}" r="3.5"><title>${p.y}-${pad(p.m + 1)}：累计 ${p.acc} 篇</title></circle>`)
    .join('');
  const lineChart = `
<section class="st-section">
  <div class="st-title" role="heading" aria-level="3"><i class="fa fa-line-chart"></i>累计文章数<small>按月累计</small></div>
  <svg class="line-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="累计文章数折线图">
    ${grid}
    <path class="ln-area" d="${areaPath}"/>
    <path class="ln-line" d="${linePath}"/>
    ${dots}
    ${xLabels}
  </svg>
</section>`;

  // 标签分布
  const tags = locals.tags
    .toArray()
    .map((t) => ({ name: t.name, count: t.posts.filter((p) => p.title && !p.link).length, path: t.path }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
  const tagMax = tags.length ? tags[0].count : 1;
  const tagRows = tags
    .map(
      (t) => `<div class="tag-row">
      <a class="tag-name" href="${root}${t.path}" title="${escapeHTML(t.name)}"># ${escapeHTML(t.name)}</a>
      <div class="tag-track"><div class="tag-fill" style="width:${(t.count / tagMax) * 100}%"></div></div>
      <span class="tag-count">${t.count}</span>
    </div>`,
    )
    .join('');
  const tagChart = `
<section class="st-section">
  <div class="st-title" role="heading" aria-level="3"><i class="fa fa-tags"></i>标签分布<small>文章数最多的标签</small></div>
  ${tags.length ? `<div class="tags-list">${tagRows}</div>` : '<div class="st-empty">还没有标签</div>'}
</section>`;

  const content = `${STYLE}
<div class="kr-stats">
  <div class="st-lead">文章发布频率一览</div>
  ${summary}
  ${heatmap}
  ${barChart}
  ${lineChart}
  ${tagChart}
</div>`;

  return {
    path: 'stats/index.html',
    layout: ['page'],
    data: {
      title: '发布统计',
      type: 'stats',
      content,
      updated: lastDate || now,
      comments: false,
      show_copyright: false,
      donate: false,
      share: false,
    },
  };
});

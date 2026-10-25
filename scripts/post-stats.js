'use strict';

const { escapeHTML } = require('hexo-util');

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DAY_MS = 86400000;

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (y, m) => y * 12 + m;
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

  /* GitHub 贡献图配色与布局：一列 7 格为一周，周日在最上方 */
  .kr-stats .hm-wrap {
    --hm-l0: #ebedf0; --hm-l1: #9be9a8; --hm-l2: #40c463; --hm-l3: #30a14e; --hm-l4: #216e39;
    --hm-edge: rgba(27, 31, 35, 0.06);
    --hm-gap: 2px;
    position: relative;
  }
  html[data-theme="dark"] .kr-stats .hm-wrap {
    --hm-l0: #161b22; --hm-l1: #0e4429; --hm-l2: #006d32; --hm-l3: #26a641; --hm-l4: #39d353;
    --hm-edge: rgba(255, 255, 255, 0.05);
  }
  .kr-stats .hm-radio { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
  .kr-stats .hm-panel { display: none; }
  .kr-stats .hm-head { font-size: 14px; line-height: 32px; margin-bottom: 8px; }
  /* 格子边长由容器宽度推算，行列均用同一个 --hm-cell，保证标注与格子逐行逐列对齐 */
  .kr-stats .hm-scroll { container-type: inline-size; }
  .kr-stats .hm-board {
    --hm-cell: min(14px, calc((100cqw - 32px - (var(--weeks) - 1) * var(--hm-gap)) / var(--weeks)));
    display: grid;
    grid-template-columns: 28px auto;
    grid-template-rows: 16px auto;
    column-gap: 4px;
    row-gap: 4px;
    width: max-content;
  }
  .kr-stats .hm-mlabels, .kr-stats .hm-grid { display: grid; grid-template-columns: repeat(var(--weeks), var(--hm-cell)); column-gap: var(--hm-gap); }
  .kr-stats .hm-mlabels { font-size: 12px; line-height: 16px; opacity: 0.75; }
  .kr-stats .hm-mlabels span { grid-row: 1; white-space: nowrap; }
  .kr-stats .hm-dlabels { display: grid; grid-template-rows: repeat(7, var(--hm-cell)); row-gap: var(--hm-gap); font-size: 11px; opacity: 0.75; }
  .kr-stats .hm-dlabels span { display: flex; align-items: center; height: var(--hm-cell); line-height: 1; white-space: nowrap; }
  .kr-stats .hm-grid { grid-template-rows: repeat(7, var(--hm-cell)); grid-auto-flow: column; row-gap: var(--hm-gap); }
  .kr-stats .hm-cell { display: block; width: var(--hm-cell); height: var(--hm-cell); border-radius: 2px; background: var(--hm-l0); outline: 1px solid var(--hm-edge); outline-offset: -1px; }
  .kr-stats .hm-cell.hm-none { background: transparent; outline: none; }
  .kr-stats .hm-cell.l1 { background: var(--hm-l1); }
  .kr-stats .hm-cell.l2 { background: var(--hm-l2); }
  .kr-stats .hm-cell.l3 { background: var(--hm-l3); }
  .kr-stats .hm-cell.l4 { background: var(--hm-l4); }
  .kr-stats a.hm-cell { cursor: pointer; }
  .kr-stats a.hm-cell:hover { outline: 1px solid rgba(128, 128, 128, 0.9); outline-offset: 1px; z-index: 2; }
  .kr-stats .hm-foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; padding-left: 32px; font-size: 12px; }
  .kr-stats .hm-foot > span:first-child { opacity: 0.7; }
  .kr-stats .hm-legend { display: inline-flex; align-items: center; gap: 4px; }
  .kr-stats .hm-legend .hm-cell { width: 12px; height: 12px; }
  .kr-stats .hm-tabs { position: absolute; top: 0; right: 0; display: flex; gap: 4px; }
  .kr-stats .hm-tabs label { margin: 0; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 400; line-height: 1.3; text-align: center; cursor: pointer; opacity: 0.85; font-variant-numeric: tabular-nums; }
  .kr-stats .hm-tabs label:hover { background: var(--st-empty); }

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
    .kr-stats .hm-tabs { position: static; flex-wrap: wrap; margin-bottom: 8px; }
    .kr-stats .hm-head { line-height: 1.5; }
    .kr-stats .hm-scroll { overflow-x: auto; padding-bottom: 6px; }
    .kr-stats .hm-board { --hm-cell: 10px; }
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

  // 按月、按日分桶
  const months = new Map();
  const days = new Map();
  for (const p of posts) {
    const y = p.date.year();
    const m = p.date.month();
    const key = monthKey(y, m);
    if (!months.has(key)) months.set(key, { y, m, count: 0 });
    months.get(key).count += 1;

    const dayKey = `${y}-${pad(m + 1)}-${pad(p.date.date())}`;
    if (!days.has(dayKey)) days.set(dayKey, []);
    days.get(dayKey).push(p.title);
  }

  const total = posts.length;
  const firstDate = total ? posts[0].date : null;
  const lastDate = total ? posts[total - 1].date : null;

  let maxCell = 1;
  for (const titles of days.values()) maxCell = Math.max(maxCell, titles.length);

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

  const today =  Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const years = [];
  for (let y = lastYear; y >= firstYear; y--) years.push(y);
  const currentYear = String(years.includes(nowY) ? nowY : years[0]);

  const panels = years
    .map((y) => {
      const jan1 = Date.UTC(y, 0, 1);
      const dayCount = (Date.UTC(y + 1, 0, 1) - jan1) / DAY_MS;
      const offset = new Date(jan1).getUTCDay();
      const weeks = Math.ceil((offset + dayCount) / 7);

      let cells = '<span class="hm-cell hm-none"></span>'.repeat(offset);
      let yearTotal = 0;
      let labels = '';
      let lastLabelWeek = -10;
      for (let i = 0; i < dayCount; i++) {
        const t = jan1 + i * DAY_MS;
        const d = new Date(t);
        const m = d.getUTCMonth();
        const day = d.getUTCDate();
        const week = Math.floor((offset + i) / 7);
        if (day === 1 && week - lastLabelWeek >= 3) {
          labels += `<span style="grid-column:${week + 1}">${m + 1}月</span>`;
          lastLabelWeek = week;
        }
        if (t > today) {
          cells += '<span class="hm-cell hm-none"></span>';
          continue;
        }
        const titles = days.get(`${y}-${pad(m + 1)}-${pad(day)}`) || [];
        const count = titles.length;
        yearTotal += count;
        const tipClass = week < 4 ? ' tip-l' : week > weeks - 5 ? ' tip-r' : '';
        const dateText = `${y}年${m + 1}月${day}日`;
        if (count) {
          const shown = titles.slice(0, 3).map((title) => `· ${title}`);
          if (titles.length > 3) shown.push(`…等 ${titles.length} 篇`);
          const tip = escapeHTML(`${count} 篇文章 · ${dateText}\n${shown.join('\n')}`);
          cells += `<a class="hm-cell l${levelOf(count)}${tipClass}" href="${root}archives/${y}/${pad(m + 1)}/" data-tip="${tip}" aria-label="${escapeHTML(dateText)}：${count} 篇"></a>`;
        } else {
          cells += `<span class="hm-cell${tipClass}" data-tip="${escapeHTML(`无文章 · ${dateText}`)}"></span>`;
        }
      }

      const dayLabels = WEEKDAYS.map((n, i) => (i % 2 === 1 ? `<span>${n}</span>` : '<span></span>')).join('');
      return `<div class="hm-panel hm-panel-${y}">
    <div class="hm-head">${y} 年共发布 <strong>${yearTotal}</strong> 篇文章</div>
    <div class="hm-scroll"><div class="hm-board" style="--weeks:${weeks}">
      <div></div>
      <div class="hm-mlabels">${labels}</div>
      <div class="hm-dlabels">${dayLabels}</div>
      <div class="hm-grid">${cells}</div>
    </div></div>
  </div>`;
    })
    .join('');

  const radios = years
    .map((y) => `<input class="hm-radio" type="radio" name="hm-year" id="hm-y-${y}" aria-label="${y}"${String(y) === currentYear ? ' checked' : ''}>`)
    .join('');
  const tabs = years.map((y) => `<label for="hm-y-${y}">${y}</label>`).join('');
  const tabStyle = years
    .map(
      (y) => `#hm-y-${y}:checked ~ .hm-main .hm-panel-${y} { display: block; }
  #hm-y-${y}:checked ~ .hm-tabs label[for="hm-y-${y}"] { background: var(--st-accent); color: #fff; opacity: 1; }
  #hm-y-${y}:focus-visible ~ .hm-tabs label[for="hm-y-${y}"] { outline: 2px solid var(--st-accent); outline-offset: 2px; }`,
    )
    .join('\n  ');

  const legend = [0, 1, 2, 3, 4].map((l) => `<span class="hm-cell l${l}"></span>`).join('');
  const heatmap = `
<section class="st-section">
  <div class="st-title" role="heading" aria-level="3"><i class="fa fa-th"></i>发布热度图</div>
  <style>
  ${tabStyle}
  </style>
  <div class="hm-wrap">
    ${radios}
    <div class="hm-tabs">${tabs}</div>
    <div class="hm-main">${panels}
      <div class="hm-foot">
        <span>点击有文章的格子可查看当月归档</span>
        <span class="hm-legend">少 ${legend} 多</span>
      </div>
    </div>
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
      title: '统计',
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

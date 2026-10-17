'use strict';

// 将 source/_data/quotes.yml 中的个性签名打包进 /js/cover-quote.js，
// 脚本在首页封面中随机展示其中一条
const CLIENT_SCRIPT = `(function () {
  if (window.__coverQuoteBound) return;
  window.__coverQuoteBound = true;

  var QUOTES = __QUOTES__;
  var last = -1;

  function pick() {
    if (QUOTES.length === 1) return 0;
    var i;
    do {
      i = Math.floor(Math.random() * QUOTES.length);
    } while (i === last);
    return i;
  }

  function render() {
    var box = document.querySelector("#kr-fullpage-cover .kr-fullpage-cover-content");
    if (!box) return;
    if (!QUOTES.length) {
      box.classList.add("kr-quote-ready");
      return;
    }
    last = pick();
    var q = QUOTES[last];
    box.textContent = "";
    var text = document.createElement("p");
    text.className = "kr-quote-text";
    text.textContent = q.text;
    box.appendChild(text);
    if (q.from) {
      var from = document.createElement("p");
      from.className = "kr-quote-from";
      from.textContent = "\\u2014\\u2014" + q.from;
      box.appendChild(from);
    }
    box.classList.add("kr-quote-ready");
  }

  render();
  window.addEventListener("pjax:complete", render);
})();
`;

hexo.extend.generator.register('cover-quote', (locals) => {
  const data = hexo.locals.get('data') || {};
  const quotes = (data.quotes || [])
    .filter((q) => q && q.text)
    .map((q) => ({ text: String(q.text), from: q.from ? String(q.from) : '' }));

  return {
    path: 'js/cover-quote.js',
    data: CLIENT_SCRIPT.replace('__QUOTES__', () => JSON.stringify(quotes)),
  };
});

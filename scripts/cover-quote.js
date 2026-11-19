'use strict';

// 将 source/_data/quotes.yml 中的个性签名打包进 /js/cover-quote.js，
// 脚本在首页封面中随机展示其中一条
const CLIENT_SCRIPT = `(function () {
  if (window.__coverQuoteBound) return;
  window.__coverQuoteBound = true;

  var QUOTES = __QUOTES__;
  var last = -1;
  var CHAR_STEP = 110;
  var FROM_PAUSE = 350;
  var stopAnimation = null;

  function pick() {
    if (QUOTES.length === 1) return 0;
    var i;
    do {
      i = Math.floor(Math.random() * QUOTES.length);
    } while (i === last);
    return i;
  }

  // 把文字拆成逐字的 span，按顺序错开动画延迟；空白字符保持原样
  function appendChars(parent, str, startIndex) {
    var n = startIndex;
    Array.from(str).forEach(function (ch) {
      if (/^\\s$/.test(ch)) {
        parent.appendChild(document.createTextNode(ch));
        return;
      }
      var span = document.createElement("span");
      span.className = "kr-quote-char";
      span.style.animationDelay = n * CHAR_STEP + "ms";
      span.textContent = ch;
      parent.appendChild(span);
      n++;
    });
    return n;
  }

  // 动画未播完时，用户往下拉（滚动条/滚轮/触摸/按键）就直接显示全部文字
  function bindInterrupt(box, lastChar) {
    var touchY = null;
    var lastY = window.scrollY || 0;

    function finish() {
      if (stopAnimation) stopAnimation();
    }
    function onScroll() {
      var y = window.scrollY || 0;
      if (y > lastY) skip();
      lastY = y;
    }
    function onWheel(e) {
      if (e.deltaY > 0) skip();
    }
    function onTouchStart(e) {
      touchY = e.touches.length ? e.touches[0].clientY : null;
    }
    function onTouchMove(e) {
      if (touchY !== null && e.touches.length && touchY - e.touches[0].clientY > 4) skip();
    }
    function onKey(e) {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "End" || e.key === " ") skip();
    }
    function skip() {
      box.classList.add("kr-quote-skip");
      finish();
    }

    stopAnimation = function () {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      if (lastChar) lastChar.removeEventListener("animationend", finish);
      stopAnimation = null;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    if (lastChar) lastChar.addEventListener("animationend", finish);
  }

  function render() {
    var box = document.querySelector("#kr-fullpage-cover .kr-fullpage-cover-content");
    if (!box) return;
    if (stopAnimation) stopAnimation();
    box.classList.remove("kr-quote-skip");
    if (!QUOTES.length) {
      box.classList.add("kr-quote-ready");
      return;
    }
    last = pick();
    var q = QUOTES[last];
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.textContent = "";
    var text = document.createElement("p");
    text.className = "kr-quote-text";
    var n = 0;
    q.text.split("\\n").forEach(function (line, i) {
      if (i) text.appendChild(document.createElement("br"));
      n = appendChars(text, line, n);
    });
    box.appendChild(text);
    if (q.from) {
      var from = document.createElement("p");
      from.className = "kr-quote-from";
      // 出处稍作停顿后再浮现
      var fromStart = n + Math.round(FROM_PAUSE / CHAR_STEP);
      appendChars(from, "\\u2014\\u2014" + q.from, fromStart);
      box.appendChild(from);
    }
    box.classList.add("kr-quote-ready");

    if (reduce) {
      box.classList.add("kr-quote-skip");
      return;
    }
    var chars = box.querySelectorAll(".kr-quote-char");
    var lastChar = chars.length ? chars[chars.length - 1] : null;
    bindInterrupt(box, lastChar);
  }

  render();
  window.addEventListener("pjax:complete", render);
})();
`;

hexo.extend.generator.register('cover-quote', (locals) => {
  const data = hexo.locals.get('data') || {};
  const quotes = (data.quotes || [])
    .filter((q) => q && q.text)
    .map((q) => ({ text: String(q.text).trim(), from: q.from ? String(q.from) : '' }));

  return {
    path: 'js/cover-quote.js',
    data: CLIENT_SCRIPT.replace('__QUOTES__', () => JSON.stringify(quotes)),
  };
});

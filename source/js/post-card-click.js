(function () {
  if (window.__postCardClickBound) return;
  window.__postCardClickBound = true;

  var CARD = ".kratos-entry-border";
  var INTERACTIVE =
    'a[href], button, input, select, textarea, label, summary, [role="button"], [contenteditable="true"]';
  var DRAG_THRESHOLD = 5;
  // 略大于一次双击的间隔，用于等待可能的双击选词
  var DBLCLICK_WAIT = 300;

  var style = document.createElement("style");
  style.textContent =
    CARD + "{cursor:pointer}" + CARD + " .kratos-entry-post-meta time a{cursor:pointer}";
  document.head.appendChild(style);

  var down = null;
  var timer = null;

  function hasSelection() {
    var sel = window.getSelection && window.getSelection();
    return !!sel && !sel.isCollapsed && sel.toString().length > 0;
  }

  function cancelPending() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function getTitleLink(card) {
    return (
      card.querySelector(".kratos-entry-title a[href]") ||
      card.querySelector("a.read-more[href]")
    );
  }

  // 借助临时链接复用主题的 PJAX 跳转
  function openUrl(url, inNewTab) {
    if (inNewTab) {
      window.open(url, "_blank");
      return;
    }
    var a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  document.addEventListener(
    "mousedown",
    function (e) {
      cancelPending();
      down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    },
    true,
  );

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var card = target.closest(CARD);
    if (!card) return;

    // 文章卡片左下角的日期：跳转到发布统计页
    if (target.closest(".kratos-entry-post-meta time a")) {
      cancelPending();
      if (e.button !== 0 || e.shiftKey || e.altKey) return;
      if (hasSelection()) return;
      e.preventDefault();
      var root = (window.kr && window.kr.siteRoot) || "/";
      openUrl(root + "stats/", e.ctrlKey || e.metaKey);
      return;
    }

    // 原有可点击元素（标题、标签、阅读全文等）保持原行为
    if (target.closest(INTERACTIVE)) return;

    // 双击/三击是在选词/选段，取消尚未执行的跳转
    if (e.detail > 1) {
      cancelPending();
      return;
    }

    if (e.button !== 0 || e.shiftKey || e.altKey) return;

    // 按下与松开位置不同说明是拖拽选择
    if (
      down &&
      (Math.abs(e.clientX - down.x) > DRAG_THRESHOLD ||
        Math.abs(e.clientY - down.y) > DRAG_THRESHOLD)
    ) {
      return;
    }
    if (hasSelection()) return;

    var link = getTitleLink(card);
    if (!link) return;

    if (e.ctrlKey || e.metaKey) {
      window.open(link.href, "_blank");
      return;
    }

    cancelPending();
    timer = setTimeout(function () {
      timer = null;
      if (hasSelection() || !document.contains(link)) return;
      // 触发链接自身的点击，以复用主题的 PJAX 跳转
      link.click();
    }, DBLCLICK_WAIT);
  });
})();

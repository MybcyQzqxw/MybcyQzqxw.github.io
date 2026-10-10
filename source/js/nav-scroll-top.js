(function () {
  if (window.__navScrollTopBound) return;
  window.__navScrollTopBound = true;

  var NAV_LINK = ".kratos-topnav a[href]";
  var pendingAt = 0;
  var PENDING_TTL = 10000;

  function toTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener(
    "click",
    function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;

      var link = e.target.closest(NAV_LINK);
      if (!link) return;

      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) return;
      if (link.target === "_blank" || link.origin !== location.origin) return;

      pendingAt = Date.now();
      // 主题的 PJAX 会在本次点击中把页面滚动到正文顶部，这里在其之后改为滚动到页面最顶端
      setTimeout(toTop, 0);
    },
    true,
  );

  // 新页面渲染完成后（高度可能变化）再次确保位于最顶部
  window.addEventListener("pjax:complete", function () {
    if (!pendingAt || Date.now() - pendingAt > PENDING_TTL) return;
    pendingAt = 0;
    toTop();
  });
})();

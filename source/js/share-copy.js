(function () {
  const SUCCESS_SUFFIX = "（链接已复制到剪贴板）";

  function getShareUrl() {
    const meta = document.querySelector('meta[property="og:url"]');
    return (meta && meta.getAttribute("content")) || location.href;
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {}
    }
    return fallbackCopy(text);
  }

  document.addEventListener(
    "click",
    function (e) {
      const trigger = e.target.closest && e.target.closest("a.share");
      if (!trigger) return;

      const msg = document.querySelector("#kr-share-modal .kr-share-message");
      if (!msg) return;
      if (!msg.dataset.base) msg.dataset.base = msg.textContent.trim();
      msg.textContent = msg.dataset.base;

      copyText(getShareUrl()).then(function (ok) {
        if (ok) msg.textContent = msg.dataset.base + SUCCESS_SUFFIX;
      });
    },
    true
  );
})();

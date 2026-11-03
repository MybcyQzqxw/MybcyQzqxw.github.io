(function () {
  if (window.__sectionPreselectBound) return;
  window.__sectionPreselectBound = true;

  // 按 URL 中的 ?section=板块名 预先选中板块筛选条中的对应项（仅该板块被选中）
  function apply() {
    var name = new URLSearchParams(location.search).get("section");
    if (!name) return;
    var form = document.querySelector(".sec-filter");
    if (!form) return;
    var target = null;
    form.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.checked = false;
      if (input.value === name) target = input;
    });
    if (target) target.checked = true;
  }

  apply();
  window.addEventListener("pjax:complete", apply);
  // 已在目标地址时 PJAX 不会再跳转，这里直接重新应用，保证“仅该板块被选中”
  document.addEventListener("click", function (e) {
    var link = e.target instanceof Element && e.target.closest("a.sec-badge");
    if (link && link.href === location.href) apply();
  });
})();

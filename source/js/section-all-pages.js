(function () {
  if (window.__sectionAllPagesBound) return;
  window.__sectionAllPagesBound = true;

  // 首页是分页的，而板块筛选在浏览器端完成：勾选板块时把其余分页的文章也载入当前页（由 CSS 决定显示与否）
  var cache = {};

  function pageLinks(pagination) {
    var seen = {};
    var links = [];
    pagination.querySelectorAll("a.page-number").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href && !seen[href]) {
        seen[href] = true;
        links.push(a.href);
      }
    });
    return links;
  }

  function fetchPage(url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          return Array.prototype.map.call(
            doc.querySelectorAll("#main article[data-section]"),
            function (el) {
              return document.importNode(el, true);
            },
          );
        })
        .catch(function (err) {
          delete cache[url];
          throw err;
        });
    }
    return cache[url];
  }

  var loading = false;

  function ensure() {
    var form = document.querySelector(".sec-filter");
    var pagination = document.querySelector("#main .pagination");
    if (!form || !pagination || pagination.hasAttribute("data-sec-all")) return;
    if (!form.querySelector("input:checked") || loading) return;

    var current = pagination.querySelector(".page-number.current");
    var all = Array.prototype.slice.call(document.querySelectorAll("#main article[data-section]"));
    var links = pageLinks(pagination);
    if (!links.length || !all.length) return;
    var first = all[0];
    var last = all[all.length - 1];
    var currentNumber = current ? parseInt(current.textContent, 10) : 1;

    loading = true;
    Promise.all(
      links.map(function (url) {
        return fetchPage(url).then(function (articles) {
          return { url: url, articles: articles };
        });
      }),
    )
      .then(function (pages) {
        if (!document.contains(pagination)) return;
        var parent = first.parentNode;
        var afterRef = last.nextSibling;
        pages.forEach(function (page) {
          var m = page.url.match(/\/page\/(\d+)\/?(?:[?#].*)?$/);
          var number = m ? parseInt(m[1], 10) : 1;
          var ref = number < currentNumber ? first : afterRef;
          page.articles.forEach(function (el) {
            var node = el.cloneNode(true);
            node.setAttribute("data-sec-extra", "");
            parent.insertBefore(node, ref);
          });
        });
        pagination.setAttribute("data-sec-all", "");
      })
      .catch(function () {})
      .then(function () {
        loading = false;
      });
  }

  document.addEventListener("change", function (e) {
    if (e.target instanceof Element && e.target.closest(".sec-filter")) ensure();
  });
  window.addEventListener("pjax:complete", function () {
    setTimeout(ensure, 0);
  });
  document.addEventListener("click", function (e) {
    if (e.target instanceof Element && e.target.closest("a.sec-badge")) setTimeout(ensure, 50);
  });
  // 预选板块（?section=）由 section-preselect.js 在同一时刻应用
  setTimeout(ensure, 0);
})();

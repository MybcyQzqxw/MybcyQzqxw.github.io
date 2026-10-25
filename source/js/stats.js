(function () {
  var rootEl = document.getElementById("kr-stats");
  var dataEl = document.getElementById("kr-stats-data");
  if (!rootEl || !dataEl) return;

  var data = JSON.parse(dataEl.textContent);
  var siteRoot = data.root || "/";
  var sections = data.sections;
  var NO_SECTION = -1;
  var NO_SECTION_COLOR = "#9aa0a6";
  var WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  var DAY_MS = 86400000;
  var LEVELS = [0, 34, 56, 78, 100];

  var pad = function (n) {
    return String(n).padStart(2, "0");
  };
  var esc = function (s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  var niceMax = function (v) {
    return Math.max(4, Math.ceil(v / 4) * 4);
  };
  var colorOf = function (s) {
    return s >= 0 ? sections[s].color : NO_SECTION_COLOR;
  };
  var nameOf = function (s) {
    return s >= 0 ? sections[s].name : "其他";
  };
  var $ = function (id) {
    return document.getElementById(id);
  };

  var posts = data.posts.map(function (p) {
    var parts = p.d.split("-");
    return {
      key: p.d,
      y: +parts[0],
      m: +parts[1] - 1,
      d: +parts[2],
      s: p.s,
      t: p.t,
      g: p.g,
    };
  });

  var now = new Date();
  var nowY = now.getFullYear();
  var nowM = now.getMonth();
  var today = Date.UTC(nowY, nowM, now.getDate());

  var selected = new Set(); // 为空表示全部板块
  var activeYear = nowY;

  var years = [nowY];
  posts.forEach(function (p) {
    if (years.indexOf(p.y) < 0) years.push(p.y);
  });
  years.sort(function (a, b) {
    return b - a;
  });

  var visible = function () {
    return selected.size
      ? posts.filter(function (p) {
          return selected.has(p.s);
        })
      : posts;
  };

  // 当前统计涉及的板块（按配置顺序），用于图例、堆叠与折线
  var activeSections = function (list) {
    var present = new Set(
      list.map(function (p) {
        return p.s;
      }),
    );
    var out = [];
    sections.forEach(function (_, i) {
      if (selected.size ? selected.has(i) : true) out.push(i);
    });
    if (!selected.size && present.has(NO_SECTION)) out.push(NO_SECTION);
    return out;
  };

  var renderSummary = function (list) {
    var months = new Set();
    list.forEach(function (p) {
      months.add(p.y * 12 + p.m);
    });
    var keys = Array.from(months).sort(function (a, b) {
      return a - b;
    });
    var streak = 0;
    var longest = 0;
    keys.forEach(function (k, i) {
      streak = i > 0 && k - keys[i - 1] === 1 ? streak + 1 : 1;
      longest = Math.max(longest, streak);
    });
    var last = list.length ? list[list.length - 1].key : "—";
    $("st-summary").innerHTML =
      '<div class="st-card"><div class="st-num">' + list.length + "<small>篇</small></div><div class=\"st-label\">文章总数</div></div>" +
      '<div class="st-card"><div class="st-num">' + months.size + "<small>个月</small></div><div class=\"st-label\">活跃月份</div></div>" +
      '<div class="st-card"><div class="st-num">' + longest + "<small>个月</small></div><div class=\"st-label\">最长连续活跃</div></div>" +
      '<div class="st-card"><div class="st-num st-date">' + last + "</div><div class=\"st-label\">最近发布</div></div>";
  };

  var cellBackground = function (list, level) {
    var secs = [];
    list.forEach(function (p) {
      if (secs.indexOf(p.s) < 0) secs.push(p.s);
    });
    secs.sort();
    var colors = secs.map(function (s) {
      return "color-mix(in srgb, " + colorOf(s) + " " + LEVELS[level] + "%, var(--hm-l0))";
    });
    if (colors.length === 1) return colors[0];
    var step = 100 / colors.length;
    var stops = colors.map(function (c, i) {
      return c + " " + i * step + "% " + (i + 1) * step + "%";
    });
    return "linear-gradient(135deg, " + stops.join(", ") + ")";
  };

  var renderHeatmap = function (list) {
    var byDay = {};
    var maxDay = 1;
    list.forEach(function (p) {
      (byDay[p.key] = byDay[p.key] || []).push(p);
      maxDay = Math.max(maxDay, byDay[p.key].length);
    });

    var y = activeYear;
    var jan1 = Date.UTC(y, 0, 1);
    var dayCount = (Date.UTC(y + 1, 0, 1) - jan1) / DAY_MS;
    var offset = new Date(jan1).getUTCDay();
    var weeks = Math.ceil((offset + dayCount) / 7);

    var cells = '<span class="hm-cell hm-none"></span>'.repeat(offset);
    var labels = "";
    var lastLabelWeek = -10;
    var yearTotal = 0;
    for (var i = 0; i < dayCount; i++) {
      var t = jan1 + i * DAY_MS;
      var d = new Date(t);
      var m = d.getUTCMonth();
      var day = d.getUTCDate();
      var week = Math.floor((offset + i) / 7);
      if (day === 1 && week - lastLabelWeek >= 3) {
        labels += '<span style="grid-column:' + (week + 1) + '">' + (m + 1) + "月</span>";
        lastLabelWeek = week;
      }
      if (t > today) {
        cells += '<span class="hm-cell hm-none"></span>';
        continue;
      }
      var ps = byDay[y + "-" + pad(m + 1) + "-" + pad(day)] || [];
      yearTotal += ps.length;
      var tipClass = week < 4 ? " tip-l" : week > weeks - 5 ? " tip-r" : "";
      var dateText = y + "年" + (m + 1) + "月" + day + "日";
      if (ps.length) {
        var level = Math.min(4, Math.ceil((ps.length * 4) / maxDay));
        var shown = ps.slice(0, 3).map(function (p) {
          return "· [" + nameOf(p.s) + "] " + p.t;
        });
        if (ps.length > 3) shown.push("…等 " + ps.length + " 篇");
        var tip = ps.length + " 篇文章 · " + dateText + "\n" + shown.join("\n");
        cells +=
          '<a class="hm-cell' + tipClass + '" href="' + siteRoot + "archives/" + y + "/" + pad(m + 1) + '/" style="background:' +
          cellBackground(ps, level) + '" data-tip="' + esc(tip) + '" aria-label="' + esc(dateText) + "：" + ps.length + ' 篇"></a>';
      } else {
        cells += '<span class="hm-cell' + tipClass + '" data-tip="' + esc("无文章 · " + dateText) + '"></span>';
      }
    }

    var dayLabels = WEEKDAYS.map(function (n, idx) {
      return idx % 2 === 1 ? "<span>" + n + "</span>" : "<span></span>";
    }).join("");

    var tabs = years
      .map(function (yr) {
        return '<button type="button" data-year="' + yr + '"' + (yr === activeYear ? ' class="on"' : "") + ">" + yr + "</button>";
      })
      .join("");

    var legendColor = selected.size === 1 ? colorOf(Array.from(selected)[0]) : "#7d8590";
    var legend = LEVELS.map(function (pct) {
      return '<span class="hm-cell" style="background:color-mix(in srgb, ' + legendColor + " " + pct + '%, var(--hm-l0))"></span>';
    }).join("");

    var swatches = "";
    if (selected.size !== 1) {
      swatches = activeSections(list)
        .map(function (s) {
          return '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;background:' + colorOf(s) + '"></i>' + esc(nameOf(s)) + "</span>";
        })
        .join(" ");
    }

    $("st-heat").innerHTML =
      '<div class="st-title" role="heading" aria-level="3"><i class="fa fa-th"></i>发布热度图</div>' +
      '<div class="hm-wrap"><div class="hm-tabs">' + tabs + "</div>" +
      '<div class="hm-head">' + y + " 年共发布 <strong>" + yearTotal + "</strong> 篇文章</div>" +
      '<div class="hm-scroll"><div class="hm-board" style="--weeks:' + weeks + '"><div></div>' +
      '<div class="hm-mlabels">' + labels + "</div>" +
      '<div class="hm-dlabels">' + dayLabels + "</div>" +
      '<div class="hm-grid">' + cells + "</div></div></div>" +
      '<div class="hm-foot"><span>点击有文章的格子可查看当月归档 ' + swatches + "</span>" +
      '<span class="hm-legend">少 ' + legend + " 多</span></div></div>";

    Array.prototype.forEach.call($("st-heat").querySelectorAll(".hm-tabs button"), function (btn) {
      btn.addEventListener("click", function () {
        activeYear = +btn.getAttribute("data-year");
        renderHeatmap(visible());
      });
    });
  };

  var renderBars = function (list) {
    var secs = activeSections(list);
    var recent = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(nowY, nowM - i, 1);
      recent.push({ y: d.getFullYear(), m: d.getMonth(), per: {}, total: 0 });
    }
    list.forEach(function (p) {
      recent.forEach(function (r) {
        if (r.y === p.y && r.m === p.m) {
          r.per[p.s] = (r.per[p.s] || 0) + 1;
          r.total += 1;
        }
      });
    });
    var barMax = niceMax(Math.max.apply(null, recent.map(function (r) { return r.total; })));
    var bars = recent
      .map(function (r, idx) {
        var tipClass = idx < 2 ? " tip-l" : idx > 9 ? " tip-r" : "";
        var lines = [r.y + "-" + pad(r.m + 1)];
        var segs = "";
        secs.forEach(function (s) {
          var c = r.per[s] || 0;
          if (!c) return;
          lines.push(nameOf(s) + " " + c + " 篇");
          segs += '<div class="bar-seg" style="height:' + (c / r.total) * 100 + "%;background:" + colorOf(s) + '"></div>';
        });
        lines.push("共 " + r.total + " 篇");
        var showYear = idx === 0 || r.m === 0;
        var stack = r.total
          ? '<div class="bar-stack" style="height:' + (r.total / barMax) * 100 + '%">' + segs + "</div>"
          : '<div class="bar-stack zero"></div>';
        return (
          '<div class="bar-col' + tipClass + '" data-tip="' + esc(lines.join("\n")) + '">' +
          '<div class="bar-val">' + (r.total || "") + "</div>" +
          '<div class="bar-track">' + stack + "</div>" +
          '<div class="bar-label">' + (r.m + 1) + "月<em>" + (showYear ? r.y : "") + "</em></div></div>"
        );
      })
      .join("");
    $("st-bars").innerHTML =
      '<div class="st-title" role="heading" aria-level="3"><i class="fa fa-bar-chart"></i>月度发文量<small>最近 12 个月</small></div><div class="bars">' + bars + "</div>";
  };

  var renderLine = function (list) {
    var secs = activeSections(list);
    var monthOf = function (p) {
      return p.y * 12 + p.m;
    };
    var startKey = nowY * 12 + nowM - 11;
    var endKey = nowY * 12 + nowM;
    posts.forEach(function (p) {
      startKey = Math.min(startKey, monthOf(p));
      endKey = Math.max(endKey, monthOf(p));
    });
    var count = endKey - startKey + 1;

    var perMonth = {};
    list.forEach(function (p) {
      var k = monthOf(p) + ":" + p.s;
      perMonth[k] = (perMonth[k] || 0) + 1;
    });

    var series = secs.map(function (s) {
      var acc = 0;
      var values = [];
      for (var k = startKey; k <= endKey; k++) {
        acc += perMonth[k + ":" + s] || 0;
        values.push(acc);
      }
      return { name: nameOf(s), color: colorOf(s), values: values };
    });
    if (secs.length > 1) {
      var tot = 0;
      var tv = [];
      for (var k = startKey; k <= endKey; k++) {
        secs.forEach(function (s) {
          tot += perMonth[k + ":" + s] || 0;
        });
        tv.push(tot);
      }
      series.push({ name: "合计", color: "#7d8590", values: tv, total: true });
    }

    var W = 640, H = 240, L = 36, R = 18, T = 16, B = 30;
    var lineMax = niceMax(list.length);
    var px = function (i) {
      return count === 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (count - 1);
    };
    var py = function (v) {
      return T + (H - T - B) * (1 - v / lineMax);
    };

    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var v = (lineMax / 4) * g;
      var y = py(v).toFixed(1);
      grid += '<line class="ln-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="ln-tick" x="' + (L - 8) + '" y="' + (+y + 4).toFixed(1) + '" text-anchor="end">' + v + "</text>";
    }
    var step = Math.ceil(count / 8);
    var xLabels = "";
    for (var i = 0; i < count; i++) {
      var isLast = i === count - 1;
      if (isLast || (i % step === 0 && count - 1 - i >= step)) {
        var key = startKey + i;
        xLabels += '<text class="ln-tick" x="' + px(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (isLast && count > 1 ? "end" : "middle") + '">' + Math.floor(key / 12) + "-" + pad((key % 12) + 1) + "</text>";
      }
    }

    var paths = "";
    var dots = "";
    series.forEach(function (sr) {
      var pts = sr.values.map(function (val, i) {
        return px(i).toFixed(1) + "," + py(val).toFixed(1);
      });
      var line = "M" + pts.join(" L");
      if (secs.length === 1 || sr.total) {
        paths += '<path class="ln-area" fill="' + sr.color + '" d="' + line + " L" + px(count - 1).toFixed(1) + "," + py(0).toFixed(1) + " L" + px(0).toFixed(1) + "," + py(0).toFixed(1) + ' Z"/>';
      }
      paths += '<path class="ln-line' + (sr.total ? " total" : "") + '" stroke="' + sr.color + '" d="' + line + '"/>';
      sr.values.forEach(function (val, i) {
        var key = startKey + i;
        dots += '<circle class="ln-dot" fill="' + sr.color + '" cx="' + px(i).toFixed(1) + '" cy="' + py(val).toFixed(1) + '" r="3.5"><title>' + Math.floor(key / 12) + "-" + pad((key % 12) + 1) + "：" + esc(sr.name) + "累计 " + val + " 篇</title></circle>";
      });
    });

    var legend = "";
    if (series.length > 1) {
      legend =
        '<div class="hm-foot" style="padding-left:0;justify-content:center">' +
        series
          .map(function (sr) {
            return '<span><i style="display:inline-block;width:14px;height:3px;margin-right:6px;vertical-align:middle;background:' + sr.color + '"></i>' + esc(sr.name) + "</span>";
          })
          .join("") +
        "</div>";
    }

    $("st-line").innerHTML =
      '<div class="st-title" role="heading" aria-level="3"><i class="fa fa-line-chart"></i>累计文章数<small>按月累计</small></div>' +
      '<svg class="line-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="累计文章数折线图">' + grid + paths + dots + xLabels + "</svg>" + legend;
  };

  var renderTags = function (list) {
    var map = {};
    list.forEach(function (p) {
      p.g.forEach(function (name) {
        var e = (map[name] = map[name] || { name: name, total: 0, per: {} });
        e.total += 1;
        e.per[p.s] = (e.per[p.s] || 0) + 1;
      });
    });
    var tags = Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        return b.total - a.total || a.name.localeCompare(b.name, "zh-CN");
      })
      .slice(0, 8);
    var tagMax = tags.length ? tags[0].total : 1;
    var secs = activeSections(list);
    var rows = tags
      .map(function (t) {
        var fills = secs
          .map(function (s) {
            var c = t.per[s] || 0;
            return c ? '<div class="tag-fill" style="width:' + (c / tagMax) * 100 + "%;background:" + colorOf(s) + '" title="' + esc(nameOf(s)) + " " + c + ' 篇"></div>' : "";
          })
          .join("");
        return (
          '<div class="tag-row"><a class="tag-name" href="' + siteRoot + (data.tags[t.name] || "tags/") + '" title="' + esc(t.name) + '"># ' + esc(t.name) + "</a>" +
          '<div class="tag-track">' + fills + '</div><span class="tag-count">' + t.total + "</span></div>"
        );
      })
      .join("");
    $("st-tags").innerHTML =
      '<div class="st-title" role="heading" aria-level="3"><i class="fa fa-tags"></i>标签分布<small>文章数最多的标签</small></div>' +
      (tags.length ? '<div class="tags-list">' + rows + "</div>" : '<div class="st-empty">还没有标签</div>');
  };

  var render = function () {
    var list = visible();
    renderSummary(list);
    renderHeatmap(list);
    renderBars(list);
    renderLine(list);
    renderTags(list);
  };

  var form = rootEl.querySelector(".sec-filter");
  var sync = function () {
    selected = new Set();
    Array.prototype.forEach.call(form.querySelectorAll("input:checked"), function (input) {
      selected.add(+input.getAttribute("data-i"));
    });
    render();
  };
  form.addEventListener("change", sync);
  form.addEventListener("reset", function () {
    setTimeout(sync, 0);
  });

  sync();
})();

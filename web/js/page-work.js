// 工作台（网页版·三栏分段）：左=房间选择台，中=选中房间编辑器，右=另一房间编辑器
// 中/右顶部都有房间选择条（补差价1-9 / 直播间1-3 / 报价成本表 / 电商链接总表新开窗口）
// 中、右互斥：同一房间不能同时出现在中、右。
(function (root) {
  var UI = root.UI, Capy = root.Capy;
  var s = {
    capyEl: null,
    sel: 'bcj-0',    // 中栏当前（'bcj-i'|'live-i'|'prices'）
    rsel: 'live-0'   // 右栏当前
  };

  var KDOCS_URL = 'https://www.kdocs.cn/l/cbDoagWTC3wF';

  function init(container) {
    s.sel = localStorage.getItem('wb_sel') || 'bcj-0';
    s.rsel = localStorage.getItem('wb_rsel') || 'live-0';
    if (s.rsel === s.sel && s.rsel !== 'prices') s.rsel = (s.sel.charAt(0) === 'bcj' ? 'live-0' : 'bcj-0');
    container.innerHTML = '';
    mountCapy();
    renderShell(container);
  }

  function renderShell(container) {
    container.innerHTML =
      '<div class="wb3">' +
        '<div class="wb-left"><div id="wbLeftList"></div></div>' +
        '<div class="wb-divider" data-divider="left"></div>' +
        '<div class="wb-center"><div id="wbCenter"></div></div>' +
        '<div class="wb-divider" data-divider="right"></div>' +
        '<div class="wb-right"><div id="wbRight"></div></div>' +
      '</div>';
    setSplits(container);
    renderLeft(container);
    renderCenter(container);
    renderRight(container);
    bindDividers(container);
  }

  function flexBasis(el, def) { if (!el) return def; var s2 = el.style && el.style.flex; if (!s2) return def; var parts = s2.split(' '); var v = parseFloat(parts[parts.length - 1]); return isNaN(v) ? def : v; }

  // 中/右默认对半分，可拖宽，记忆比例
  function setSplits(container) {
    var wb = container.querySelector('.wb3'); if (!wb) return;
    if (wb.getBoundingClientRect().width < 960) { return; }
    var wbR = wb.querySelector('.wb-right'), wbC = wb.querySelector('.wb-center');
    if (!wbR || !wbC) return;
    var rightPct = parseFloat(localStorage.getItem('wb_right_pct')); if (isNaN(rightPct)) rightPct = 50;
    var total = wb.getBoundingClientRect().width;
    var leftW = flexBasis(wb.querySelector('.wb-left'), 250);
    var avail = Math.max(0, total - leftW - 14);
    // 中/右栏等宽（各 50%），两边配置选择框大小一致、两端吸附、随分界线同步等宽变化
    var half = Math.floor(avail / 2);
    wbR.style.flex = '0 0 ' + Math.max(280, half) + 'px';
    wbC.style.flex = '0 0 ' + Math.max(280, avail - half) + 'px';
  }

  function roomList(kind) { if (kind === 'bcj') { var a = []; for (var i = 0; i < 9; i++) a.push('bcj-' + i); return a; } var b = []; for (var j = 0; j < 3; j++) b.push('live-' + j); return b; }
  function roomLabel(id) { var p = id.split('-'); var k = p[0]; var n = Number(p[1]) + 1; return (k === 'bcj' ? '补差价' : '直播间') + (n === 1 ? '' : ' ' + n); }

  // 房间选择条：补差价1-9 + 直播间1-3 + 报价成本表 + 电商链接总表
  function roomBarHTML(paneSel, otherSel) {
    var bar = '<div class="wb-roombar">';
    ['bcj', 'live'].forEach(function (k) {
      bar += '<div class="r-group"><span class="r-label">' + (k === 'bcj' ? '📋补差价' : '📺直播间') + '</span>';
      roomList(k).forEach(function (id) {
        var on = paneSel === id ? ' on' : '';
        var used = (otherSel === id && paneSel !== id) ? ' used' : '';
        bar += '<button class="wb-roombtn' + on + used + '" data-id="' + id + '">' + roomLabel(id) + '</button>';
      });
      bar += '</div>';
    });
    bar += '<div class="r-group">';
    bar += '<button class="wb-roombtn' + (paneSel === 'prices' ? ' on' : '') + '" data-view="prices">🧮 报价成本表</button>';
    bar += '<button class="wb-roombtn' + (paneSel === 'aftersale' ? ' on' : '') + '" data-view="aftersale">🛠 售后话术</button>';
    bar += '</div>';
    bar += '</div>';
    return bar;
  }

  // ---------------- 左：计算器 + 电源推荐 ----------------
  function renderLeft(container) {
    var list = container.querySelector('#wbLeftList');
    if (root.PageCalc) { root.PageCalc.render(list); return; }
    list.innerHTML = '<div class="m-body">计算器加载中…</div>';
  }

  // 选房间（互斥：对侧若占用则挪到报价成本表）
  function pick(pane, id) {
    if (pane === 'c') { if (s.rsel === id) s.rsel = 'prices'; s.sel = id; localStorage.setItem('wb_sel', s.sel); }
    else { if (s.sel === id) s.sel = 'prices'; s.rsel = id; localStorage.setItem('wb_rsel', s.rsel); }
  }

  // 绑一个专栏的房间条（root = 外层 .wb3，点击后整栏重渲）
  function bindBar(barPane, pane) {
    var root = barPane.closest ? barPane.closest('.wb3') : null;
    var bar = barPane.querySelector('.wb-roombar');
    bar.querySelectorAll('.wb-roombtn[data-id]').forEach(function (b) {
      b.onclick = function () {
        if (b.classList.contains('used')) { UI.toast('该房间已在另一列打开，请换一个'); return; }
        pick(pane, b.dataset.id); renderAll(root || barPane);
      };
    });
    bar.querySelectorAll('.wb-roombtn[data-view="prices"]').forEach(function (b) {
      b.onclick = function () { if (pane === 'c') { s.sel = 'prices'; localStorage.setItem('wb_sel', s.sel); } else { s.rsel = 'prices'; localStorage.setItem('wb_rsel', s.rsel); } renderAll(root || barPane); };
    });
    bar.querySelectorAll('.wb-roombtn[data-view="aftersale"]').forEach(function (b) {
      b.onclick = function () { if (pane === 'c') { s.sel = 'aftersale'; localStorage.setItem('wb_sel', s.sel); } else { s.rsel = 'aftersale'; localStorage.setItem('wb_rsel', s.rsel); } renderAll(root || barPane); };
    });
  }

  function mountEditor(pane, body, id) {
    body.className = ''; body.classList.add(pane === 'c' ? 'is-c' : 'is-r');
    if (id === 'prices') { root.PagePrices.init(body); return; }
    if (id === 'aftersale') { if (root.PageAftersale) root.PageAftersale.init(body); return; }
    var parts = id.split('-'); var kind = parts[0], idx = Number(parts[1]);
    if (kind === 'bcj') {
      var name = (pane === 'r' ? '右 · ' : '') + (idx === 0 ? '补差价' : '补差价 ' + (idx + 1));
      root.PageBuchajia.create({ name: name }).init(body, name);
    } else {
      var name2 = (pane === 'r' ? '右 · ' : '') + (idx === 0 ? '直播间' : '直播间 ' + (idx + 1));
      root.PageLive.create({ name: name2 }).init(body, name2);
    }
  }

  // ---------------- 中 / 右 ----------------
  function renderCenter(container) {
    var c = container.querySelector('#wbCenter');
    c.innerHTML = roomBarHTML(s.sel, s.rsel) + '<div id="wcBody"></div>';
    bindBar(c, 'c');
    mountEditor('c', c.querySelector('#wcBody'), s.sel);
  }
  function renderRight(container) {
    var c = container.querySelector('#wbRight');
    c.innerHTML = roomBarHTML(s.rsel, s.sel) + '<div id="wrBody"></div>';
    bindBar(c, 'r');
    mountEditor('r', c.querySelector('#wrBody'), s.rsel);
  }

  function renderAll(container) { renderLeft(container); renderCenter(container); renderRight(container); }

  // ---------------- 可拖分隔条 ----------------
  function bindDividers(container) {
    container.querySelectorAll('.wb-divider').forEach(function (d) {
      var which = d.dataset.divider;
      d.onmousedown = function (e) {
        e.preventDefault();
        var wb = container.querySelector('.wb3'); if (!wb) return;
        var left = wb.querySelector('.wb-left');
        var right = wb.querySelector('.wb-right');
        // 记下拖起时左/右栏【初始】宽度，mousemove 用 初始±位移，精确跟手
        window._wbDrag = {
          which: which, x0: e.clientX,
          l0: left ? left.getBoundingClientRect().width : 250,
          r0: right ? right.getBoundingClientRect().width : 0
        };
        document.body.style.cursor = 'col-resize';
      };
    });
    document.onmousemove = function (e) {
      if (!window._wbDrag) return;
      var wb = document.querySelector('.wb3'); if (!wb) return;
      if (wb.getBoundingClientRect().width < 960) { return; }
      var d = window._wbDrag, dx = e.clientX - d.x0;   // 指针相对起点的位移
      if (d.which === 'left') {
        // 左栏宽度 = 初始 + 位移（190~380）
        var lw = Math.max(190, Math.min(380, d.l0 + dx));
        wb.querySelector('.wb-left').style.flex = '0 0 ' + lw + 'px';
      } else {
        // 中↔右：向右拖 dx>0 → 右栏变窄、中栏变宽；右栏宽 = 初始 - 位移（跟手）
        var wbR = wb.querySelector('.wb-right'), wbC = wb.querySelector('.wb-center');
        if (!wbR || !wbC) return;
        var totalW = wb.getBoundingClientRect().width;
        var leftW = wb.querySelector('.wb-left') ? wb.querySelector('.wb-left').getBoundingClientRect().width : 250;
        var avail = Math.max(0, totalW - leftW - 14);
        var rMin = 280, rMax = Math.max(rMin, avail - rMin);
        var r0 = d.r0 > 0 ? d.r0 : Math.min(rMax, avail / 2);
        var rightW = Math.max(rMin, Math.min(rMax, r0 - dx));
        wbR.style.flex = '0 0 ' + rightW + 'px';
        wbC.style.flex = '1 1 ' + (avail - rightW) + 'px';
        try { if (avail > 0) localStorage.setItem('wb_right_pct', String(Math.round(rightW / avail * 100))); } catch (err) {}
      }
    };
    document.onmouseup = function () { if (window._wbDrag) { window._wbDrag = null; document.body.style.cursor = ''; } };
  }

  // ---------------- 噜噜 ----------------
  function mountCapy() {
    if (s.capyEl) return;
    var capy = Capy.getCurrent();
    var el = document.createElement('div');
    el.className = 'capy'; el.id = 'capyEl';
    document.body.appendChild(el);
    s.capyEl = el;
    try { var p = JSON.parse(localStorage.getItem('capyPos')); if (p) { el.style.left = p.left; el.style.bottom = p.bottom; } } catch (e) {}
    var show = localStorage.getItem('capyShow') !== 'false';
    var opacity = Number(localStorage.getItem('capyOpacity') || 1);
    var size = Number(localStorage.getItem('capySize') || 1);
    Capy.apply(el, capy, show, opacity, size);
    Capy.attachDrag(el);
    root._capyReapply = function () { var c2 = Capy.getCurrent(); Capy.apply(s.capyEl, c2, true, Number(localStorage.getItem('capyOpacity') || 1), Number(localStorage.getItem('capySize') || 1)); s.capyEl.title = c2.name; };
  }

  function toggleCapy() {
    if (!s.capyEl) return;
    var show = s.capyEl.style.display !== 'none';
    s.capyEl.style.display = show ? 'none' : 'block';
    localStorage.setItem('capyShow', show ? 'false' : 'true');
    // 更新顶栏按钮文字：显示时=隐藏噜噜，隐藏时=召唤噜噜
    var cb = document.getElementById('btnToggleCapy');
    if (cb) { cb.textContent = show ? '隐藏噜噜' : '召唤噜噜'; cb.title = show ? '点击召唤噜噜' : '点击隐藏噜噜'; }
  }

  root.PageWork = {
    init: init,
    render: function (c) {
      var wb = c && c.classList && c.classList.contains('wb3') ? c : (c && c.querySelector ? c.querySelector('.wb3') : null);
      if (wb) renderAll(wb);
    },
    openSel: function (id) { s.sel = id; localStorage.setItem('wb_sel', s.sel); var c = document.querySelector('.wb3'); if (c) renderAll(c); },
    refreshList: function () { var c = document.querySelector('.wb3'); if (c) renderLeft(c); },
    toggleCapy: toggleCapy
  };
})(typeof self !== 'undefined' ? self : this);

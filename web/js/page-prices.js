// 报价成本表页（网页版）：搜索框常驻不重建（避免光标跳走），只刷新结果区
(function (root) {
  var E = root.ENGINE, UI = root.UI;
  var CATS = [['san','三大件'],['re','散热'],['ban','主板'],['ka','显卡'],['yuan','电源'],['xiang','机箱']];
  var s = { cur: 0, kw: '' };
  function isJunk(name) {
    if (!name) return true;
    // 不按纯数字过滤（原来表格 B 列是什么就显示什么）；只跳真正的表头垃圾
    if (/更新日期|返回|菜单/.test(name)) return true;
    return false;
  }
  function init(container) {
    container.innerHTML = '';
    container.innerHTML =
      '<div class="pagehead"><div class="ph-title">报价成本表</div><div class="ph-sub">6 大分类 · 边输边搜 · 未税/含税/展示/零售 四价</div></div>' +
      '<div class="card"><div class="catbtns" id="pCatBtns"></div>' +
      '<div class="schbar"><input id="kw" class="sel" placeholder="输入型号搜索…" value="' + UI.esc(s.kw) + '" autocomplete="off"></div>' +
      '<div id="pRes"></div>' +
      '</div>';
    // 分类 tab（常驻）
    var box = container.querySelector('#pCatBtns');
    var b = '';
    CATS.forEach(function (c, i) { b += '<button class="catbtn' + (i === s.cur ? ' on' : '') + '" data-i="' + i + '">' + c[1] + '</button>'; });
    box.innerHTML = b;
    box.querySelectorAll('.catbtn').forEach(function (x) {
      x.onclick = function () { s.cur = Number(x.dataset.i); s.kw = ''; var k = container.querySelector('#kw'); if (k) { k.value = ''; k.focus(); } paintCat(); paintRes(container); };
    });
    // 搜索框（常驻，只更新结果区）
    var kw = container.querySelector('#kw');
    kw.oninput = function () { s.kw = kw.value; if (s._t) clearTimeout(s._t); s._t = setTimeout(function () { paintRes(container); }, 200); };
    paintRes(container);
  }
  function paintCat() {
    var box = document.querySelector('#pCatBtns'); if (!box) return;
    var b = '';
    CATS.forEach(function (c, i) { b += '<button class="catbtn' + (i === s.cur ? ' on' : '') + '" data-i="' + i + '">' + c[1] + '</button>'; });
    box.innerHTML = b;
  }
  function filter(map) {
    var kw = (s.kw || '').trim().toLowerCase();
    var out = [];
    for (var name in map) {
      if (isJunk(name)) continue;
      if (kw && name.toLowerCase().indexOf(kw) < 0) continue;
      var p = map[name];
      out.push({ name: name, c: Math.round(p.c || 0), d: Math.round(p.d || 0), e: Math.round(p.e || 0), f: Math.round(p.f || 0) });
    }
    out.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }); });
    return out;
  }
  function paintRes(container) {
    var res = container.querySelector('#pRes'); if (!res) return;
    var map = E.dataPriceTable(CATS[s.cur][0]) || {};
    var items = filter(map);
    var h = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>型号</th><th class="num" style="width:90px">未税(C)</th><th class="num" style="width:90px">含税(D)</th><th class="num" style="width:90px">展示(E)</th><th class="num" style="width:90px">零售(F)</th></tr></thead><tbody>';
    items.forEach(function (it) {
      h += '<tr class="pitem"><td class="name" title="' + UI.esc(it.name) + '">' + UI.esc(it.name) + '</td>' +
           '<td class="num">' + it.c + '</td><td class="num">' + it.d + '</td>' +
           '<td class="num">' + it.e + '</td>' +
           '<td class="num ' + (it.f ? 'price-f' : 'price-0') + '">' + (it.f || '—') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="count">共 ' + items.length + ' 条</div>';
    res.innerHTML = h;
  }
  root.PagePrices = { init: init, render: function (c) { if (c) paintRes(c); } };
})(typeof self !== 'undefined' ? self : this);

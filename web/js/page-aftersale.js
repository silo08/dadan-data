// 售后话术页（网页版）：问题/解答话术 + 商品/视频链接（点链接复制，可直接粘到抖音商城/拼多多聊天）
(function (root) {
  var E = root.ENGINE, UI = root.UI;
  var s = { kw: '' };
  function data() {
    var d = (E && E.getData) ? E.getData() : (root.DSHDATA || {});
    return (d && d.aftersale) || [];
  }
  function init(container) {
    container.innerHTML =
      '<div class="pagehead"><div class="ph-title">售后话术</div><div class="ph-sub">问题/解答话术 · 点「复制」把链接粘到抖音商城/拼多多</div></div>' +
      '<div class="card"><div class="schbar"><input id="kw" class="sel" placeholder="搜索 编码/目录/话术/链接…" value="' + UI.esc(s.kw) + '" autocomplete="off"></div><div id="afRes"></div></div>';
    var kw = container.querySelector('#kw');
    if (kw) kw.oninput = function () { s.kw = kw.value; if (s._t) clearTimeout(s._t); s._t = setTimeout(function () { paint(container); }, 200); };
    paint(container);
  }
  function filter() {
    var tokens = (s.kw || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    var all = data();
    if (!tokens.length) return all;
    return all.filter(function (it) {
      var hay = (String(it.code || '') + ' ' + String(it.cat || '') + ' ' + String(it.script || '') + ' ' + String(it.prodLinks || '') + ' ' + String(it.bili || '') + ' ' + String(it.douyin || '') + ' ' + (it.extra || []).join(' ')).toLowerCase();
      return tokens.every(function (t) { return hay.indexOf(t) >= 0; });   // 多关键词：每个词都要命中
    });
  }
  function linkChip(label, url) {
    if (!url) return '';
    return '<button class="chip vc afchip" data-copy="' + UI.esc(url) + '" data-l="' + label + '">' + label + ' · 复制</button>';
  }
  function paint(container) {
    var res = container.querySelector('#afRes'); if (!res) return;
    var items = filter();
    var h = '';
    items.forEach(function (it) {
      h += '<div class="afcard">';
      h += '<div class="af-cat">' + UI.esc(it.cat || '') + (it.code ? '（' + it.code + '）' : '') + '</div>';
      h += '<div class="af-script">' + UI.esc(it.script || '') + '</div>';
      h += '<div class="af-links">' + linkChip('商品链接', it.prodLinks) + linkChip('B站视频', it.bili) + linkChip('抖音视频', it.douyin) + '</div>';
      h += '</div>';
    });
    if (!items.length) h += '<div class="count">' + (data().length ? '无匹配，换个关键词' : '暂无售后话术（先同步数据后再看）') + '</div>';
    res.innerHTML = h;
    res.querySelectorAll('[data-copy]').forEach(function (b) {
      b.onclick = function () { UI.copyText(b.dataset.copy, b.dataset.l); };
    });
  }
  root.PageAftersale = { init: init, render: function (c) { if (c) paint(c); } };
})(typeof self !== 'undefined' ? self : this);

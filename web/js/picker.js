// 锚定建议浮层（网页版·单例）：由外部委托驱动 ——
//   Picker.open(input, spec)  在 input 下方弹建议浮层（锚定、宽度随 input/视口）
//   Picker.refresh(input, spec) 用当前 input.value 重新计算建议（供 oninput 用）
//   Picker.close()            关闭
// spec: { title, source(kw)→[{key,name,sub?}], onPick(key), currentKey?, emptyText? }
// 关键：浮层不与某次渲染的 input 绑定引用，查找依赖事件委托传入的当前 input。
(function (root) {
  var MIN_W = 420, MAX_H = 480;

  function pop() { return document.getElementById('pickerPop'); }
  function active() { return root._picker; }

  function ensurePop() {
    var el = pop();
    if (!el) { el = document.createElement('div'); el.id = 'pickerPop'; document.body.appendChild(el); }
    return el;
  }

  function close() {
    var el = pop();
    if (el) el.style.display = 'none';
    root._picker = null;
  }

  function open(input, spec) {
    spec = spec || {};
    var el = ensurePop();
    var h = '<div class="pop-head"><span class="pop-title">' + UI.esc(spec.title || '选择') + '</span><button class="pop-x" data-close aria-label="关闭">×</button></div>';
    h += '<div class="pop-list" id="pkList"></div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = close; });
    root._picker = { input: input, spec: spec, query: input ? input.value : '' };
    refresh(input, spec);
    positionPop(input);
    el.style.display = 'block';
  }

  // 用当前 input.value 刷新建议（输入时调用，不重绘业务层）
  function refresh(input, spec) {
    var p = active();
    if (!p || p.input !== input) {
      // 浮层已关/切到别的 input：用当前 input+spec 重新弹出（解决"删除后输入失效"）
      if (input && spec) { open(input, spec); }
      return;
    }
    if (spec) { p.spec = spec; }
    var list = document.getElementById('pkList'); if (!list) return;
    var kw = (p.input ? p.input.value : '') || '';
    var shown = p.spec.source ? p.spec.source(kw) : (p.spec.options || []);
    var spec2 = p.spec;
    var h = '';
    (shown || []).forEach(function (it, idx) {
      var on = it.key === spec2.currentKey ? ' on' : '';
      h += '<div class="pk-it' + on + '" data-i="' + idx + '">';
      if (it.sub) h += '<div class="pk-sub">' + UI.esc(it.sub) + '</div>';
      h += '<div class="pk-name">' + UI.esc(it.name) + '</div>';
      h += '</div>';
    });
    if (!shown || !shown.length) h += '<div class="pk-empty">' + UI.esc(spec2.emptyText || '无匹配，可继续输入') + '</div>';
    list.innerHTML = h;
    list.querySelectorAll('.pk-it').forEach(function (el) {
      el.onmousedown = function (e) { e.preventDefault(); };   // 阻止 input blur
      el.onclick = function (e) {
        e.stopPropagation();
        var it = (shown || [])[Number(el.dataset.i)];
        if (it && spec2.onPick) { spec2.onPick(it.key); }
        close();
      };
    });
  }

  function positionPop(input) {
    var el = pop(); if (!el) return;
    if (!input || !input.getBoundingClientRect) { el.style.display='none'; return; }
    var r = input.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var w = Math.max(r.width, MIN_W); w = Math.min(w, vw - 16);
    var left = r.left; if (left + w > vw) left = Math.max(8, vw - w - 8);
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var top = r.bottom + 6;
    el.style.width = w + 'px';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.maxHeight = Math.min(MAX_H, vh - top - 12) + 'px';
  }

  // 外部点击 / Esc 关闭
  document.addEventListener('mousedown', function (e) {
    if (!active()) return;
    var el = pop();
    if (el && !el.contains(e.target) && e.target !== (active().input || null)) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!active()) return;
    if (e.key === 'Escape') close();
  });

  root.Picker = { open: open, refresh: refresh, close: close, position: positionPop };
})(typeof self !== 'undefined' ? self : this);

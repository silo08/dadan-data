// 左栏：Windows 风格四则计算器 + 电源推荐（选 CPU + 显卡 → 直接显示推荐电源瓦数）
// 公式：推荐瓦数 = CPU峰值功耗 + 显卡峰值功耗 + (显卡型号含'RTX' ? 150 : 250)
(function (root) {
  var E = root.ENGINE, UI = root.UI, Picker = root.Picker;

  // 键盘监听器引用（避免每次 render 叠加，导致一次按键触发多次）
  var _kb = null;

  // ---------- 计算器状态 ----------
  var cur = '0', prev = '', op = '', fresh = false, hist = '';
  function calc(a, b, o) {
    a = parseFloat(a); b = parseFloat(b);
    if (o === '+') return a + b; if (o === '-') return a - b;
    if (o === '*') return a * b; if (o === '/') return b ? a / b : 0;
    return b;
  }
  function fmt(x) { if (typeof x === 'string') return x; if (!isFinite(x)) return '错误'; var s = String(Math.round(x * 1e10) / 1e10); if (s.indexOf('.') >= 0) s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); return s.length > 14 ? x.toPrecision(12).replace(/0+$/, '') : s; }
  function setDisp(el, v) { cur = v; if (el) el.textContent = fmt(cur); }
  function press(elDisp, elHist, key) {
    if (/[0-9]/.test(key)) { if (fresh) { cur = key; fresh = false; } else { cur = (cur === '0') ? key : cur + key; } }
    else if (key === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (cur.indexOf('.') < 0) cur += '.'; }
    else if (key === 'C') { cur = '0'; prev = ''; op = ''; hist = ''; fresh = false; }
    else if (key === 'CE') { cur = '0'; }
    else if (key === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
    else if (key === '±') { cur = cur.charAt(0) === '-' ? cur.slice(1) : (cur !== '0' ? '-' + cur : cur); }
    else if (key === '%') { if (op && prev !== '') { cur = fmt(parseFloat(prev) * parseFloat(cur) / 100); fresh = true; } }
    else if (key === '+' || key === '-' || key === '*' || key === '/') {
      if (op && prev !== '' && !fresh) { var r = calc(prev, cur, op); hist = fmt(prev) + op + fmt(cur) + '='; setDisp(elDisp, String(r)); prev = String(r); }
      else { prev = cur; }
      op = key; fresh = true;
    } else if (key === '=') {
      if (op && prev !== '') { var r2 = calc(prev, cur, op); hist = fmt(prev) + op + fmt(cur) + '='; setDisp(elDisp, String(r2)); prev = ''; op = ''; fresh = true; }
      else if (cur) { hist = ''; }
    }
    if (elDisp) elDisp.textContent = fmt(cur);
    if (elHist) elHist.textContent = hist || '';
  }

  function data() { return (E && E.getData) ? E.getData() : (root.DSHDATA || {}); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

  // ---------- 电源推荐 render ----------
  function powHTML() {
    return '<div class="card" style="margin-top:14px"><div class="card-title"><span class="tag">电源</span>按功耗推荐</div>' +
      '<div class="pw-field"><div class="fw">CPU</div><input id="pwCpu" class="sel" placeholder="输入/选CPU型号" autocomplete="off"></div>' +
      '<div class="pw-field"><div class="fw">显卡</div><input id="pwGpu" class="sel" placeholder="输入/选显卡型号" autocomplete="off"></div>' +
      '<div id="pwRes" style="margin-top:12px;font-size:16px;font-weight:800;color:#3f9d4a;text-align:center;min-height:24px">—</div>' +
      '<div class="pw-hint" style="font-size:11px;color:var(--mut);margin-top:4px;text-align:center">选好 CPU 和显卡会自动计算推荐电源</div>' +
      '</div>';
  }
  function bindPow(container) {
    var c = document.getElementById('pwCpu'), g = document.getElementById('pwGpu'), res = document.getElementById('pwRes');
    var cpuPick = function (name) { if (c) c.value = name; calcPow(c, g, res); };
    var gpuPick = function (name) { if (g) g.value = name; calcPow(c, g, res); };
    var cpuSpec = {
      title: '选择CPU', emptyText: '无匹配，可继续输入',
      source: function (kw) {
        var D = data(); var t = (kw || '').trim().toLowerCase(); var out = [];
        (D.cpuPower || []).forEach(function (r) { var n = r.model || ''; if (!n) return; if (t && n.toLowerCase().indexOf(t) < 0) return; out.push({ key: n, name: n, sub: (r.d ? 'TDP ' + r.d : '') + ' / 峰值' + (r.peak || '') }); });
        return out;
      },
      onPick: cpuPick
    };
    var gpuSpec = {
      title: '选择显卡', emptyText: '无匹配，可继续输入',
      source: function (kw) {
        var D = data(); var t = (kw || '').trim().toLowerCase(); var out = [];
        (D.gpuPower || []).forEach(function (r) { var n = r.model || ''; if (!n) return; if (t && n.toLowerCase().indexOf(t) < 0) return; out.push({ key: n, name: n, sub: (r.d ? 'TGP ' + r.d : '') + ' / 峰值' + (r.peak || '') }); });
        return out;
      },
      onPick: gpuPick
    };
    if (c) { c.onfocus = function () { Picker.open(c, cpuSpec); }; c.oninput = function () { Picker.refresh(c, cpuSpec); }; c.onblur = function () { setTimeout(function () { Picker.close(); }, 160); }; }
    if (g) { g.onfocus = function () { Picker.open(g, gpuSpec); }; g.oninput = function () { Picker.refresh(g, gpuSpec); }; g.onblur = function () { setTimeout(function () { Picker.close(); }, 160); }; }
  }
  function calcPow(c, g, res) {
    if (!c || !g || !res) return;
    var D = data(); var cmap = {}, gmap = {};
    (D.cpuPower || []).forEach(function (r) { if (r.model) cmap[r.model] = r; });
    (D.gpuPower || []).forEach(function (r) { if (r.model) gmap[r.model] = r; });
    var cn = (c.value || '').trim(), gn = (g.value || '').trim();
    if (!cn || !gn) { res.textContent = '—'; return; }
    var cpow = num((cmap[cn] || {}).peak), gpow = num((gmap[gn] || {}).peak);
    var extra = gn.indexOf('RTX') >= 0 ? 150 : 250;
    var w = Math.round(cpow + gpow + extra);
    res.textContent = '推荐 ≥ ' + w + 'W 电源';
  }

  // ---------- 渲染到左栏 ----------
  function render(el) {
    if (!el) return;
    var h = '<div class="calc-card"><div class="calc-title">🧮 计算器</div>' +
      '<div class="calc-disp"><div class="calc-hist" id="calcHist">&nbsp;</div><div class="calc-cur" id="calcCur">0</div></div>' +
      '<div class="calc-grid">' +
      '<button class="ck ck-fn" data-k="C">C</button><button class="ck ck-fn" data-k="⌫">⌫</button><button class="ck ck-fn" data-k="%">%</button><button class="ck ck-op" data-k="/">÷</button>' +
      '<button class="ck" data-k="7">7</button><button class="ck" data-k="8">8</button><button class="ck" data-k="9">9</button><button class="ck ck-op" data-k="*">×</button>' +
      '<button class="ck" data-k="4">4</button><button class="ck" data-k="5">5</button><button class="ck" data-k="6">6</button><button class="ck ck-op" data-k="-">−</button>' +
      '<button class="ck" data-k="1">1</button><button class="ck" data-k="2">2</button><button class="ck" data-k="3">3</button><button class="ck ck-op" data-k="+">+</button>' +
      '<button class="ck" data-k="±">±</button><button class="ck" data-k="0">0</button><button class="ck" data-k=".">.</button><button class="ck ck-eq" data-k="=">=</button>' +
      '</div></div>';
    h += powHTML();
    el.innerHTML = h;
    var curEl = document.getElementById('calcCur'), histEl = document.getElementById('calcHist');
    el.querySelectorAll('.ck').forEach(function (b) { b.onclick = function () { press(curEl, histEl, b.dataset.k); }; });
    bindPow(el);
    // 键盘映射：数字/运算符/回车/退格 映射到计算器按键（先移除旧监听器，避免叠加重复触发）
    function keyMap(key) {
      if (/^[0-9]$/.test(key)) return key;
      if (key === '.') return '.';
      if (key === '+') return '+'; if (key === '-') return '-'; if (key === '*') return '*'; if (key === '/') return '/';
      if (key === '%') return '%';
      if (key === 'Enter' || key === '=') return '=';
      if (key === 'Backspace') return '⌫';
      if (key === 'Escape' || key === 'c' || key === 'C') return 'C';
      if (key === 'Delete') return 'CE';
      return null;
    }
    if (_kb) document.removeEventListener('keydown', _kb);
    var handler = function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      var k = keyMap(e.key);
      if (k) { e.preventDefault(); press(curEl, histEl, k); }
    };
    _kb = handler;
    document.addEventListener('keydown', handler);
  }

  root.PageCalc = { render: render, calcPow: calcPow };
})(typeof self !== 'undefined' ? self : this);

// 噜噜（跳舞水豚）网页版：移植 小程序 utils/capy.js + index 的雪碧图动画/拖动/滑块/L1-10
// 轮播 v3：每天 0 点换 1 个，一轮 10 个各一天；主账号选 L → 全体噜噜变 + 重排开新轮（当天=所选 + 随机剩 9）
// 与小程序 utils/capy.js 的 round+startDay 逻辑一致（网页版存 localStorage，无云端，全用户同机共享）。
(function (root) {
  var SET = {
    lulu1:  { url: 'https://silo08.github.io/dadan-data/lulu1-sprite.png',  w: 76,  h: 105, W: 87,  H: 120, F: 305, totalW: 26535, dur: 10.18 },
    lulu2:  { url: 'https://silo08.github.io/dadan-data/lulu2-sprite.png',  w: 119, h: 105, W: 136, H: 120, F: 263, totalW: 35768, dur: 8.77 },
    lulu3:  { url: 'https://silo08.github.io/dadan-data/lulu3-sprite.png',  w: 100, h: 105, W: 114, H: 120, F: 392, totalW: 44688, dur: 13.07 },
    lulu4:  { url: 'https://silo08.github.io/dadan-data/lulu4-sprite.png',  w: 79,  h: 105, W: 90,  H: 120, F: 398, totalW: 35820, dur: 13.27 },
    lulu5:  { url: 'https://silo08.github.io/dadan-data/lulu5-sprite.png',  w: 99,  h: 105, W: 113, H: 120, F: 368, totalW: 41584, dur: 12.27 },
    lulu6:  { url: 'https://silo08.github.io/dadan-data/lulu6-sprite.png',  w: 97,  h: 105, W: 111, H: 120, F: 262, totalW: 29082, dur: 8.73 },
    lulu7:  { url: 'https://silo08.github.io/dadan-data/lulu7-sprite.png',  w: 81,  h: 105, W: 92,  H: 120, F: 362, totalW: 33304, dur: 12.07 },
    lulu8:  { url: 'https://silo08.github.io/dadan-data/lulu8-sprite.png',  w: 81,  h: 105, W: 93,  H: 120, F: 241, totalW: 22413, dur: 8.03 },
    lulu9:  { url: 'https://silo08.github.io/dadan-data/lulu9-sprite.png',  w: 108, h: 105, W: 123, H: 120, F: 319, totalW: 39237, dur: 10.63 },
    lulu10: { url: 'https://silo08.github.io/dadan-data/lulu10-sprite.png', w: 98,  h: 105, W: 112, H: 120, F: 243, totalW: 27216, dur: 8.10 }
  };

  function _shuffle(a) { var r = a.slice(); for (var i = r.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = r[i]; r[i] = r[j]; r[j] = t; } return r; }

  function loadRound() { try { var v = JSON.parse(localStorage.getItem('capyRound') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveRound(round, startDay) {
    try { localStorage.setItem('capyRound', JSON.stringify(round)); localStorage.setItem('capyRoundDay', String(startDay)); } catch (e) {}
  }
  // 当前轮与今天对应的下标（0-9）；无记录则生成随机轮（今天为起点）
  function roundInfo() {
    var today = Math.floor(Date.now() / 86400000);
    var round = loadRound();
    var startDay = Number(localStorage.getItem('capyRoundDay') || 0) || 0;
    if (!round || !round.length) { round = _shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); startDay = today; saveRound(round, startDay); }
    var idx = ((today - startDay) % 10 + 10) % 10;
    return { round: round, idx: idx, startDay: startDay, today: today };
  }

  function currentName() {
    // 本机预览覆盖（管理员/个人 L1-10 临时切换）：不缓即清，优先级最高
    var dev = localStorage.getItem('capyDevIdx');
    if (typeof dev === 'string' && !isNaN(Number(dev))) {
      var n = Math.floor(Number(dev));
      if (n >= 0 && n <= 9) return 'lulu' + (n + 1);
    }
    // 全局轮排：每天 0 点换 1 个，一轮 10 个各一天
    var info = roundInfo();
    var which = info.round[info.idx] || info.round[0] || 1;
    return 'lulu' + which;
  }

  function getCurrent() {
    var name = currentName();
    var c = SET[name] || SET.lulu1;
    // 雪碧图地址：默认本文件夹 images/(自包含，离线可用)；部署时可被 DSH_WEB.luluBase 覆盖(指向国内数据源)；空则用 images/
    var base = (root.DSH_WEB && root.DSH_WEB.luluBase) || 'images/';
    return { name: name, url: base.replace(/\/?$/, '/') + name + '-sprite.png', w: c.w, h: c.h, W: c.W, H: c.H, F: c.F, totalW: c.totalW, dur: c.dur };
  }

  // 主账号选 L → 开新轮（当天=所选，其余 9 个随机重排），存 localStorage（全用户同机同步）
  function setCapyGlobal(n) {
    var nn = Number(n);
    if (!(nn >= 1 && nn <= 10)) return { ok: false, msg: '无效噜噜编号' };
    var others = [];
    for (var i = 1; i <= 10; i++) if (i !== nn) others.push(i);
    var round = [nn].concat(_shuffle(others));
    var today = Math.floor(Date.now() / 86400000);
    saveRound(round, today);
    localStorage.removeItem('capyDevIdx'); // 全局切换，清本机预览
    return { ok: true, round: round, startDay: today, today: today };
  }

  // 主账号「下一个全局+1」：等效提前过一天，今天换成轮里的下一个
  function nextGlobal() {
    var info = roundInfo();
    var nextIdx = (info.idx + 1) % 10;
    var startDay = info.today - nextIdx; // 使 (today - startDay) % 10 = nextIdx
    saveRound(info.round, startDay);
    localStorage.removeItem('capyDevIdx');
    return { ok: true, name: 'lulu' + (info.round[nextIdx] || 1) };
  }

  function getRoundInfo() {
    var info = roundInfo();
    return { round: info.round.slice(), idx: info.idx, startDay: info.startDay, today: info.today, name: 'lulu' + (info.round[info.idx] || 1) };
  }

  var capyState = null; // { left, bottom, dragging }

  function apply(el, c, show, opacity, size) {
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
    var sc = c.w / c.W; // 缩放对齐（背景尺寸、负位移一致）
    el.style.width = c.w * size + 'px';
    el.style.height = c.h * size + 'px';
    el.style.backgroundImage = 'url(' + c.url + ')';
    el.style.backgroundSize = (c.totalW * sc * size) + 'px ' + (c.H * sc * size) + 'px';
    el.style.backgroundPosition = '0 0';
    el.style.opacity = opacity;
    el.style.animation = 'none';
    el.style.backgroundRepeat = 'no-repeat';
    startSteps(el, c, sc, size);
  }

  var _raf = null;
  function startSteps(el, c, sc, size) {
    if (_raf) cancelAnimationFrame(_raf);
    var F = c.F, W = c.totalW * sc * size;
    var t0 = performance.now(), durMs = c.dur * 1000;
    function tick(now) {
      var f = Math.floor(((now - t0) / durMs) * F) % F;
      el.style.backgroundPosition = (-(f * W / F)) + 'px 0';
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);
  }

  // 注入噜噜控制面板 HTML 并绑定。
  // opts.admin=true → 主账号全局切换（10 个按钮选噜噜 → setCapyGlobal）；否则个人 L1-10 预览。
  function renderPanel(container, opts) {
    opts = opts || {};
    var info = getRoundInfo();
    var dev = localStorage.getItem('capyDevIdx');
    var devN = (dev != null && !isNaN(Number(dev))) ? (Math.floor(Number(dev)) + 1) : 0;
    var curIdx = opts.admin ? Number(info.name.replace('lulu', '')) : devN;
    var h = '<div class="capy-panel">';
    h += '<div class="cp-row"><span class="cp-label">噜噜</span><button class="btn sm" id="cpPrev">上一个</button><button class="btn sm" id="cpNext">下一个(全局+1)</button><button class="btn sm" id="cpClear">清除预览</button></div>';
    h += '<div class="cp-lus" id="cpLus"></div>';
    h += '<div class="cp-slider"><span class="cp-label">透明度</span><input type="range" id="cpO" min="10" max="100" value="100"><span class="cp-val" id="cpOv">100%</span></div>';
    h += '<div class="cp-slider"><span class="cp-label">大小</span><input type="range" id="cpS" min="30" max="200" value="100"><span class="cp-val" id="cpSv">100%</span></div>';
    h += '</div>';
    container.innerHTML = h;
    // L1-10 按钮
    var lus = document.getElementById('cpLus');
    var lh = '';
    for (var i = 1; i <= 10; i++) {
      var on = curIdx === i ? ' on' : '';
      lh += '<button class="btn sm cp-lu' + on + '" data-n="' + i + '">L' + i + '</button>';
    }
    lus.innerHTML = lh;
    lus.querySelectorAll('.cp-lu').forEach(function (b) {
      b.onclick = function () {
        var n = Number(b.dataset.n);
        if (opts.admin) {
          var r = setCapyGlobal(n);
          if (r.ok) { UI.toast('已设为全噜噜 ' + n + ' 号，重排新轮'); opts.onSwitch && opts.onSwitch(); }
        } else {
          setDeviceCapy(n);
          localStorage.setItem('capyDev', String(n));
          opts.onSwitch && opts.onSwitch();
        }
      };
    });
    // 滑块
    var o = document.getElementById('cpO'), ov = document.getElementById('cpOv');
    o.oninput = function () { ov.textContent = o.value + '%'; opts.onOpacity && opts.onOpacity(Number(o.value) / 100); };
    var s = document.getElementById('cpS'), sv = document.getElementById('cpSv');
    s.oninput = function () { sv.textContent = s.value + '%'; opts.onSize && opts.onSize(Number(s.value) / 100); };
    document.getElementById('cpPrev').onclick = function () { var c = getCurrent(); var idx = Number(c.name.replace('lulu', '')); var p = ((idx + 8) % 10) + 1; if (opts.admin) { setCapyGlobal(p); UI.toast('已设为全噜噜 ' + p + ' 号'); } else { setDeviceCapy(p); localStorage.setItem('capyDev', String(p)); } opts.onSwitch && opts.onSwitch(); };
    document.getElementById('cpNext').onclick = function () {
      if (opts.admin) { var r0 = nextGlobal(); UI.toast('全局噜噜+1（第' + Number(r0.name.replace('lulu', '')) + '号）'); }
      else { var c = getCurrent(); var idx = Number(c.name.replace('lulu', '')); var nx = (idx % 10) + 1; setDeviceCapy(nx); localStorage.setItem('capyDev', String(nx)); UI.toast('预览第 ' + nx + ' 号'); }
      opts.onSwitch && opts.onSwitch();
    };
    document.getElementById('cpClear').onclick = function () { setDeviceCapy(null); localStorage.removeItem('capyDev'); opts.onSwitch && opts.onSwitch(); };
  }

  function setDeviceCapy(n) { if (n == null) localStorage.removeItem('capyDevIdx'); else localStorage.setItem('capyDevIdx', String((n - 1) % 10)); }

  // 拖动噜噜（fixed left/bottom 定位；用 getBoundingClientRect 计算，兼容位置）
  // 支持鼠标与触摸：mousedown/touchstart 记初始坐标，move 用 初始±位移（线性跟手）
  function attachDrag(el) {
    var down = null;
    function toPos(clientX, clientY) {
      var r = el.getBoundingClientRect();
      var bottom = Math.max(0, window.innerHeight - r.bottom);
      return { sx: clientX, sy: clientY, left: r.left, bottom: bottom };
    }
    function move(clientX, clientY) {
      if (!down) return;
      var left = Math.max(0, down.left + (clientX - down.sx));
      var bottom = Math.max(0, down.bottom - (clientY - down.sy));
      el.style.left = left + 'px';
      el.style.bottom = bottom + 'px';
    }
    function up() {
      if (down) { try { localStorage.setItem('capyPos', JSON.stringify({ left: el.style.left, bottom: el.style.bottom })); } catch (e) {} down = null; }
    }
    el.onmousedown = function (e) { down = toPos(e.clientX, e.clientY); e.preventDefault(); };
    // 用 addEventListener 而非 onmousemove= 赋值：避免被 page-work.js 分隔条(bindDividers)的 document.onmousemove 覆盖后噜噜拖不动
    // 注意 move(clientX, clientY) 收两个数字，需包一层取 e.clientX/clientY
    document.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    document.addEventListener('mouseup', up);
    // 触摸（触屏/移动端）：捕获到元素才拖，避免滚动冲突
    el.ontouchstart = function (e) { var t = e.touches[0]; down = toPos(t.clientX, t.clientY); };
    el.ontouchmove = function (e) { if (!down) return; var t = e.touches[0]; move(t.clientX, t.clientY); e.preventDefault(); };
    el.ontouchend = up;
  }

  root.Capy = {
    getCurrent: getCurrent,
    SET: SET,
    apply: apply,
    renderPanel: renderPanel,
    setDeviceCapy: setDeviceCapy,
    attachDrag: attachDrag,
    setCapyGlobal: setCapyGlobal,
    nextGlobal: nextGlobal,
    getRoundInfo: getRoundInfo
  };
})(typeof self !== 'undefined' ? self : this);

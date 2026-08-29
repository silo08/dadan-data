// 我的页（网页版 · 云端版）：登录/注册(可无密码, 昵称即可) + 按角色展示；与小程序共享云端用户，跨端互通
// 主号(管理员)用「管理员密码」识别；普通用户注册填昵称、登录填 ID/昵称(可空密码)。
(function (root) {
  var UI = root.UI, Auth = root.Auth, Capy = root.Capy;
  var s = { nick: '' };
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function init(container) { container.innerHTML = ''; render(container); }
  function me() { return Auth.me(); }
  function render(container) {
    var m = me();
    if (!m) { renderLogin(container); return; }
    renderLogined(container, m, m.role);
  }
  function roleName(r) { return r === 'admin' ? '主账号（管理员）' : (r === 'granted' ? '授权用户' : '普通用户'); }

  // ---- 登录 / 注册（未登录）----
  function renderLogin(container) {
    var h = '';
    h += '<div class="pagehead"><div class="ph-title">我的</div><div class="ph-sub">登录 / 注册（与小程序云端互通；普通用户需管理员审核后方可使用）</div></div>';
    h += '<div class="card" style="max-width:420px;margin:0 auto">';
    h += '<div class="card-title"><span class="tag">登录</span>已有账号</div>';
    h += '<div class="m-body"><input id="lgU" class="sel" placeholder="ID 或 昵称（普通用户可只填昵称）" autocomplete="off"><input id="lgP" class="sel" type="password" placeholder="密码（管理员必填，普通用户可空）" autocomplete="off"></div>';
    h += '<div style="margin-top:12px"><button class="btn primary" id="lgBtn" style="width:100%">登录</button></div>';
    h += '</div>';
    h += '<div class="card" style="max-width:420px;margin:18px auto 0">';
    h += '<div class="card-title"><span class="tag">注册</span>新用户申请（不用密码，填昵称即可）</div>';
    h += '<div class="m-body"><input id="rgN" class="sel" placeholder="设置昵称（=业务员，登录时用它）" autocomplete="off"></div>';
    h += '<div style="margin-top:12px"><button class="btn primary" id="rgBtn" style="width:100%">提交注册申请</button></div>';
    h += '<div class="muted" style="font-size:12px;margin-top:8px">提交后等待管理员审核通过，方可使用</div>';
    h += '</div>';
    if (!Auth.apiUrl()) h += '<div class="price-warn">⚠ 未配置云端地址：请填 web/js/config.js 的 cloudApiUrl</div>';
    container.innerHTML = h;
    var lg = document.getElementById('lgBtn'); if (lg) lg.onclick = function () {
      var u = document.getElementById('lgU').value.trim(), p = document.getElementById('lgP').value;
      UI.toast('登录中…', 'ok');
      Auth.login(u, p).then(function (r) {
        if (!r.ok) { UI.toast(r.msg, 'error'); return; }
        UI.toast('登录成功', 'ok'); render(container);
      });
    };
    // 输入账号/密码后按回车直接登录
    var lgU = document.getElementById('lgU'), lgP = document.getElementById('lgP');
    if (lgU) lgU.onkeydown = function (e) { if (e.key === 'Enter' && lg) lg.click(); };
    if (lgP) lgP.onkeydown = function (e) { if (e.key === 'Enter' && lg) lg.click(); };
    var rg = document.getElementById('rgBtn'); if (rg) rg.onclick = function () {
      var n = document.getElementById('rgN').value.trim();
      if (!n) { UI.toast('请填昵称', 'error'); return; }
      UI.toast('提交中…', 'ok');
      Auth.register('', n).then(function (r) { UI.toast(r.msg, r.ok ? 'ok' : 'error'); });
    };
  }

  // ---- 登录后按角色渲染 ----
  function renderLogined(container, m, role) {
    var isAdm = Auth.isAdmin();
    var h = '';
    h += '<div class="pagehead"><div class="ph-title">我的</div><div class="ph-sub">业务员昵称 · 账号' + esc(roleName(role)) + ' · ID：' + esc(m.id) + '</div></div>';
    h += '<div class="card mecard"><div class="me-ic">🐹</div><div class="me-name">' + esc(m.nick || '未设置昵称') + '</div><div class="me-sub">ID：' + esc(m.id) + '</div><button class="btn sm" id="edNick">✏️ 设置昵称</button><button class="btn sm" id="logoutBtn">退出登录</button></div>';
    h += '<div class="melist" style="margin-top:18px">';
    h += '<div class="me-row"><span class="k">账号等级</span><span class="v">' + esc(roleName(role)) + '</span></div>';
    h += '<div class="me-row"><span class="k">专属ID</span><span class="v">' + esc(m.id) + '（不可编辑）</span></div>';
    h += '<div class="me-row"><span class="k">数据管理</span><a id="openEditor" target="_blank" rel="noopener">打开数据编辑器 ↗</a></div>';
    h += '</div>';
    h += '<div class="muted" style="margin:10px 0">当前业务员昵称（生成图用）：<b>' + esc(s.nick || m.nick || '') + '</b></div>';
    if (isAdm) h += '<div id="admBox"></div>';
    if (role === 'admin' && Capy) h += renderCapyAdmin(m);
    h += '<div class="ver">打单工具 · WEB（浏览器版）</div>';
    container.innerHTML = h;
    var ed = document.getElementById('edNick'); if (ed) ed.onclick = function () {
      UI.enterText('设置昵称（业务员）', s.nick, '输入你的昵称').then(function (v) { if (v == null) return; s.nick = v; root.App.nick = v; try { localStorage.setItem('dadan_nick', v); } catch (e) {} Auth.setNickname(m.id, v).then(function () { render(container); UI.toast('昵称已保存', 'ok'); }); });
    };
    var lo = document.getElementById('logoutBtn'); if (lo) lo.onclick = function () { Auth.logout(); UI.toast('已退出', 'ok'); render(container); };
    if (isAdm) loadRegList(container);
    bindCapyAdmin(container);
  }

  // ---- 管理员：加载/渲染云端申请审核列表 ----
  function loadRegList(container) {
    var box = document.getElementById('admBox'); if (!box) return;
    Auth.getRegList().then(function (r) {
      if (!r.ok) { box.innerHTML = '<div class="card" style="margin-top:20px"><div class="card-title"><span class="tag">审核</span>注册审核（待处理）</div><div class="muted">' + esc(r.err || '加载失败') + '</div></div>'; return; }
      var list = r.list || [];
      var h = '<div class="card" style="margin-top:20px"><div class="card-title"><span class="tag">审核</span>注册审核（待处理，与小程序互通）</div>';
      if (!list.length) h += '<div class="muted">暂无用户</div>';
      else {
        h += '<table class="tbl"><thead><tr><th>ID</th><th>昵称</th><th>审核状态</th><th>操作</th></tr></thead><tbody>';
        list.forEach(function (u) {
          var st = u.status === 'pending' ? '等待注册审核' : (u.status === 'approved' ? '已通过审核' : '已处理');
          var stColor = u.status === 'approved' ? '#43a047' : (u.status === 'pending' ? '#e67c1a' : '#bbb');
          h += '<tr><td>' + esc(u.id) + '</td><td>' + esc(u.nickname) + '</td><td style="color:' + stColor + '">' + st + '</td><td>';
          if (u.status === 'pending') h += '<button class="btn sm gd-prove" data-ap="' + esc(u.openid) + '">通过</button><button class="btn sm gd-rej" data-rj="' + esc(u.openid) + '">剔除</button>';
          else h += '<span class="muted">—</span>';
          h += '</td></tr>';
        });
        h += '</tbody></table>';
      }
      h += '</div>';
      box.innerHTML = h;
      box.querySelectorAll('[data-ap]').forEach(function (el) { el.onclick = function () { Auth.approveReg(el.dataset.ap).then(function () { UI.toast('已通过', 'ok'); loadRegList(container); }); }; });
      box.querySelectorAll('[data-rj]').forEach(function (el) { el.onclick = function () { Auth.rejectReg(el.dataset.rj).then(function () { UI.toast('已剔除', 'ok'); loadRegList(container); }); }; });
    });
  }

  // ---- 主账号：全局噜噜选择（10 个编号，重排开新轮）----
  function renderCapyAdmin(m) {
    var cur = Number((Capy.getCurrent().name || 'lulu1').replace('lulu', ''));
    var info = Capy.getRoundInfo();
    var h = '<div class="card" style="margin-top:20px"><div class="card-title"><span class="tag">噜噜</span>选哪个噜噜（主账号 · 全用户同步）</div>';
    h += '<div class="muted" style="font-size:12px;margin:6px 0">每天 0 点自动换成下一个；一轮 10 个各一天，播完进下轮。点任一编号 = 今天换成它，其余 9 个随机重排、开新轮。</div>';
    h += '<div class="capy-lugrid">';
    for (var i = 1; i <= 10; i++) { var on = cur === i ? ' on' : ''; h += '<button class="btn sm capy-lu' + on + '" data-capyg="' + i + '">L' + i + '</button>'; }
    h += '</div>';
    h += '<div class="muted" style="font-size:12px;margin-top:8px">当前全噜噜：<b>L' + cur + '</b> · 本轮排法：' + (info.round || []).join(' → ') + '</div>';
    h += '</div>';
    return h;
  }
  function bindCapyAdmin(container) {
    container.querySelectorAll('[data-capyg]').forEach(function (b) {
      b.onclick = function () {
        var r = Capy.setCapyGlobal(b.dataset.capyg);
        if (!r.ok) { UI.toast(r.msg, 'error'); return; }
        if (root._capyReapply) root._capyReapply();
        UI.toast('已设全噜噜 L' + b.dataset.capyg + '（重排新轮），本机所有账号同步', 'ok');
        render(container);
      };
    });
  }

  root.PageMe = { init: init, refresh: function (c) { render(c); } };
})(typeof self !== 'undefined' ? self : this);

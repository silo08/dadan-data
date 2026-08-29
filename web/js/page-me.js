// 我的页（网页版）：登录/注册 + 按角色展示（普通用户/管理员）；昵称=业务员
(function (root) {
  var UI = root.UI, Auth = root.Auth, Capy = root.Capy;
  var s = { nick: '' };
  var rl = (typeof require !== 'undefined'); // 忽略
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function init(container) { container.innerHTML = ''; render(container); }
  function me() { return Auth.me(); }
  function render(container) {
    var m = me();
    if (!m) { renderLogin(container); return; }
    var role = m.role;
    renderLogined(container, m, role);
  }

  // ---- 登录 / 注册界面（未登录）----
  function renderLogin(container) {
    var h = '';
    h += '<div class="pagehead"><div class="ph-title">我的</div><div class="ph-sub">登录 / 注册（普通用户需管理员审核后方可使用）</div></div>';
    h += '<div class="card" style="max-width:420px;margin:0 auto">';
    h += '<div class="card-title"><span class="tag">登录</span>已有账号</div>';
    h += '<div class="m-body"><input id="lgU" class="sel" placeholder="ID 或 昵称" autocomplete="off"><input id="lgP" class="sel" type="password" placeholder="密码" autocomplete="off"></div>';
    h += '<div style="margin-top:12px"><button class="btn primary" id="lgBtn" style="width:100%">登录</button></div>';
    h += '</div>';
    h += '<div class="card" style="max-width:420px;margin:18px auto 0">';
    h += '<div class="card-title"><span class="tag">注册</span>新用户申请</div>';
    h += '<div class="m-body"><input id="rgN" class="sel" placeholder="设置昵称（=业务员）" autocomplete="off"><input id="rgP" class="sel" type="password" placeholder="设置密码" autocomplete="off"></div>';
    h += '<div style="margin-top:12px"><button class="btn primary" id="rgBtn" style="width:100%">提交注册申请</button></div>';
    h += '<div class="muted" style="font-size:12px;margin-top:8px">提交后等待管理员审核通过，方可使用</div>';
    h += '</div>';
    container.innerHTML = h;
    var lg = document.getElementById('lgBtn'); if (lg) lg.onclick = function () {
      var u = document.getElementById('lgU').value.trim(), p = document.getElementById('lgP').value;
      var r = Auth.login(u, p); if (!r.ok) { UI.toast(r.msg, 'error'); return; } UI.toast('登录成功', 'ok'); render(container); if (root.App && root.App.refreshLock) root.App.refreshLock(); if (root.App && root.App.go) root.App.mygoto && root.App.mygoto('me');
    };
    var rg = document.getElementById('rgBtn'); if (rg) rg.onclick = function () {
      var n = document.getElementById('rgN').value.trim(), p = document.getElementById('rgP').value;
      if (!n || !p) { UI.toast('请填昵称和密码', 'error'); return; }
      var r = Auth.register(n, p); UI.toast(r.msg, 'ok'); if (!r.ok) { UI.toast(r.msg, 'error'); }
    };
  }

  // ---- 登录后按角色渲染 ----
  function renderLogined(container, m, role) {
    var isAdm = Auth.isAdmin() || role === 'admin' || role === 'manager';
    var h = '';
    h += '<div class="pagehead"><div class="ph-title">我的</div><div class="ph-sub">业务员昵称 · 账号' + esc(roleName(role)) + ' · ID：' + esc(m.id) + '</div></div>';
    h += '<div class="card mecard"><div class="me-ic">🐹</div><div class="me-name">' + esc(m.nick || '未设置昵称') + '</div><div class="me-sub">ID：' + esc(m.id) + '</div><button class="btn sm" id="edNick">✏️ 设置昵称</button><button class="btn sm" id="logoutBtn">退出登录</button></div>';
    h += '<div class="melist" style="margin-top:18px">';
    h += '<div class="me-row"><span class="k">账号等级</span><span class="v">' + esc(roleName(role)) + '</span></div>';
    h += '<div class="me-row"><span class="k">专属ID</span><span class="v">' + esc(m.id) + '（不可编辑）</span></div>';
    h += '<div class="me-row"><span class="k">数据管理</span><a id="openEditor" target="_blank" rel="noopener">打开数据编辑器 ↗</a></div>';
    h += '</div>';
    var nk = (root.App && root.App.nick) || m.nick || '';
    h += '<div class="muted" style="margin:10px 0">当前业务员昵称（生成图用）：<b>' + esc(nk) + '</b></div>';
    if (isAdm) h += renderAdmin(m, role);
    if (role === 'admin' && Capy) h += renderCapyAdmin(m);
    h += '<div class="ver">打单工具 · WEB（浏览器版）</div>';
    container.innerHTML = h;
    var ed = document.getElementById('edNick'); if (ed) ed.onclick = function () {
      UI.enterText('设置昵称（业务员）', s.nick, '输入你的昵称').then(function (v) { if (v == null) return; s.nick = v; root.App.nick = v; try { localStorage.setItem('dadan_nick', v); } catch (e) {} render(container); UI.toast('昵称已保存', 'ok'); });
    };
    var e2 = document.getElementById('edNick2'); if (e2) e2.onclick = function () {
      UI.enterText('设置昵称（业务员）', s.nick, '输入你的昵称').then(function (v) { if (v == null) return; s.nick = v; root.App.nick = v; try { localStorage.setItem('dadan_nick', v); } catch (e) {} render(container); UI.toast('昵称已保存', 'ok'); });
    };
    var lo = document.getElementById('logoutBtn'); if (lo) lo.onclick = function () { Auth.logout(); UI.toast('已退出', 'ok'); if (root.App && root.App.refreshLock) root.App.refreshLock(); render(container); };
    bindAdmin(container);
    bindCapyAdmin(container);
  }

  function roleName(r) { return r === 'admin' ? '主账号（管理员）' : (r === 'manager' ? '管理员' : '普通用户'); }

  // ---- 管理员：等待注册审核列表 ----
  function renderAdmin(m, role) {
    var isMain = role === 'admin';
    // 主账号(admin)看全部用户；管理员(manager)只看待审核的普通用户（不含主账号/其他管理员）
    var list = isMain ? Auth.allUsers() : Auth.pendingUsers();
    var ordered = list;
    var h = '<div class="card" style="margin-top:20px"><div class="card-title"><span class="tag">审核</span>' + (isMain ? '用户管理（全量）' : '注册审核（待处理）') + '</div>';
    if (!ordered.length) h += '<div class="muted">暂无用户</div>';
    else {
      h += '<table class="tbl"><thead><tr><th>ID</th><th>昵称</th><th>审核状态</th><th>操作</th></tr></thead><tbody>';
      ordered.forEach(function (u) {
        var st = u.status === 'pending' ? '等待注册审核' : (u.status === 'active' ? '已通过审核' : '已剔除');
        var stColor = u.status === 'active' ? '#43a047' : (u.status === 'pending' ? '#e67c1a' : '#bbb');
        h += '<tr><td>' + esc(u.id) + '</td><td>' + esc(u.nick) + '</td><td style="color:' + stColor + '">' + st + '</td><td>';
        if (u.isMain) {
          // 主账号：任何人不可操作（只读标记）
          h += '<span class="muted">主账号</span>';
        } else if (u.status === 'pending') {
          h += '<button class="btn sm gd-prove" data-approve="' + esc(u.id) + '">通过</button><button class="btn sm gd-rej" data-reject="' + esc(u.id) + '">剔除</button>';
        } else if (u.status === 'active') {
          if (isMain) { h += '<button class="btn sm gd-prove on" data-setrole="' + esc(u.id) + '" data-role="manager">设为管理员</button><button class="btn sm gd-rej" data-reject="' + esc(u.id) + '" title="剔除">剔除</button>'; }
          else { h += '<span class="muted">—</span>'; }
        } else {
          h += '<span class="muted">已剔除</span>';
        }
        h += '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '</div>';
    return h;
  }

  function bindAdmin(container) {
    container.querySelectorAll('[data-approve]').forEach(function (el) {
      el.onclick = function () { Auth.approve(el.dataset.approve); UI.toast('已通过', 'ok'); render(container); };
    });
    container.querySelectorAll('[data-reject]').forEach(function (el) {
      el.onclick = function () { Auth.reject(el.dataset.reject); UI.toast('已剔除', 'ok'); render(container); };
    });
    container.querySelectorAll('[data-setrole]').forEach(function (el) {
      el.onclick = function () { Auth.setRole(el.dataset.setrole, el.dataset.role); UI.toast('已设管理员', 'ok'); render(container); };
    });
  }

  // ---- 主账号：全局噜噜选择（10 个编号，重排开新轮）----
  function renderCapyAdmin(m) {
    var cur = Number((Capy.getCurrent().name || 'lulu1').replace('lulu', ''));
    var info = Capy.getRoundInfo();
    var h = '<div class="card" style="margin-top:20px"><div class="card-title"><span class="tag">噜噜</span>选哪个噜噜（主账号 · 全用户同步）</div>';
    h += '<div class="muted" style="font-size:12px;margin:6px 0">每天 0 点自动换成下一个；一轮 10 个各一天，播完进下轮。点任一编号 = 今天换成它，其余 9 个随机重排、开新轮。</div>';
    h += '<div class="capy-lugrid">';
    for (var i = 1; i <= 10; i++) {
      var on = cur === i ? ' on' : '';
      h += '<button class="btn sm capy-lu' + on + '" data-capyg="' + i + '">L' + i + '</button>';
    }
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

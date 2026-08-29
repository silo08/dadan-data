// 账号/权限系统（网页版，localStorage 持久化）
// 角色：admin(主账号/管理员) > manager(管理员) > user(普通用户)
// 审批：普通用户注册 → 待审核(pending) → 管理员通过(active) / 剔除(rejected)
(function (root) {
  var K = 'dadan_users', SK = 'dadan_session', NK = 'dadan_nick', MK = 'dadan_main';
  function load() { try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch (e) { return []; } }
  function save(u) { localStorage.setItem(K, JSON.stringify(u)); }
  function randId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz'; var s = '';
    for (var i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function ensureMain() {
    var u = load(); if (u.length) return;
    // 默认主账号（管理员）
    var m = { id: randId(), nick: '趣娜玩', pass: '888888', role: 'admin', status: 'active', isMain: true };
    u.push(m); save(u);
  }
  function me() { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { return null; } }
  function login(idOrNick, pass) {
    var u = load(); var hit = u.filter(function (x) { return (x.id === idOrNick || x.nick === idOrNick) && x.pass === pass && x.status === 'active'; })[0];
    if (!hit) return { ok: false, msg: '账号或密码错误，或未通过审核' };
    localStorage.setItem(SK, JSON.stringify({ id: hit.id, nick: hit.nick, role: hit.role }));
    if (root.App) root.App.nick = hit.nick;
    return { ok: true, user: hit };
  }
  function logout() { localStorage.removeItem(SK); }
  function register(nick, pass) {
    var u = load(); if (u.some(function (x) { return x.nick === nick; })) return { ok: false, msg: '昵称已存在' };
    var nu = { id: randId(), nick: nick, pass: pass, role: 'user', status: 'pending' };
    u.push(nu); save(u); return { ok: true, user: nu, msg: '注册成功，等待管理员审核' };
  }
  function pendingUsers() { return load().filter(function (x) { return x.status === 'pending'; }); }
  function allUsers() { return load(); }
  function approve(id) { var u = load(); var t = u.filter(function (x) { return x.id === id; })[0]; if (t) { t.status = 'active'; save(u); } }
  function reject(id) { var u = load(); var t = u.filter(function (x) { return x.id === id; })[0]; if (t) { t.status = 'rejected'; save(u); } }
  function setRole(id, role) { var u = load(); var t = u.filter(function (x) { return x.id === id; })[0]; if (t && t.isMain !== true) { t.role = role; save(u); } }
  function byId(id) { return load().filter(function (x) { return x.id === id; })[0] || null; }
  function isAdmin() { var m = me(); return m && (m.role === 'admin' || m.role === 'manager'); }
  function isPendingUser() { var m = me(); if (m) return false; // session only for active
    return false; }
  ensureMain();
  root.Auth = { login: login, logout: logout, register: register, me: me, pendingUsers: pendingUsers, allUsers: allUsers, approve: approve, reject: reject, setRole: setRole, byId: byId, isAdmin: isAdmin, randId: randId, ensureMain: ensureMain };
})(typeof self !== 'undefined' ? self : this);

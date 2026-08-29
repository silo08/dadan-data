// 账号/权限系统（网页版 · 双模式）：配了 DSH_WEB.cloudApiUrl → 走微信云(与小程序互通)；没配 → 本机 localStorage 兜底
// 身份存本机(localStorage 会话 + sessionStorage 管理员密码)；普通用户可无密码(填昵称即可)，主号用密码。
(function (root) {
  var SK = 'dadan_web_session', PK = 'dadan_web_adminpass';
  var UK = 'dadan_users';
  function cfg() { return root.DSH_WEB || {}; }
  function apiUrl() { return (cfg().cloudApiUrl || ''); }
  function uid() { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz'; var s = ''; for (var i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function loadLocal() { try { return JSON.parse(localStorage.getItem(UK) || '[]'); } catch (e) { return []; } }
  function saveLocal(u) { localStorage.setItem(UK, JSON.stringify(u)); }
  function ensureMain() { var u = loadLocal(); if (u.length) return; u.push({ id: uid(), nick: '趣娜玩', pass: '888888', role: 'admin', status: 'active', isMain: true }); saveLocal(u); }

  function callCloud(op, payload) {
    var url = apiUrl();
    if (!url) return Promise.resolve(null);
    var body = Object.assign({ op: op }, payload || {});
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, err: '云端响应异常' }; }); })
      .catch(function () { return { ok: false, err: '网络/云端不可达' }; });
  }
  function me() { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { return null; } }
  function setMe(m) { if (m) localStorage.setItem(SK, JSON.stringify(m)); else localStorage.removeItem(SK); }
  function savePass(p) { if (p) try { sessionStorage.setItem(PK, p); } catch (e) {} }
  function getPass() { try { return sessionStorage.getItem(PK) || ''; } catch (e) { return ''; } }

  function login(id, pass) {
    if (apiUrl()) {
      return callCloud('webLogin', { id: id, pass: pass || '' }).then(function (r) {
        if (!r || !r.ok) return { ok: false, msg: (r && r.err) || '登录失败' };
        var m = { id: r.id, nick: r.nick || '', role: r.role }; setMe(m); if (r.role === 'admin') savePass(pass || ''); return { ok: true, user: m };
      });
    }
    // 本地兜底
    ensureMain();
    var hit = loadLocal().filter(function (x) { return (x.id === id || x.nick === id) && x.pass === pass && x.status === 'active'; })[0];
    if (!hit) return Promise.resolve({ ok: false, msg: '账号或密码错误' });
    var m = { id: hit.id, nick: hit.nick, role: hit.role }; setMe(m); return Promise.resolve({ ok: true, user: m });
  }
  function register(id, nick) {
    if (apiUrl()) return callCloud('webRegister', { id: id, nick: nick }).then(function (r) { if (!r || !r.ok) return { ok: false, msg: (r && r.err) || '注册失败' }; return { ok: true, id: r.id, msg: '注册成功，等待管理员审核' }; });
    // 本地兜底：只填昵称，无密码，待审核
    ensureMain();
    var users = loadLocal();
    if (users.some(function (x) { return x.nick === nick || x.id === nick; })) return Promise.resolve({ ok: false, msg: '该昵称已存在' });
    var nu = { id: uid(), nick: nick, pass: '', role: 'user', status: 'pending' }; users.push(nu); saveLocal(users);
    return Promise.resolve({ ok: true, id: nu.id, msg: '注册成功，等待管理员审核' });
  }
  function logout() { setMe(null); try { sessionStorage.removeItem(PK); } catch (e) {} }
  function setNickname(id, nick) {
    if (apiUrl()) return callCloud('webSetNickname', { id: id, nick: nick });
    var users = loadLocal(); var t = users.filter(function (x) { return x.id === id; })[0];
    if (t) { t.nick = nick; saveLocal(users); } return Promise.resolve({ ok: true });
  }
  function isAdmin() { var m = me(); return m && m.role === 'admin'; }
  function byId() { return me(); }

  // 管理员：列表 / 通过 / 剔除（云端带主号密码；本地直接用本机用户）
  function getRegList() {
    if (apiUrl()) return callCloud('webRegList', { pass: getPass() });
    ensureMain();
    var list = loadLocal().map(function (u) { return { openid: 'local:' + u.id, id: u.id, nickname: u.nick, status: u.status || 'active' }; });
    return Promise.resolve({ ok: true, list: list });
  }
  function approveReg(t) {
    if (apiUrl()) return callCloud('webRegApprove', { pass: getPass(), targetOpenid: t });
    var id = String(t || '').replace(/^local:/, ''); var users = loadLocal(); var x = users.filter(function (u) { return u.id === id; })[0];
    if (x) { x.status = 'active'; saveLocal(users); } return Promise.resolve({ ok: true });
  }
  function rejectReg(t) {
    if (apiUrl()) return callCloud('webRegReject', { pass: getPass(), targetOpenid: t });
    var id = String(t || '').replace(/^local:/, ''); saveLocal(loadLocal().filter(function (u) { return u.id !== id; })); return Promise.resolve({ ok: true });
  }
  ensureMain();
  root.Auth = { login: login, logout: logout, register: register, me: me, isAdmin: isAdmin, setNickname: setNickname, byId: byId, getRegList: getRegList, approveReg: approveReg, rejectReg: rejectReg };
})(typeof self !== 'undefined' ? self : this);

// 数据加载器（网页版）：
// 1. 页面先加载 engine/data.js + engine/engine.js（浏览器挂 window.DSHDATA / window.ENGINE）
// 2. 这里再 fetch 在线数据源（与小程序 A 源一致），成功后 ENGINE.reload() 覆盖内置数据。
// 3. 失败则用内置数据兜底（离线/未发布也能用）。
(function (root) {
  var DATA_URL = (root.DSH_WEB && root.DSH_WEB.dataUrl) || 'https://silo08.github.io/dadan-data/data.json';
  var onData = { cb: null };

  // 加载远端数据，返回 Promise<{ok, usingRemote, dsVersion, count, offline}>
  function loadRemoteData() {
    var E = root.ENGINE;
    if (!E) return Promise.resolve({ ok: false, usingRemote: false, offline: true, err: '引擎未加载' });
    // 优先内置 data.js（含 version）
    var version = (root.DSHDATA && root.DSHDATA.version) || 'builtin';
    var exported = (root.DSHDATA && root.DSHDATA.exported) || '';
    if (typeof fetch !== 'function') {
      return Promise.resolve({ ok: true, usingRemote: false, dsVersion: version, offline: true });
    }
    return fetch(DATA_URL, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      if (!d || !d.configs || !d.prices || !d.links) throw new Error('数据缺关键字段');
      E.reload(d);
      return { ok: true, usingRemote: true, dsVersion: d.version || '', dsExported: d.exported || '', count: (d.configs || []).length };
    }).catch(function (e) {
      // 兜底：内置 data.js
      return { ok: true, usingRemote: false, dsVersion: version, offline: true, err: e && e.message };
    });
  }

  function reloadNow() {
    return loadRemoteData().then(function (res) {
      if (onData.cb) onData.cb(res);
      return res;
    });
  }

  // 页面回到前台/重新可见时刷新一次（对齐小程序"去60s定时，只留 onShow 回前台刷新"）：省额度、不闪。
  // 不做 setInterval 后台轮询；仅在 浏览器tab重新可见(window focus / visibilitychange) 时拉最新。
  // 返回 { stop } 便于清理。
  function startAutoRefresh(opts) {
    opts = opts || {};
    var onVis = function () {
      if (!document.hidden) reloadNow();   // 从后台回到前台 → 刷一次
    };
    var onFocus = function () { reloadNow(); };  // 切回浏览器窗口 → 刷一次
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    // 延迟一小会再启动首刷（避免和启动 load 并发）
    return { stop: function () { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onFocus); } };
  }

  root.DataLoader = {
    load: loadRemoteData,
    reload: reloadNow,
    startAutoRefresh: startAutoRefresh,
    DATA_URL: DATA_URL,
    onLoaded: function (cb) { onData.cb = cb; }
  };
})(typeof self !== 'undefined' ? self : this);

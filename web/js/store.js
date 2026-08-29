// 核心状态仓库（网页版）：
// - 用 localStorage 持久化「工作状态」（对应小程序的 globalData.bcjSheets/liveSheets，但可跨刷新保留）
// - 事件中心：badgeListener/sheetChanged，实时通知工作台刷新角标
// - 每个表单(补差价/直播间)按名字各自独立保存
(function (root) {
  var KEY = 'dadan_web_state_v1';

  var listeners = [];   // fn(sheetKind, name) -> 改价后刷新角标
  var state = {
    bcjSheets: {},      // { 表单名: { state:{...}, total:'...' } }
    liveSheets: {}
  };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.bcjSheets) state.bcjSheets = o.bcjSheets;
        if (o && o.liveSheets) state.liveSheets = o.liveSheets;
      }
    } catch (e) {}
    return state;
  }

  // 持久化一个表单状态并存总价，触发监听
  function persistSheet(kind, name, sheetState, total) {
    var set = kind === 'live' ? state.liveSheets : state.bcjSheets;
    set[name] = { state: sheetState, total: total };
    save();
    emit(kind, name);
  }

  // 工作台格子列表（9 补差价 + 3 直播间）
  function listSheets(kind) {
    var set = kind === 'live' ? state.liveSheets : state.bcjSheets;
    var n = kind === 'live' ? 3 : 9;
    var arr = [];
    for (var i = 0; i < n; i++) {
      var name = i === 0 ? (kind === 'live' ? '直播间' : '补差价')
                         : (kind === 'live' ? '直播间 (' + (i + 1) + ')' : '补差价 (' + (i + 1) + ')');
      arr.push({ name: name, total: (set[name] && set[name].total) || '' });
    }
    return arr;
  }

  function getSheet(kind, name) {
    var set = kind === 'live' ? state.liveSheets : state.bcjSheets;
    return set[name] ? set[name].state : null;
  }

  function clearAll() { state.bcjSheets = {}; state.liveSheets = {}; save(); emit(); }

  function emit(kind, name) {
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](kind, name); } catch (e) {} }
  }
  function onChange(cb) { listeners.push(cb); }

  root.AppStore = { load: load, save: save, persistSheet: persistSheet, listSheets: listSheets, getSheet: getSheet, clearAll: clearAll, onChange: onChange, dump: function () { return state; } };
  load();
})(typeof self !== 'undefined' ? self : this);

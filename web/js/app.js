// 打单工具 WEB 入口：路由 + 数据加载 + 全局应用状态
(function (root) {
  var UI = root.UI;

  var App = {
    nick: '',
    dataInfo: { usingRemote: false, dsVersion: '', dsExported: '', offline: false },
    isAdmin: false,
    current: 'work',
    currentCtx: null,       // 当前打开的格子 {kind, index}
    container: null,
    _onStoreFn: null
  };
  root.App = App;

  var TAB = ['home', 'bcj', 'live', 'prices', 'me', 'about'];
  var TITLES = { home: '打单工具', work: '打单工具', bcj: '补差价', live: '直播间', prices: '报价成本表', me: '我的' };
  var ACTNAV = { kdocs: 'https://www.kdocs.cn/l/cbDoagWTC3wF' };
  App.ACTNAV = ACTNAV;

  // 全网比价弹窗：输入产品名，点平台图标按名搜索（需求5）
  function openBijia() {
    var h = '<div class="m-title">🔍 全网比价</div>' +
      '<div class="m-body"><input id="bijiaInput" class="sel" placeholder="复制粘贴需要查询的产品名称" autocomplete="off"></div>' +
      '<div class="bijia-btns">' +
      '<button class="bijia-btn" data-plat="pdd">拼多多</button>' +
      '<button class="bijia-btn" data-plat="taobao">淘宝</button>' +
      '<button class="bijia-btn" data-plat="jd">京东</button>' +
      '<button class="bijia-btn" data-plat="douyin">抖音</button>' +
      '</div>';
    UI.openModal(h);
    var inp = document.getElementById('bijiaInput');
    if (inp) setTimeout(function () { inp.focus(); }, 40);
    var openSite = function (plat) {
      var q = (inp && inp.value || '').trim();
      if (!q) { UI.toast('请先输入要查询的产品名称'); inp && inp.focus(); return; }
      var url = BIJIA_URL[plat] + encodeURIComponent(q);
      window.open(url, '_blank');
    };
    document.querySelectorAll('.bijia-btn').forEach(function (b) {
      b.onclick = function () { openSite(b.dataset.plat); };
    });
  }
  App.openBijia = openBijia;
  var BIJIA_URL = {
    pdd: 'https://mobile.yangkeduo.com/search_result.html?search_key=',
    taobao: 'https://s.taobao.com/search?q=',
    jd: 'https://search.jd.com/Search?keyword=',
    douyin: 'https://www.douyin.com/search/'
  };

  function el(id) { return document.getElementById(id); }

  function go(page, ctx) {
    hideAll();
    // 登录门禁：未登录时除「我的」外都锁定
    if (root.Auth && !root.Auth.me() && page !== 'me') { lockPage(); return; }
    App.current = page; App.currentCtx = ctx || null;
    var container = el('pageBody');
    App.container = container;
    container.classList.add('active');   // hideAll 移除了 .active，必须加回来，否则内容 display:none 空屏
    // 非工作台页用居中窄容器；工作台铺满
    container.classList.remove('narrow');
    if (page === 'home' || page === 'work') {
      PageWork.init(container);
    }
    else if (page === 'prices') {
      if (localStorage.getItem('wb_sel') !== 'prices') localStorage.setItem('wb_sel', 'prices');
      PageWork.init(container);
    }
    else if (page === 'me') {
      container.classList.add('narrow');
      PageMe.init(container);
    }
    else if (page === 'about') {
      container.classList.add('narrow');
      PageMe.init(container);
    }
    else if (page === 'consumption') {
      container.classList.add('narrow');
      if (PageConsumption.init) PageConsumption.init(container, ctx);
    }
    // nav 高亮（桌面顶栏）：用 data-actnav / data-page 匹配
    document.querySelectorAll('.navlink, .navbtn').forEach(function (n) {
      var key = n.dataset.page, act = n.dataset.actnav;
      var on = (page === 'consumption' && (act === 'cpu' || act === 'gpu')) ||
               (page === 'me' && key === 'me') ||
               (page === 'home' && key === 'home');
      n.className = (n.className || 'navlink').replace(/\s+on\b/g, '') + (on ? ' on' : '');
    });
    window.scrollTo(0, 0);
  }

  function hideAll() {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  }

  // 未登录：锁定主页面，只提示去「我的」登录/注册
  function lockPage() {
    var c = el('pageBody'); if (!c) return; c.classList.add('active'); c.classList.remove('narrow');
    c.innerHTML = '<div class="pagehead"><div class="ph-title">🔒 需要登录</div><div class="ph-sub">请前往「我的」登录或注册（普通用户需管理员审核通过后使用）</div></div>' +
      '<div class="card" style="max-width:420px;margin:20px auto;text-align:center;padding:30px"><div class="m-body">主页面已锁定，请先登录账号。</div><div style="margin-top:14px"><button class="btn primary" id="lockGo">前往我的（登录/注册）</button></div></div>';
    var b = document.getElementById('lockGo'); if (b) b.onclick = function () { go('me'); };
  }
  App.refreshLock = function () { go(App.current || 'home'); };

  App.go = go;
  App.openSheet = function (kind, index) {
    // 进入工作台并选中对应房间
    go('home');
    if (PageWork.openSel) PageWork.openSel(kind + '-' + index);
  };
  App.refreshWorkbench = function () { go('home'); };

  // 数据加载完成后刷新
  function afterData(res) {
    App.dataInfo = { usingRemote: !!res.usingRemote, dsVersion: res.dsVersion || '', dsExported: res.dsExported || '', offline: !!res.offline };
    if (res.count != null) UI.toast('已载入配置 ' + res.count + ' 条', 'ok');
    else if (res.offline) UI.toast('在线数据不可用，使用内置数据', 'err');
    var sv = document.getElementById('statVer');
    if (sv) sv.textContent = 'v' + (App.dataInfo.dsVersion || '内置') + (App.dataInfo.usingRemote ? '' : ' · 本地');
    // 工作台已渲染则整页重渲（含左列表角标 + 中间）
    if (App.current === 'home' || App.current === 'work') { var wb = document.querySelector('.wb3'); if (wb) PageWork.render(wb); }
  }

  function boot() {
    App.nick = (function () { try { return localStorage.getItem('dadan_nick') || ''; } catch (e) { return ''; } })();
    window.ENGINE = root.ENGINE;
    // 绑定顶部导航（data-page 页面 / data-actnav 动作；含刷新按钮）
    document.querySelectorAll('.navlink, .navbtn, [data-actnav]').forEach(function (t) {
      t.onclick = function (e) {
        e.stopPropagation();
        var key = t.dataset.page;
        if (key === 'home') { go('home'); return; }
        if (key === 'me') { go('me'); return; }
        var act = t.dataset.actnav;
        if (act === 'cpu') { go('consumption', 'cpu'); }
        else if (act === 'gpu') { go('consumption', 'gpu'); }
        else if (act === 'bijia') { openBijia(); }
        else if (act === 'kdocs') { window.open(ACTNAV.kdocs, '_blank'); }
        else if (act === 'reload') { reloadData(); }
      };
    });
    // 噜噜显示/隐藏
    var capyBtn = document.getElementById('btnToggleCapy');
    if (capyBtn) capyBtn.onclick = function () { if (PageWork.toggleCapy) PageWork.toggleCapy(); };
    // 噜噜 透明/大小 滑块（隐藏噜噜左侧）：改 localStorage + 实时刷新噜噜
    function bindCapySlider(id, key) {
      var el = document.getElementById(id);
      if (!el) return;
      var v = Number(localStorage.getItem(key) || 1);
      el.value = String(Math.round(v * 100));
      el.oninput = function () {
        localStorage.setItem(key, String(Number(el.value) / 100));
        if (root._capyReapply) root._capyReapply();
      };
    }
    bindCapySlider('capyO', 'capyOpacity');
    bindCapySlider('capyS', 'capySize');
    // 全屏返回时清掉 picker
    el('modal').addEventListener('click', function (e) { if (e.target === el('modal') && el('modal').dataset.closable === '1') UI.closeModal(); });
    // 首次进入渲染（用内置数据）+ 拉一次在线数据
    go('home');
    DataLoader.load().then(function (res) {
      afterData(res);
      var sv = document.getElementById('statVer');
      if (sv) sv.textContent = 'v' + (App.dataInfo.dsVersion || '内置') + (App.dataInfo.usingRemote ? '' : ' · 本地');
    });
  }

  // 手动刷新数据（顶部「刷新数据」按钮）：仅点击时拉最新，不再自动定时
  function reloadData() {
    UI.toast('正在刷新数据…', 'ok');
    DataLoader.reload().then(function (res) {
      afterData(res);
      var sv = document.getElementById('statVer');
      if (sv) sv.textContent = 'v' + (App.dataInfo.dsVersion || '内置') + (App.dataInfo.usingRemote ? '' : ' · 本地');
      UI.toast(res.usingRemote ? '刷新完成：远程数据已更新' : '刷新完成：远程不可用，使用内置', 'ok');
    });
  }
  App.reloadData = reloadData;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // store 变化时自动刷新左列表角标（改价→房间数字实时更新），不动中间编辑态
  AppStore.onChange(function () {
    if (App.current === 'home' || App.current === 'work') {
      if (PageWork.refreshList) PageWork.refreshList();
    }
  });
})(typeof self !== 'undefined' ? self : this);

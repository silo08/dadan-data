// 直播间页（网页版）：工厂版 —— 支持多实例并存
(function (root) {
  var E = root.ENGINE, UI = root.UI, Picker = root.Picker;
  var SHOPS = ['抖音极咖', '抖音沃恩', 'PDD奔尔', 'PDD极咖'];

  function create(opts) {
    opts = opts || {};
    var s = {
      formName: opts.name || '直播间',
      tree: E.linkTree(),
      shopIdx: 0, cfgKey: '', cfgText: '', items: [],
      history: [], redoStack: [],
      ssdOpts: [], gpuOpts: [], ssdNames: [], gpuNames: [], ssdIdx: 0, gpuIdx: 0,
      profit: 4, plat: 2, shipping: 99, costShip: null, totalManual: '', nick: (root.App && root.App.nick) || '',
      priceOv: [],  // 每行单价覆盖（null=用价格表自动），供单价可编辑
      calcOpen: false  // 计算过程卡展开状态（点百分比按键重渲时保持）
    };
    for (var i = 0; i < 11; i++) s.items.push({ name: '', qty: 1 });

    function shopConfigs(shop) {
      var out = [];
      s.tree.shops.forEach(function (sp) {
        Object.keys(s.tree.map[sp] || {}).forEach(function (lk) {
          (s.tree.map[sp][lk] || []).forEach(function (l) { if (l.a === shop) out.push(l); });
        });
      });
      return out;
    }
    function currentLink() {
      var cfgs = shopConfigs(SHOPS[s.shopIdx]);
      for (var i = 0; i < cfgs.length; i++) if (cfgs[i].b === s.cfgKey) return cfgs[i];
      return null;
    }
    function resolveCfgKey(text, opts) {
      if (!text) return '';
      var t = String(text).trim().toLowerCase();
      var arr = opts || shopConfigs(SHOPS[s.shopIdx]);
      for (var i = 0; i < arr.length; i++) if (arr[i].b === text) return arr[i].b;
      for (var j = 0; j < arr.length; j++) if (E.configNameOf(arr[j].b) === text || E.linkNameOf(arr[j].b) === text) return arr[j].b;
      var hit = [];
      for (var k = 0; k < arr.length; k++) {
        var hay = (arr[k].b + ' ' + (arr[k].sheet || '') + ' ' + (arr[k].a || '')).toLowerCase();
        if (hay.indexOf(t) >= 0) hit.push(arr[k].b);
      }
      return hit.length === 1 ? hit[0] : '';
    }
    function onShop(container) {
      var cfgs = shopConfigs(SHOPS[s.shopIdx]);
      if (cfgs.length) { s.cfgKey = cfgs[0].b; s.cfgText = E.configNameOf(cfgs[0].b); applyConfig(container); }
      else { s.cfgKey = ''; s.cfgText = ''; clearItems(container); }    }
    function selectCfg(key, container) { s.cfgKey = key; s.cfgText = E.configNameOf(key); applyConfig(container); }
    function applyConfig(container) {
      if (!s.cfgKey) { clearItems(container); return; }
      var f = E.fillConfig(s.cfgKey);
      s.items = f.items.map(function (it) { return { name: it.name, qty: it.qty }; });
      var lk = currentLink();
      var ssdOpts = E.cleanSsd(lk && lk.ssd), gpuOpts = E.cleanGpu(lk && lk.gpu);
      s.ssdOpts = ssdOpts; s.gpuOpts = gpuOpts;
      s.ssdNames = ssdOpts.map(function (o) { return o.n; });
      s.gpuNames = gpuOpts.map(function (o) { return o.n; });
      if (ssdOpts.length) s.items[4].name = E.applySsdOption(ssdOpts[0].n);
      if (gpuOpts.length) {
        var g = E.applyGpuOption(gpuOpts[0].n);
        if (g.kind === 'mem') s.items[3].name = g.name; else s.items[5].name = g.name;
      }
      s.ssdIdx = 0; s.gpuIdx = 0; s.history = [];
      render(container);
    }
    function clearItems(container) {
      s.items = [];
      for (var i = 0; i < 11; i++) s.items.push({ name: '', qty: 1 });
      s.ssdNames = []; s.gpuNames = []; s.ssdIdx = 0; s.gpuIdx = 0;
      render(container);
    }
    function internalShip() {
      var p = E.priceOf(E.dataPriceTable(E.CATS[7].table), s.items[7].name);
      var v = p ? (E.CATS[7].priceCol === 'f' ? p.f : p.e) : 0;
      if (v <= 100) return 100; if (v <= 300) return 150; if (v <= 500) return 200; if (v <= 1000) return 300; return 400;
    }

    function render(container) {
      var rows = [], cost = 0, sell = 0;
      for (var i = 0; i < 11; i++) {
        var it = s.items[i] || { name: '', qty: 1 }, cat = E.CATS[i];
        var p = E.priceOf(E.dataPriceTable(cat.table), it.name);
        var base = (s.priceOv[i] != null && s.priceOv[i] !== '') ? Number(s.priceOv[i]) : (p ? (cat.priceCol === 'f' ? p.f : p.e) : 0);
        var unTax = p ? p.c : 0, tax = p ? p.d : 0;
        cost += tax * it.qty; sell += base * it.qty;
        rows.push({ label: cat.label, name: it.name, price: base, qty: it.qty, idx: i, cat: cat.cat, c: unTax, d: tax, cost: tax });
      }
      var shp = Number(s.shipping) || 0;
      var costShip = (s.costShip != null && s.costShip !== '') ? Number(s.costShip) : internalShip();
      var autoTotal = sell * (1 + s.profit / 100 + s.plat / 100) + shp;
      var total = s.totalManual ? Number(s.totalManual) : autoTotal;
      var platFee = total * s.plat / 100;
      var profitAmt = total - sell - platFee - shp;
      var gross = total - cost;
      var net = gross - platFee - costShip;
      var canFps = !!E.matchFps(s.items[0].name, s.items[3].name, s.items[3].qty, s.items[5].name);

      var h = '';
      h += '<div class="pane live-theme">';
      h += '<div class="pane-scroll">';
      h += '<div class="pagehead"><div class="ph-title">' + UI.esc(s.formName || '直播间') + '</div><div class="ph-sub">选择配置 → 利润/平台/运费 → 实时核算 → 生成报价单</div></div>';

      h += '<div class="card" style="margin-bottom:16px"><div class="card-title"><span class="tag">配置</span>选择店铺 / 链接 / 固态 / 显卡</div><div class="cfg-grid live-grid">';
      h += '<div class="c-shop"><div class="field">店铺</div><select id="shopSel" class="sel">';
      SHOPS.forEach(function (sp, i) { h += '<option value="' + sp + '"' + (i === s.shopIdx ? ' selected' : '') + '>' + sp + '</option>'; });
      h += '</select></div>';
      h += '<div class="c-link"><div class="field">链接 + 配置名（可粘贴配置名自动筛选）</div><div class="combo"><input id="cfgInput" class="sel" placeholder="选择或粘贴配置名称…" value="' + UI.esc(s.cfgText) + '" autocomplete="off"><span class="combo-btn" id="cfgBtn">▾</span></div></div>';
      h += '<div class="c-ssd"><div class="field">固态</div><select id="ssdSel" class="sel">';
      (s.ssdNames || []).forEach(function (n, i) { h += '<option' + (i === s.ssdIdx ? ' selected' : '') + '>' + UI.esc(n) + '</option>'; });
      h += '</select></div>';
      h += '<div class="c-gpu"><div class="field">显卡</div><select id="gpuSel" class="sel">';
      (s.gpuNames || []).forEach(function (n, i) { h += '<option' + (i === s.gpuIdx ? ' selected' : '') + '>' + UI.esc(n) + '</option>'; });
      h += '</select></div></div></div>';

      h += '<div class="split"><div class="live-main">';
      h += '<div class="card live-list"><div class="card-title"><span class="tag">配件清单</span><span class="ops-in-title" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip vc'+(s.profit===0?' on':'')+'" data-profit="0">利润0%</span><span class="chip vc'+(s.profit===4?' on':'')+'" data-profit="4">利润4%</span><span class="chip vc'+(s.profit===6?' on':'')+'" data-profit="6">利润6%</span><span class="chip vc'+(s.plat===0?' on':'')+'" data-plat="0">平台0%</span><span class="chip vc'+(s.plat===0.6?' on':'')+'" data-plat="0.6">平台0.6%</span><span class="chip vc'+(s.plat===2?' on':'')+'" data-plat="2">平台2%</span><span class="chip vc live-ops" data-live="clearcfg">清空配置</span><span class="chip vc live-ops" data-live="clear">清空</span><span class="chip vc live-ops" data-live="undo">撤销</span><span class="chip vc live-ops" data-live="redo">恢复</span></span></div><div class="tbl-wrap"><table class="tbl"><colgroup><col style="width:64px"><col><col style="width:84px"><col style="width:52px"></colgroup><thead><tr><th>配件</th><th>型号</th><th class="num">单价</th><th class="num">数量</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var note = (!E.norm(r.name || '')) || /^不要/.test(r.name || '') || /不含|自备|按需加购|无显卡需/.test(r.name || '') ? ' note' : '';
        h += '<tr><td class="cat">' + r.label + '</td>' +
             '<td class="mname' + note + '"><input class="cellinput" data-i="' + r.idx + '" value="' + UI.esc(r.name || '') + '" autocomplete="off"></td>' +
             '<td class="num"><input class="cellnum" data-price="' + r.idx + '" value="' + Math.round(r.price) + '" inputmode="decimal" autocomplete="off" title="可改单价"></td>' +
             '<td class="num"><input class="cellnum" data-i="' + r.idx + '" value="' + r.qty + '" inputmode="numeric" autocomplete="off"></td></tr>';
      });
      h += '</tbody></table></div></div>';

      // 计算过程卡（可收起/展开）：单价+6% / 未税成本 / 未税利润 / 含税成本 / 含税利润 （参考 WPS 直播间表 M-O-P-Q-R-S）
      var rate = 1 + s.profit / 100 + s.plat / 100;
      var ratePct = s.profit + s.plat;   // 顶部"单价+N%"的 N = 利润%+平台% 合计
      var sumQ = 0, sumO = 0, sumP = 0, sumR = 0, sumS = 0;
      rows.forEach(function (r) { var q = Math.round(r.price * r.qty * rate); var o = Math.round(r.c * r.qty); var rr = Math.round(r.d * r.qty); sumQ += q; sumO += o; sumP += (q - o); sumR += rr; sumS += (q - rr); });
      h += '<details class="card calc-proc"' + (s.calcOpen ? ' open' : '') + '><summary>🧮 计算过程（点击展开/收起）</summary><table class="tbl"><colgroup><col style="width:56px"><col><col style="width:72px"><col style="width:72px"><col style="width:72px"><col style="width:72px"><col style="width:72px"></colgroup><thead><tr><th>配件</th><th>型号</th><th class="num">单价+' + ratePct + '%</th><th class="num">未税成本</th><th class="num">未税利润</th><th class="num">含税成本</th><th class="num">含税利润</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var q = Math.round(r.price * r.qty * rate); var o = Math.round(r.c * r.qty); var rr = Math.round(r.d * r.qty);
        var p = q - o, s2 = q - rr;
        h += '<tr><td class="cat">' + r.label + '</td><td class="mname">' + UI.esc(r.name || '') + '</td>' +
             '<td class="num">' + q + '</td>' +
             '<td class="num">' + o + '</td>' +
             '<td class="num' + (p >= 0 ? '' : ' diff') + '">' + p + '</td>' +
             '<td class="num">' + rr + '</td>' +
             '<td class="num' + (s2 >= 0 ? '' : ' diff') + '">' + s2 + '</td></tr>';
      });
      h += '<tr class="grp"><td colspan="2">报价单下播前有效</td><td class="num">' + sumQ + '</td><td class="num">' + sumO + '</td><td class="num">' + sumP + '</td><td class="num">' + sumR + '</td><td class="num">' + sumS + '</td></tr>';
      h += '</tbody></table></details>';
      h += '</div>'; // 闭合 live-main（配件清单+计算过程 左列）

      h += '<div class="sumcard"><div class="card-title"><span class="tag">核算</span>利润' + s.profit + '% · 平台' + s.plat + '%</div>';
      h += '<div class="line"><span class="label">成本合计</span><span class="val">' + Math.round(cost) + '</span></div>';
      h += '<div class="line"><span class="label">运费·收客户（可改）</span><input class="cellnum ship" value="' + Math.round(shp) + '" inputmode="decimal" autocomplete="off" title="商家固定收取客户的运费，可自定义"></div>';
      h += '<div class="line"><span class="label">成本运费·按机箱（可改）</span><input class="cellnum costShip" value="' + Math.round(costShip) + '" inputmode="decimal" autocomplete="off" title="实际成本运费，按机箱价格自动算，可自定义覆盖"></div>';
      h += '<div class="line"><span class="label">平台扣点 ' + s.plat + '%</span><span class="val">' + Math.round(platFee) + '</span></div>';
      h += '<div class="line"><span class="label">利润金额 ' + s.profit + '%</span><span class="val">' + Math.round(profitAmt) + '</span></div>';
      h += '<div class="line"><span class="label">毛利（已扣平台）</span><span class="val">' + Math.round(gross) + '</span></div>';
      h += '<div class="line"><span class="label">纯利（扣成本运费）</span><span class="val profitc">' + Math.round(net) + '</span></div>';
      h += '<div class="line big"><span class="label">售价合计（可手动改）</span><input class="cellnum total" value="' + UI.esc(s.totalManual || Math.round(total)) + '" inputmode="decimal" autocomplete="off" title="可手动改，留空=自动"></div>';
      h += '<div class="bigbtns"><button class="btn primary" data-poster="live">🖼 生成报价单</button><button class="btn' + (canFps ? '' : ' disabled') + '" data-fps="live">🎮 保存帧数图</button></div>';
      h += '</div>';
      h += '</div>'; // split

      h += '</div>'; // pane-scroll
      h += '</div>'; // pane

      container.innerHTML = h;
      bind(container);
      root.AppStore.persistSheet('live', s.formName, {
        shopIdx: s.shopIdx, cfgKey: s.cfgKey, cfgText: s.cfgText,
        items: s.items, history: s.history, priceOv: s.priceOv,
        profit: s.profit, plat: s.plat, shipping: s.shipping, costShip: s.costShip, totalManual: s.totalManual,
        ssdNames: s.ssdNames, gpuNames: s.gpuNames, ssdIdx: s.ssdIdx, gpuIdx: s.gpuIdx,
        ssdOpts: s.ssdOpts, gpuOpts: s.gpuOpts, calcOpen: s.calcOpen
      }, '' + (s.totalManual || Math.round(total)));
    }

    function bind(container) {
      var shop = container.querySelector('#shopSel');
      shop.onchange = function () { s.shopIdx = SHOPS.indexOf(shop.value); onShop(container); };
      var ssd = container.querySelector('#ssdSel');
      ssd.onchange = function () {
        var idx = ssd.selectedIndex;
        if (!s.ssdOpts || !s.ssdOpts[idx]) return;
        backup(); s.items[4].name = E.applySsdOption(s.ssdNames[idx]); s.ssdIdx = idx; render(container);
      };
      var gpu = container.querySelector('#gpuSel');
      gpu.onchange = function () {
        var idx = gpu.selectedIndex;
        if (!s.gpuOpts || !s.gpuOpts[idx]) return;
        backup();
        var g = E.applyGpuOption(s.gpuNames[idx]);
        if (g.kind === 'mem') s.items[3].name = g.name; else s.items[5].name = g.name;
        s.gpuIdx = idx; render(container);
      };
      var cfgInput = container.querySelector('#cfgInput'), cfgBtn = container.querySelector('#cfgBtn');
      // ---- 建议源（每次调用读当前 s） ----
      var cfgSpec = function () {
        return {
          title: '选择 链接 + 配置名', currentKey: s.cfgKey, emptyText: '无匹配，可继续输入',
          source: function (kw) {
            var opts = shopConfigs(SHOPS[s.shopIdx]);
            var tokens = (kw || '').toLowerCase().split(/\s+/).filter(Boolean);
            return opts.map(function (l) {
              return { key: l.b, name: E.configNameOf(l.b), sub: (l.sheet || l.a || '') + ' · ' + E.linkNameOf(l.b) };
            }).filter(function (o) {
              if (!tokens.length) return true;
              var hay = (o.key + ' ' + o.name + ' ' + o.sub).toLowerCase();
              return tokens.every(function (t) { return hay.indexOf(t) >= 0; });
            });
          },
          onPick: function (key) {
            var opts = shopConfigs(SHOPS[s.shopIdx]);
            var found = opts.filter(function (o) { return o.b === key || E.configNameOf(o.b) === key; });
            if (found.length) { selectCfg(found[0].b, container); }
            else { var r = resolveCfgKey(key, opts); if (r) selectCfg(r, container); else UI.toast('未找到该配置'); }
          }
        };
      };
      var rowSpec = function (idx) {
        var cat = E.CATS[idx];
        return {
          title: '选择 ' + cat.label, emptyText: '无匹配，可继续输入',
          source: function (kw) {
            var table = E.dataPriceTable(cat.table);
            // 全表搜索，不按类目过滤（CPU/散热/内存/固态/其他共用三大件表），所有内容可见
            var list = E.searchParts(table, kw, 500, '').filter(function (n) { return !E.isJunkPart(n); });
            return list.slice(0, 60).map(function (n) { return { key: n, name: n }; });
          },
          onPick: function (name) { backup(); s.items[idx].name = name; render(container); }
        };
      };
      // ---- 事件委托 ----
      // ---- 每个输入框直接绑定（每次 render 重新绑定新元素，绝可靠）----
      var bindInput = function (input, spec) {
        if (!input) return;
        input.onfocus = function () { Picker.open(input, spec); };
        input.oninput = function () { Picker.refresh(input, spec); };
        input.onkeydown = function (e) {
          if (e.key === 'Enter') { e.preventDefault(); var val = (input.value || '').trim(); if (val) spec.onPick(val); }
        };
        input.onblur = function () { setTimeout(function () { Picker.close(); }, 160); };
      };
      bindInput(cfgInput, cfgSpec());
      container.querySelectorAll('.cellinput[data-i]').forEach(function (el) {
        bindInput(el, rowSpec(Number(el.dataset.i)));
      });
      cfgBtn.onclick = function (e) { e.stopPropagation(); Picker.open(cfgInput, cfgSpec()); };

      // 计算过程卡：展开/收起 由用户控制，点百分比按键重渲时保持状态
      var cd = container.querySelector('.calc-proc');
      if (cd) cd.ontoggle = function () { s.calcOpen = cd.open; };

      container.querySelectorAll('[data-profit]').forEach(function (el) {
        el.onclick = function () { s.profit = Number(el.dataset.profit); render(container); };
      });
      container.querySelectorAll('[data-plat]').forEach(function (el) {
        el.onclick = function () { s.plat = Number(el.dataset.plat); render(container); };
      });
      container.querySelectorAll('.cellnum[data-i]').forEach(function (el) {
        el.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
        el.onchange = function () {
          var n = parseFloat((el.value || '').replace(/[^\d.-]/g, ''));
          if (isNaN(n) || n < 0) { el.value = ''; return; }
          backup(); s.items[Number(el.dataset.i)].qty = n; render(container);
        };
      });
      container.querySelectorAll('.cellnum[data-price]').forEach(function (el) {
        el.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
        el.onchange = function () {
          var n = parseFloat((el.value || '').replace(/[^\d.-]/g, ''));
          backup(); s.priceOv[Number(el.dataset.price)] = isNaN(n) ? null : n; render(container);
        };
      });
      var shipIn = container.querySelector('.cellnum.ship');
      if (shipIn) {
        shipIn.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); shipIn.blur(); } };
        shipIn.onchange = function () {
          var n = parseFloat((shipIn.value || '').replace(/[^\d.-]/g, ''));
          if (isNaN(n) || n < 0) { render(container); return; }
          backup(); s.shipping = n; render(container);
        };
      }
      var costShipIn = container.querySelector('.cellnum.costShip');
      if (costShipIn) {
        costShipIn.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); costShipIn.blur(); } };
        costShipIn.onchange = function () {
          var v = costShipIn.value.trim();
          backup(); s.costShip = (v === '' || isNaN(parseFloat(v))) ? null : parseFloat(v); render(container);
        };
      }
      var totalEl = container.querySelector('.cellnum.total');
      if (totalEl) {
        totalEl.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); totalEl.blur(); } };
        totalEl.onchange = function () {
          var n = parseFloat((totalEl.value || '').replace(/[^\d.-]/g, ''));
          backup(); s.totalManual = (isNaN(n) || n === 0) ? '' : '' + totalEl.value.trim(); render(container);
        };
      }
      container.querySelector('[data-poster="live"]').onclick = function () { makePoster(container); };
      container.querySelector('[data-fps="live"]').onclick = function () { saveFps(container); };
      container.querySelectorAll('[data-live]').forEach(function (el) {
        el.onclick = function () {
          var a = el.dataset.live;
          if (a === 'clearcfg') liveClearCfg(container);
          else if (a === 'clear') liveClear(container);
          else if (a === 'undo') liveUndo(container);
          else if (a === 'redo') liveRedo(container);
        };
      });
    }

    function backup() {
      s.history.push(JSON.stringify({ i: s.items, s: s.shipping, cs: s.costShip, t: s.totalManual }));
      if (s.history.length > 10) s.history.shift(); s.redoStack = [];
    }
    function liveClearCfg(container) {
      if (!s.cfgKey) return;
      backup();
      s.cfgKey = ''; s.cfgText = '';
      s.items = [];
      for (var i = 0; i < 11; i++) s.items.push({ name: '', qty: 1 });
      s.shipping = 0; s.totalManual = '';
      render(container);
    }
    function liveClear(container) {
      if (!s.cfgKey) return;
      backup();
      s.items = s.items.map(function () { return { name: '', qty: 1 }; });
      render(container);
    }
    function liveUndo(container) {
      var last = s.history.pop();
      if (!last) { UI.toast('没有可撤销的'); return; }
      s.redoStack.push(JSON.stringify({ i: s.items, sh: s.shipping, cs: s.costShip, t: s.totalManual }));
      if (s.redoStack.length > 10) s.redoStack.shift();
      var st = JSON.parse(last);
      s.items = st.i || s.items; s.shipping = st.s != null ? st.s : s.shipping; s.costShip = st.cs !== undefined ? st.cs : s.costShip; s.totalManual = st.t != null ? st.t : '';
      render(container);
    }
    function liveRedo(container) {
      var last = s.redoStack.pop();
      if (!last) { UI.toast('没有可恢复的'); return; }
      s.history.push(JSON.stringify({ i: s.items, sh: s.shipping, cs: s.costShip, t: s.totalManual }));
      if (s.history.length > 10) s.history.shift();
      var st = JSON.parse(last);
      s.items = st.i || s.items; s.shipping = st.sh != null ? st.sh : s.shipping; s.costShip = st.cs !== undefined ? st.cs : s.costShip; s.totalManual = st.t != null ? st.t : '';
      render(container);
    }
    function saveFps(container) {
      var r = E.matchFps(s.items[0].name, s.items[3].name, s.items[3].qty, s.items[5].name);
      if (!r) { UI.toast('未匹配到帧数图'); return; }
      UI.openModal('<div class="m-title">🎮 游戏帧数图（' + UI.esc(r.label) + '）</div><img class="fpsimg" src="images/' + r.img + '" alt=""><div class="bigbtns"><button class="btn primary" id="fpsCp">📋 复制图片（可粘贴）</button><button class="btn" data-close>关闭</button></div>');
      var fp = document.getElementById('fpsCp');
      if (fp) fp.onclick = function () { UI.copyImageToClipboard((root.FPS_DATA && (root.FPS_DATA[r.img] || root.FPS_DATA[r.img.replace(/\.\w+$/, '')])) || ('images/' + r.img), r.img, null, 2); };
    }
    function makePoster(container) {
      var sell = 0, cost = 0, rows = [];
      for (var i = 0; i < 11; i++) {
        var it = s.items[i], cat = E.CATS[i], p = E.priceOf(E.dataPriceTable(cat.table), it.name);
        var base = p ? (cat.priceCol === 'f' ? p.f : p.e) : 0;
        sell += base * it.qty; cost += (p ? p.d : 0) * it.qty;
        rows.push({ l: cat.label, n: it.name, p: base, q: it.qty });
      }
      var shp = Number(s.shipping) || 0;
      var total = sell * (1 + s.profit / 100 + s.plat / 100) + shp;
      var platFee = total * s.plat / 100, profitAmt = total - sell - platFee - shp;
      var dataUrl = root.Poster.live({
        shopName: SHOPS[s.shopIdx], dateTxt: UI.dateTxt(), linker: s.cfgKey ? E.linkNameOf(s.cfgKey) : '', cfgName: s.cfgKey ? E.configNameOf(s.cfgKey) : '', nick: (root.App && root.App.nick) || '',
        rows: rows, shipping: shp, profit: s.profit, plat: s.plat, total: total, platFee: platFee, profitAmt: profitAmt,
        disclaimer: '报价为整机配置，具体以客服确认为准；装机+系统+稳定性压力测试+本地配送'
      });
      UI.openModal('<div class="m-title">直播间报价单（长图，下滑查看）</div><div class="posterWrap"><img src="' + dataUrl + '" alt="报价单"></div><div class="bigbtns"><button class="btn primary" id="dl">📋 复制图片（可粘贴）</button><button class="btn" data-close>关闭</button></div>');
      var dl = document.getElementById('dl');
      if (dl) dl.onclick = function () { UI.copyImageToClipboard(dataUrl, '直播间报价单_' + UI.stamp() + '.png'); };
    }

    function init(container, name) {
      if (name) s.formName = name;
      container.innerHTML = '';
      var saved = root.AppStore.getSheet('live', s.formName);
      if (saved && saved.cfgKey) {
        s.cfgKey = saved.cfgKey; s.items = saved.items; s.history = saved.history || []; s.redoStack = [];
        s.calcOpen = saved.calcOpen || false;
        s.ssdOpts = saved.ssdOpts || []; s.gpuOpts = saved.gpuOpts || [];
        s.shopIdx = saved.shopIdx || 0; s.cfgText = saved.cfgText || '';
        s.ssdNames = saved.ssdNames || []; s.gpuNames = saved.gpuNames || [];
        s.ssdIdx = saved.ssdIdx || 0; s.gpuIdx = saved.gpuIdx || 0;
        s.profit = saved.profit != null ? saved.profit : 4; s.plat = saved.plat != null ? saved.plat : 2;
        s.shipping = saved.shipping != null ? saved.shipping : 99; s.costShip = saved.costShip !== undefined ? saved.costShip : null; s.totalManual = saved.totalManual || '';
        s.priceOv = saved.priceOv || [];
        render(container);
      } else {
        onShop(container);
      }
    }

    return { init: init, render: render };
  }

  root.PageLive = { create: create, init: function (c, n) { return create({ name: n }).init(c, n); } };
})(typeof self !== 'undefined' ? self : this);

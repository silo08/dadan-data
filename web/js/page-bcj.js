// 补差价页（网页版）：工厂版 —— 支持多实例并存（三栏主界面 + 右侧第二配置单），state 各自独立
(function (root) {
  var E = root.ENGINE, UI = root.UI, Picker = root.Picker;
  var SHOPS = ['抖音极咖', '抖音沃恩', 'PDD奔尔', 'PDD极咖'];
  var LTEXTS = ['不要CPU','不要CPU散热器','不要主板','不要内存','不要固态','不要显卡','不要电源','不要机箱','原配置不含机箱风扇，按需加购','原配置不含机箱风扇，按需加购','原配置不含机箱风扇，按需加购'];

  function create(opts) {
    opts = opts || {};
    var s = {
      formName: opts.name || '补差价',
      tree: E.linkTree(),
      shopIdx: 0, cfgKey: '', cfgText: '',
      orig: [], mod: [], history: [], redoStack: [],
      ssdAdd: 0, gpuAdd: 0, ssdOpts: [], gpuOpts: [],
      ssdNames: [], gpuNames: [], ssdIdx: 0, gpuIdx: 0,
      pTotalManual: '', nick: (root.App && root.App.nick) || ''
    };
    for (var i = 0; i < 11; i++) { s.orig.push({ name: '', qty: 1, ltext: LTEXTS[i] }); s.mod.push({ name: '', qty: 1 }); }

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

    function onShop(container) {
      var cfgs = shopConfigs(SHOPS[s.shopIdx]);
      if (cfgs.length) selectCfg(cfgs[0].b, container);
      else { s.cfgKey = ''; s.cfgText = ''; }
    }
    function selectCfg(key, container) {
      s.cfgKey = key; s.cfgText = E.configNameOf(key);
      applyConfig(container);
    }
    function applyConfig(container) {
      if (!s.cfgKey) return;
      var f = E.fillConfig(s.cfgKey);
      s.orig = f.items;
      s.mod = E.modDefault(f.items);
      s.history = []; s.redoStack = [];
      var lk = currentLink();
      var ssdOpts = E.cleanSsd(lk && lk.ssd), gpuOpts = E.cleanGpu(lk && lk.gpu);
      s.ssdOpts = ssdOpts; s.gpuOpts = gpuOpts;
      s.ssdNames = ssdOpts.map(function (o) { return o.n; });
      s.gpuNames = gpuOpts.map(function (o) { return o.n; });
      s.ssdAdd = 0; s.gpuAdd = 0;
      if (ssdOpts.length) { s.ssdAdd = parseFloat(ssdOpts[0].p) || 0; s.orig[4].name = E.applySsdOption(ssdOpts[0].n); }
      if (gpuOpts.length) {
        s.gpuAdd = parseFloat(gpuOpts[0].p) || 0;
        var g = E.applyGpuOption(gpuOpts[0].n);
        if (g.kind === 'mem') s.orig[3].name = g.name; else s.orig[5].name = g.name;
      }
      s.ssdIdx = 0; s.gpuIdx = 0;
      render(container);
    }

    function rowLtext(i) { return (s.orig[i] && s.orig[i].ltext) ? s.orig[i].ltext : LTEXTS[i]; }

    // 说明性文案判断："不要XX" / "原配置不含…" / "无显卡需自备…" / 空 → 用说明色（区别于具体型号）
    function isNote(name) {
      var n = E.norm(name || '');
      if (!n) return true;
      if (/^不要/.test(n)) return true;
      if (/不含|自备|按需加购|无显卡需/.test(n)) return true;
      return false;
    }
    function mclass(name) { return 'mname' + (isNote(name) ? ' note' : ''); }
    // 有效价判断：型号在价格表里查到对象，且 售价(e)或成本(d) 任一>0 才算"有货/有价"；
    // 查不到(null) 或 e/d 全为0(占位/无货) → 无价。原配无价=不能作为换货改配基准。
    function hasPrice(cat, name) {
      if (!name || isNote(name)) return false;
      var p = E.priceOf(E.dataPriceTable(cat.table), name);
      if (!p) return false;
      return (p.e > 0 || p.d > 0);
    }

    function render(container) {
      var cs = E.computeState(s.orig, s.mod);
      var base = E.configPrice(s.cfgKey, s.ssdAdd, s.gpuAdd);
      var totalManual = s.pTotalManual ? Math.round(Number(s.pTotalManual)) : Math.round(base + cs.sums.O);
      var profit = s.pTotalManual ? (totalManual - Math.round(base)) : cs.sums.V;
      var noPriceCount = 0;      // 原配无货 行数（重点）
      var modNoCount = 0;        // 改配无价 行数（次要）
      var canFps = !!E.matchFps(s.mod[0].name, s.mod[3].name, s.mod[3].qty, s.mod[5].name);

      var h = '';
      h += '<div class="pane">';
      h += '<div class="pane-scroll">';
      h += '<div class="pagehead"><div class="ph-title">' + UI.esc(s.formName || '补差价') + '</div><div class="ph-sub">店铺 → 链接+配置名 → 固态/显卡 联动；点类目 = 原配填入改配</div></div>';

      // 配置区（横向栅格）
      h += '<div class="card" style="margin-bottom:16px"><div class="card-title"><span class="tag">配置</span>选择店铺 / 链接 / 固态 / 显卡</div><div class="cfg-grid bcj-grid">';
      h += '<div class="c-shop"><div class="field">店铺</div><select id="shopSel" class="sel">';
      SHOPS.forEach(function (sp, i) { h += '<option value="' + sp + '"' + (i === s.shopIdx ? ' selected' : '') + '>' + sp + '</option>'; });
      h += '</select></div>';
      h += '<div class="c-link"><div class="field">链接 + 配置名（可粘贴配置名自动筛选）</div><div class="combo"><input id="cfgInput" class="sel" placeholder="选择或粘贴配置名称…" value="' + UI.esc(s.cfgText) + '" autocomplete="off"><span class="combo-btn" id="cfgBtn">▾</span></div></div>';
      h += '<div class="c-ssd"><div class="field">固态</div><select id="ssdSel" class="sel">';
      (s.ssdNames || []).forEach(function (n, i) { h += '<option' + (i === s.ssdIdx ? ' selected' : '') + '>' + UI.esc(n) + '</option>'; });
      h += '</select></div>';
      h += '<div class="c-gpu"><div class="field">显卡</div><select id="gpuSel" class="sel">';
      (s.gpuNames || []).forEach(function (n, i) { h += '<option' + (i === s.gpuIdx ? ' selected' : '') + '>' + UI.esc(n) + '</option>'; });
      h += '</select></div>';
      h += '</div></div>';

      // 原配 / 改配 合并为【同一张表】左右两组列（每行 <tr> 同时含原配+改配，天然同一水平线、永不错位）
      h += '<div class="duo">';
      h += '<div class="card duo-card">';
      h += '<div class="tbl-wrap"><table class="tbl">' +
           '<colgroup><col style="width:82px"><col><col style="width:42px"><col style="width:82px"><col><col style="width:74px"><col style="width:44px"></colgroup>' +
           '<thead>' +
           '<tr class="grp"><th colspan="3" class="grp-orig"><span class="g-tag gt-orig">原配配件</span></th><th colspan="4" class="grp-mod"><span class="g-tag gt-mod">改配配件</span><button class="chip vc gd-fill" data-act="copyall" title="把原配配件填入改配">⬇ 全部填入改配</button><button class="chip vc gd-fill" data-act="clearcfg">清空配置</button><button class="chip vc gd-fill" data-act="clear">清空</button><button class="chip vc gd-fill" data-act="undo">撤销</button><button class="chip vc gd-fill" data-act="redo">恢复</button></th></tr>' +
           '<tr><th>配件</th><th>型号</th><th class="num">数量</th><th>配件</th><th>型号</th><th class="num">补差价</th><th class="num">数量</th></tr>' +
           '</thead><tbody>';
      for (var i = 0; i < 11; i++) {
        var it = s.orig[i];
        var r = cs.rows[i];
        var cat = E.CATS[i];
        // 无价：型号有具体内容(非说明性) 且 在价格表里"查不到 或 e/d全0" → 视为无货/无价
        var origName = (it && it.name) || '';
        var modName = (r.mod && r.mod.name) || '';
        var origNo = !!origName && !isNote(origName) && !hasPrice(cat, origName);
        var modNo = !!modName && !isNote(modName) && !hasPrice(cat, modName);
        h += '<tr' + (r.changed ? ' class="changed"' : '') + '>' +
             '<td class="cat">' + cat.label + '</td>' +
             '<td class="' + mclass(it.name) + (origNo ? ' nowarn' : '') + '"><input class="cellinput" data-kind="orig" data-i="' + i + '" value="' + UI.esc(it.name || '') + '" autocomplete="off" title="原配无货，不能作为换货改配基准">' + (origNo ? '<span class="npx" title="原配无货，不能作为换货改配基准">▲!</span>' : '') + '</td>' +
             '<td class="num"><input class="cellnum" data-kind="orig" data-i="' + i + '" value="' + it.qty + '" inputmode="numeric" autocomplete="off"></td>' +
             '<td><button class="cbtn" data-copyrow="' + i + '"><span class="cbtn-txt">' + cat.label + '</span><span class="cbtn-ic">→</span></button></td>' +
             '<td class="' + mclass(r.mod.name) + (modNo ? ' nowarn' : '') + '"><input class="cellinput" data-kind="mod" data-i="' + i + '" value="' + UI.esc(r.mod.name || '') + '" autocomplete="off">' + (modNo ? '<span class="npx" title="该改配型号无价格">▲!</span>' : '') + '</td>' +
             '<td class="num diff' + (modNo ? ' nowarn' : '') + '"><input class="cellnum" data-diff="1" data-i="' + i + '" value="' + (r.O === 0 ? '0' : (r.O > 0 ? '+' : '') + Math.round(r.O)) + '" autocomplete="off"></td>' +
             '<td class="num"><input class="cellnum" data-kind="mod" data-i="' + i + '" value="' + r.mod.qty + '" inputmode="numeric" autocomplete="off"></td></tr>';
        if (origNo) noPriceCount++;
        if (modNo) modNoCount++;
      }
      h += '</tbody></table></div></div>';
      h += '</div>'; // duo

      // 快捷改配
      h += '<div class="chips-block" style="margin-top:16px">';
      h += '<div class="chiptitle">添加 ⚡ 内存 +1</div><div class="chips">';
      E.options.quickAdd.forEach(function (a, idx) { h += '<span class="chip" data-chipadd="' + idx + '">' + UI.esc(a.label) + '</span>'; });
      h += '</div>';
      h += '<div class="chiptitle" style="margin-top:12px">改配 🔄 内存/固态替换</div><div class="chips">';
      E.options.quickRep.forEach(function (r2, idx) { h += '<span class="chip" data-chiprep="' + idx + '">' + UI.esc(r2.label) + '</span>'; });
      h += '</div></div>';

      // 补差价计算过程卡（默认收起，放进 pane-scroll 内与上面卡片对齐）：原配售价/成本、改配售价/成本、增加利润
      var sR = 0, sS = 0, sT = 0, sU = 0, sV = 0;
      cs.rows.forEach(function (r) { sR += Math.round(r.R); sS += Math.round(r.S); sT += Math.round(r.T); sU += Math.round(r.U); sV += Math.round(r.V); });
      h += '<details class="card calc-proc"><summary>🧮 计算过程（点击展开/收起）</summary><table class="tbl"><colgroup><col style="width:56px"><col><col style="width:90px"><col style="width:90px"><col style="width:90px"><col style="width:90px"><col style="width:90px"></colgroup><thead><tr><th>配件</th><th>型号</th><th class="num">原配售价</th><th class="num">原配成本</th><th class="num">改配售价</th><th class="num">改配成本</th><th class="num">增加利润</th></tr></thead><tbody>';
      cs.rows.forEach(function (r) {
        h += '<tr><td class="cat">' + UI.esc(r.cat) + '</td><td class="mname" title="' + UI.esc(r.mod && r.mod.name || '') + '">' + UI.esc(r.mod && r.mod.name || '') + '</td>' +
             '<td class="num">' + Math.round(r.R) + '</td><td class="num">' + Math.round(r.S) + '</td>' +
             '<td class="num">' + Math.round(r.T) + '</td><td class="num">' + Math.round(r.U) + '</td>' +
             '<td class="num">' + Math.round(r.V) + '</td></tr>';
      });
      h += '<tr class="grp"><td colspan="2">合计</td><td class="num">' + sR + '</td><td class="num">' + sS + '</td><td class="num">' + sT + '</td><td class="num">' + sU + '</td><td class="num">' + sV + '</td></tr>';
      h += '</tbody></table></details>';

      // 核算卡：放进 pane-scroll 紧跟计算过程卡（顶部紧贴其底部）；position:sticky bottom:0 → 内容超长时吸底、短时不悬空
      h += '<div class="pane-sum"><div class="sumcard">';
      if (noPriceCount > 0) {
        h += '<div class="price-warn">⚠ <b>' + noPriceCount + '</b> 个原配配件无货/无价格，不能作为换货改配的基准，相关补差价不可用，请先补原配价格或更换配置</div>';
      } else if (modNoCount > 0) {
        h += '<div class="price-warn">⚠ <b>' + modNoCount + '</b> 个改配型号无价格（成本为0），补差价仅供参考，请核实后再报</div>';
      }
      h += '<div class="line2"><span class="cell"><span class="label">原配成本</span><span class="val">' + Math.round(cs.sums.S) + '</span></span><span class="cell"><span class="label">配置价</span><span class="val">' + Math.round(base) + '</span></span></div>';
      h += '<div class="line2"><span class="cell"><span class="label">改配成本</span><span class="val">' + Math.round(cs.sums.U) + '</span></span><span class="cell"><span class="label">补差价</span><span class="val diffc">' + (cs.sums.O === 0 ? '0' : (cs.sums.O > 0 ? '+' : '') + Math.round(cs.sums.O)) + '</span></span></div>';
      h += '<div class="line"><span class="label">增加利润</span><span class="val profitc">' + (profit === 0 ? '0' : (profit > 0 ? '+' : '') + Math.round(profit)) + '</span></div>';
      h += '<div class="line big"><span class="label">配置价+补差价 = 券前总价</span><input class="cellnum total" value="' + UI.esc(totalManual) + '" inputmode="decimal" autocomplete="off" title="可手动改总价，留空=自动"></div>';
      h += '<div class="bigbtns"><button class="btn primary" data-poster="bcj">🖼 生成报价单图片</button><button class="btn' + (canFps ? '' : ' disabled') + '" data-fps="bcj">🎮 保存游戏帧数图</button></div>';
      h += '</div></div>';
      h += '</div>'; // pane-scroll
      h += '</div>'; // pane 结束

      container.innerHTML = h;
      bind(container);
      root.AppStore.persistSheet('bcj', s.formName, {
        shopIdx: s.shopIdx, cfgKey: s.cfgKey, cfgText: s.cfgText,
        orig: s.orig, mod: s.mod, history: s.history,
        ssdAdd: s.ssdAdd, gpuAdd: s.gpuAdd, ssdOpts: s.ssdOpts, gpuOpts: s.gpuOpts,
        ssdNames: s.ssdNames, gpuNames: s.gpuNames, ssdIdx: s.ssdIdx, gpuIdx: s.gpuIdx, pTotalManual: s.pTotalManual
      }, '' + totalManual);
    }

    function bind(container) {
      var shop = container.querySelector('#shopSel');
      shop.onchange = function () { s.shopIdx = SHOPS.indexOf(shop.value); s.history = []; onShop(container); };
      var ssd = container.querySelector('#ssdSel');
      ssd.onchange = function () {
        var idx = ssd.selectedIndex;
        if (!s.ssdOpts || !s.ssdOpts[idx]) return;
        backup(); s.orig[4].name = E.applySsdOption(s.ssdNames[idx]); s.ssdAdd = parseFloat(s.ssdOpts[idx].p) || 0; s.ssdIdx = idx; render(container);
      };
      var gpu = container.querySelector('#gpuSel');
      gpu.onchange = function () {
        var idx = gpu.selectedIndex;
        if (!s.gpuOpts || !s.gpuOpts[idx]) return;
        backup();
        var g = E.applyGpuOption(s.gpuNames[idx]);
        if (g.kind === 'mem') s.orig[3].name = g.name; else s.orig[5].name = g.name;
        s.gpuAdd = parseFloat(s.gpuOpts[idx].p) || 0; s.gpuIdx = idx; render(container);
      };
      var cfgInput = container.querySelector('#cfgInput');
      var cfgBtn = container.querySelector('#cfgBtn');

      // ---- 建议源（每次调用读当前 s，不受表格重建影响） ----
      var cfgSpec = function () {
        return {
          title: '选择 链接 + 配置名',
          currentKey: s.cfgKey,
          emptyText: '无匹配，可继续输入',
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
            var resolved = (opts.some(function (o) { return o.b === key; })) ? key : resolveCfgKey(key, opts);
            if (resolved) { selectCfg(resolved, container); }
            else { UI.toast('未找到该配置，确认关键词后重试'); }
          }
        };
      };
      var rowSpec = function (kind, idx) {
        var cat = E.CATS[idx];
        return {
          title: cat.label + '（点=填入）',
          emptyText: '无匹配，可继续输入',
          source: function (kw) {
            var table = E.dataPriceTable(cat.table);
            // 全表搜索，不按类目过滤（CPU/散热/内存/固态/其他共用三大件表），所有内容可见
            var list = E.searchParts(table, kw, 500, '').filter(function (n) { return !E.isJunkPart(n); });
            return list.slice(0, 60).map(function (n) { return { key: n, name: n }; });
          },
          onPick: function (name) {
            backup();
            if (kind === 'orig') { s.orig[idx].name = name; s.mod[idx].name = rowLtext(idx); }
            else s.mod[idx].name = name;
            render(container);
          }
        };
      };

      // ---- 每个输入框直接绑定（每次 render 重新绑定新元素，绝可靠；闭包捕获当前 input/kind/idx）----
      var bindInput = function (input, spec) {
        if (!input) return;
        input.dataset._spec = '1';
        input.onfocus = function () { Picker.open(input, spec); };
        input.oninput = function () { Picker.refresh(input, spec); };
        input.onkeydown = function (e) {
          if (e.key === 'Enter') { e.preventDefault(); var val = (input.value || '').trim(); if (val) spec.onPick(val); }
        };
        input.onblur = function () { setTimeout(function () { Picker.close(); }, 160); };
      };
      bindInput(cfgInput, cfgSpec());
      container.querySelectorAll('.cellinput[data-kind]').forEach(function (el) {
        bindInput(el, rowSpec(el.dataset.kind, Number(el.dataset.i)));
      });
      cfgBtn.onclick = function (e) { e.stopPropagation(); Picker.open(cfgInput, cfgSpec()); };

      // 数量/补差价：内联编辑，change/回车提交（不弹窗、不失焦）
      container.querySelectorAll('.cellnum[data-kind]').forEach(function (el) {
        el.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
        el.onchange = function () {
          var n = parseFloat((el.value || '').replace(/[^\d.-]/g, ''));
          if (isNaN(n) || n < 0) { el.value = ''; return; }
          backup();
          if (el.dataset.kind === 'orig') s.orig[Number(el.dataset.i)].qty = n;
          else s.mod[Number(el.dataset.i)].qty = n;
          render(container);
        };
      });
      container.querySelectorAll('.cellnum[data-diff]').forEach(function (el) {
        el.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
        el.onchange = function () {
          var n = parseFloat((el.value || '').replace(/[^\d.-]/g, ''));
          if (isNaN(n)) { render(container); return; }
          backup(); s.mod[Number(el.dataset.i)].oOverride = n; render(container);
        };
      });
      container.querySelectorAll('.cbtn[data-copyrow]').forEach(function (el) {
        el.onclick = function () { copyRow(container, Number(el.dataset.copyrow)); };
      });
      container.querySelectorAll('[data-act]').forEach(function (el) {
        el.onclick = function () {
          var act = el.dataset.act;
          if (act === 'copyall') copyAll(container);
          else if (act === 'clearcfg') onClearCfg(container);
          else if (act === 'clear') onClear(container);
          else if (act === 'undo') onUndo(container);
          else if (act === 'redo') onRedo(container);
          else if (act === 'copysearch') copySearch(container);
        };
      });
      container.querySelectorAll('[data-chipadd]').forEach(function (el) {
        el.onclick = function () { chipAdd(container, Number(el.dataset.chipadd)); };
      });
      container.querySelectorAll('[data-chiprep]').forEach(function (el) {
        el.onclick = function () { chipRep(container, Number(el.dataset.chiprep)); };
      });
      var totalEl = container.querySelector('.cellnum.total');
      if (totalEl) {
        totalEl.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); totalEl.blur(); } };
        totalEl.onchange = function () {
          var n = parseFloat((totalEl.value || '').replace(/[^\d.-]/g, ''));
          backup(); s.pTotalManual = (isNaN(n) || n === 0) ? '' : '' + totalEl.value.trim();
          render(container);
        };
      }
      var pb = container.querySelector('[data-poster="bcj"]');
      pb.onclick = function () { makePoster(container); };
      var fps = container.querySelector('[data-fps="bcj"]');
      fps.onclick = function () { saveFps(container); };
    }

    function resolveCfgKey(text, opts) {
      if (!text) return '';
      var t = String(text).trim().toLowerCase();
      var arr = opts || shopConfigs(SHOPS[s.shopIdx]);
      // 1) 精确匹配 key
      for (var i = 0; i < arr.length; i++) if (arr[i].b === text) return arr[i].b;
      // 2) 精确匹配配置名 / 链接名
      for (var j = 0; j < arr.length; j++) if (E.configNameOf(arr[j].b) === text || E.linkNameOf(arr[j].b) === text) return arr[j].b;
      // 3) 模糊：key / 配置名 / 链接名 / 表格名 全含关键词
      var hit = [];
      for (var k = 0; k < arr.length; k++) {
        var hay = (arr[k].b + ' ' + (arr[k].sheet || '') + ' ' + (arr[k].a || '')).toLowerCase();
        if (hay.indexOf(t) >= 0) hit.push(arr[k].b);
      }
      if (hit.length === 1) return hit[0];
      return ''; // 多个/无 => 交给调用方处理
    }

    function copyRow(container, idx) { backup(); s.mod[idx] = { name: s.orig[idx].name, qty: s.orig[idx].qty }; render(container); }
    function copyAll(container) { backup(); s.mod = E.cloneItems(s.orig); render(container); }
    // 复制平台比价链接（对齐小程序"复制平台比价链接"）：取改配里第一个有价格的配件，生成拼多多搜索链接并复制
    function copySearch(container) {
      var parts = [];
      for (var i = 0; i < 11; i++) {
        var nm = s.mod[i].name;
        if (nm && hasPrice(E.CATS[i], nm)) parts.push(nm);
      }
      // 全网比价弹窗（需求5）：预填改配第一个有价型号，也可手改
      (root.App && root.App.openBijia ? root.App.openBijia() : UI.openModal('比价'));
      var inp = document.getElementById('bijiaInput');
      if (inp && parts[0]) inp.value = parts[0];
    }
    function chipAdd(container, idx) {
      var a = E.options.quickAdd[idx]; if (!a) return;
      backup(); s.orig[3].name = a.name; s.mod[3].name = a.name; s.mod[3].qty = 2; render(container);
    }
    function chipRep(container, idx) {
      var r = E.options.quickRep[idx]; if (!r) return;
      backup();
      if (r.row === 'mem') { s.orig[3].name = r.name; s.mod[3] = { name: '不要内存', qty: 1 }; }
      else { s.orig[4].name = r.name; s.mod[4] = { name: '不要固态', qty: 1 }; }
      render(container);
    }
    function backup() {
      s.history.push(JSON.stringify({ o: s.orig, m: s.mod, t: s.pTotalManual }));
      if (s.history.length > 10) s.history.shift();
      s.redoStack = [];
    }
    // 顶部按钮动作（只作用于当前实例 = 当前页）
    function onClearCfg(container) {
      if (!s.cfgKey) return;
      backup();
      s.cfgKey = ''; s.cfgText = '';
      s.orig = []; s.mod = [];
      for (var i = 0; i < 11; i++) { s.orig.push({ name: '', qty: 1, ltext: LTEXTS[i] }); s.mod.push({ name: '', qty: 1 }); }
      s.ssdAdd = 0; s.gpuAdd = 0; s.ssdNames = []; s.gpuNames = []; s.ssdIdx = 0; s.gpuIdx = 0; s.pTotalManual = '';
      render(container);
    }
    function onClear(container) {
      if (!s.cfgKey) return;
      backup();
      s.orig = s.orig.map(function () { return { name: '', qty: 1 }; });
      s.mod = E.modDefault(s.orig);
      render(container);
    }
    function onUndo(container) {
      var last = s.history.pop();
      if (!last) { UI.toast('没有可撤销的'); return; }
      s.redoStack.push(JSON.stringify({ o: s.orig, m: s.mod, t: s.pTotalManual }));
      if (s.redoStack.length > 10) s.redoStack.shift();
      var st = JSON.parse(last);
      s.orig = st.o; s.mod = st.m; s.pTotalManual = st.t || '';
      render(container);
    }
    function onRedo(container) {
      var last = s.redoStack.pop();
      if (!last) { UI.toast('没有可恢复的'); return; }
      s.history.push(JSON.stringify({ o: s.orig, m: s.mod, t: s.pTotalManual }));
      if (s.history.length > 10) s.history.shift();
      var st = JSON.parse(last);
      s.orig = st.o; s.mod = st.m; s.pTotalManual = st.t || '';
      render(container);
    }

    function saveFps(container) {
      var r = E.matchFps(s.mod[0].name, s.mod[3].name, s.mod[3].qty, s.mod[5].name);
      if (!r) { UI.toast('未匹配到帧数图'); return; }
      UI.openModal('<div class="m-title">🎮 游戏帧数图（' + UI.esc(r.label) + '）</div>' +
        '<img class="fpsimg" src="images/' + r.img + '" alt="">' +
        '<div class="bigbtns"><button class="btn primary" id="fpsCp">📋 复制图片（可粘贴）</button><button class="btn" data-close>关闭</button></div>');
      var fp = document.getElementById('fpsCp');
      if (fp) fp.onclick = function () { UI.copyImageToClipboard((root.FPS_DATA && (root.FPS_DATA[r.img] || root.FPS_DATA[r.img.replace(/\.\w+$/, '')])) || ('images/' + r.img), r.img, null, 2); };
    }
    function makePoster(container) {
      var cs = E.computeState(s.orig, s.mod);
      var base = E.configPrice(s.cfgKey, s.ssdAdd, s.gpuAdd);
      var shopName = SHOPS[s.shopIdx];
      var nick = (root.App && root.App.nick) || '';
      var dataUrl = root.Poster.bcj({
        shopName: shopName, dateTxt: UI.dateTxt(), linker: s.cfgKey ? E.linkNameOf(s.cfgKey) : '', cfgName: s.cfgKey ? E.configNameOf(s.cfgKey) : '', nick: nick,
        orig: s.orig.map(function (it, i) { return { l: E.CATS[i].label, n: it.name, q: it.qty }; }),
        mod: cs.rows.map(function (r, i) { return { l: E.CATS[i].label, n: r.mod.name, q: r.mod.qty, d: r.O }; }),
        base: base, sumO: cs.sums.O, total: base + cs.sums.O,
        extra: '装机+系统+稳定性压力测试+本地配送',
        disclaimer: '改配的型号，不是同品牌的配件，18点后我司客服无法咨询品牌代理的库存情况，需第二天白天确认，当天晚上只做报价，如当天晚间下单次日改配无货，请配合更换配件重新合计补差价/或货退货退款'
      });
      UI.openModal('<div class="m-title">电脑报价单（长图，下滑查看）</div>' +
        '<div class="posterWrap"><img src="' + dataUrl + '" alt="报价单"></div>' +
        '<div class="bigbtns"><button class="btn primary" id="dl">📋 复制图片（可粘贴）</button><button class="btn" data-close>关闭</button></div>');
      var dl = document.getElementById('dl');
      if (dl) dl.onclick = function () { UI.copyImageToClipboard(dataUrl, '电脑报价单_' + UI.stamp() + '.png'); };
    }

    function init(container, name) {
      if (name) s.formName = name;
      container.innerHTML = '';
      var saved = root.AppStore.getSheet('bcj', s.formName);
      if (saved && saved.cfgKey) {
        s.cfgKey = saved.cfgKey; s.orig = saved.orig; s.mod = saved.mod;
        s.history = saved.history || []; s.redoStack = [];
        s.ssdAdd = saved.ssdAdd || 0; s.gpuAdd = saved.gpuAdd || 0;
        s.ssdOpts = saved.ssdOpts || []; s.gpuOpts = saved.gpuOpts || [];
        s.shopIdx = saved.shopIdx || 0; s.cfgText = saved.cfgText || '';
        s.ssdNames = saved.ssdNames || []; s.gpuNames = saved.gpuNames || [];
        s.ssdIdx = saved.ssdIdx || 0; s.gpuIdx = saved.gpuIdx || 0;
        s.pTotalManual = saved.pTotalManual || '';
        render(container);
      } else {
        onShop(container);
      }
    }

    return { init: init, render: render };
  }

  // 兼容旧式单例调用（保留）：每次 init 会新建一个实例，避免 state 混乱
  root.PageBuchajia = { create: create, init: function (c, n) { return create({ name: n }).init(c, n); } };
})(typeof self !== 'undefined' ? self : this);

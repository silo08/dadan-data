// 打单小程序 计算引擎（浏览器 + 小程序共用，ES5）
(function (root) {
  var data = (typeof module !== 'undefined' && module.exports)
    ? require('./data.js')
    : root.DSHDATA;

  // ---------- 工具 ----------
  function norm(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/\s+/g, ' ').trim();
  }

  function priceOf(table, name) {
    if (!table || !name) return null;
    var p = table[norm(name)];
    return p ? p : null;
  }

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  // 行类别 -> 价格表 + 售价列 (e 或 f) + 成本列(d)
  var CATS = [
    { label: 'CPU',   table: 'san',   priceCol: 'e', cat: 'cpu' },
    { label: '散热',  table: 'san',   priceCol: 'e', cat: 'cool' },
    { label: '主板',  table: 'ban',   priceCol: 'e', cat: 'board' },
    { label: '内存',  table: 'san',   priceCol: 'e', cat: 'mem' },
    { label: '固态',  table: 'san',   priceCol: 'e', cat: 'ssd' },
    { label: '显卡',  table: 'ka',    priceCol: 'f', cat: 'gpu' },
    { label: '电源',  table: 'yuan',  priceCol: 'e', cat: 'psu' },
    { label: '机箱',  table: 'xiang', priceCol: 'e', cat: 'case' },
    { label: '其他1', table: 'san',   priceCol: 'e', cat: 'other' },
    { label: '其他2', table: 'san',   priceCol: 'e', cat: 'other' },
    { label: '其他3', table: 'san',   priceCol: 'e', cat: 'other' }
  ];

  // 内存行号（1-based item index）
  var MEM_ROW = 4, SSD_ROW = 5, GPU_ROW = 6;

  // ---------- 配置查找 ----------
  function stripSuffix(key) {
    // 去掉配置名末尾的内存变体后缀 C40/C36/C28/C38
    var m = String(key).match(/(.*?)\s*(C40|C38|C36|C28)\s*$/);
    if (m) return { base: m[1].trim(), tag: m[2] };
    return { base: key, tag: '' };
  }

  function findConfig(key) {
    var cfg = null;
    for (var i = 0; i < data.configs.length; i++) {
      if (data.configs[i].key === key) { cfg = data.configs[i]; break; }
    }
    if (!cfg) {
      var s = stripSuffix(key);
      for (var j = 0; j < data.configs.length; j++) {
        if (data.configs[j].key === s.base) { cfg = data.configs[j]; break; }
      }
    }
    return cfg;
  }

  // 填充 11 行：返回 {items:[{name,qty}], tag}
  function fillConfig(key) {
    var cfg = findConfig(key);
    var items = [];
    var tag = '';
    if (cfg) {
      var s = stripSuffix(key);
      tag = s.tag;
      for (var i = 0; i < 11; i++) {
        var it = cfg.items[i] || { name: '', qty: 1, ltext: '' };
        var qty = it.qty === '' || it.qty === null || it.qty === undefined ? 1 : num(it.qty);
        items.push({ name: it.name, qty: qty, ltext: it.ltext || '' });
      }
      // 内存变体兜底：配置名带 C40/C36/C28/C38 后缀且内存行未含该变体时，才替换内存行
      if (tag && norm(items[MEM_ROW - 1].name).toUpperCase().indexOf(tag) < 0) {
        for (var v = 0; v < data.variants.length; v++) {
          if (data.variants[v].tag === tag) { items[MEM_ROW - 1].name = data.variants[v].name; break; }
        }
      }
    }
    return { items: items, tag: tag };
  }

  // 自然排序：数字按数值、中文按拼音/字母序，尽量与 WPS 表格一致
  function natCmp(a, b) {
    try { return a.localeCompare(b, 'zh-Hans-CN', { numeric: true }); }
    catch (e) { return a < b ? -1 : (a > b ? 1 : 0); }
  }

  // ---------- 配件搜索（多关键词，空格分隔，按类目过滤，按名称排序） ----------
  function searchParts(table, keywords, limit, cat) {
    if (!table) return [];
    var kws = String(keywords || '').toLowerCase().split(/\s+/).filter(function (k) { return k.length > 0; });
    var out = [];
    var keys = Object.keys(table);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      if (cat && (!table[name].cat || table[name].cat !== cat)) { continue; }
      if (kws.length === 0) { out.push(name); }
      else {
        var hay = name.toLowerCase();
        var ok = true;
        for (var k = 0; k < kws.length; k++) {
          if (hay.indexOf(kws[k]) < 0) { ok = false; break; }
        }
        if (ok) out.push(name);
      }
    }
    // 先收集全部匹配，再按名称排序，最后截取 limit（不再提前 break 导致顺序乱）
    out.sort(natCmp);
    if (limit && out.length > limit) out = out.slice(0, limit);
    return out;
  }

  // ---------- 固态/显卡下拉应用（对应 Excel J16/J17 逻辑） ----------
  function applySsdOption(opt) {
    var m = data.ssdMap || {};
    if (m[opt]) return m[opt];
    return opt;
  }
  // 显卡下拉：内存类选项写到内存行；其余写显卡行（"无显卡需自备…"保持原文显示）
  function applyGpuOption(opt) {
    var m = data.gpuMemMap || {};
    if (m[opt]) return { kind: 'mem', name: m[opt] };
    return { kind: 'gpu', name: opt };
  }

  // 改配默认值 = "不要XX"（对应 Excel L 列 FillEmptyLColumn 行为）
  function modDefault(cfgItems) {
    var arr = [];
    for (var i = 0; i < 11; i++) {
      var it = cfgItems[i] || {};
      arr.push({ name: it.ltext || '', qty: 1 });
    }
    return arr;
  }

  // 配置价 = 整机价 + 选中固态加价 + 选中显卡加价（对应 Excel CalcTotalPrice → N17）
  function configPrice(key, ssdAdd, gpuAdd) {
    return basePrice(key) + num(ssdAdd) + num(gpuAdd);
  }

  // 改配默认 = 原配
  function cloneItems(items) {
    return items.map(function (it) { return { name: it.name, qty: it.qty }; });
  }

  // ---------- 单行价格计算（与 Excel 补差价公式等价） ----------
  function calcRow(orig, mod, cat) {
    var table = data.prices[cat.table];
    var po = priceOf(table, orig.name);
    var pm = priceOf(table, mod.name);
    var R = (po ? num(po[cat.priceCol]) : 0) * orig.qty; // 原配售价
    var S = (po ? num(po.d) : 0) * orig.qty;             // 原配成本
    var T = (pm ? num(pm[cat.priceCol]) : 0) * mod.qty;  // 改配售价
    var U = (pm ? num(pm.d) : 0) * mod.qty;              // 改配成本
    var O = 0, V = 0;
    if (mod.name !== '' && mod.name !== null && mod.name !== undefined) {
      if (cat.cat === 'gpu') {
        // 显卡特殊补差价公式（匹配 WPS O10；售价=零售F、成本=含税D）
        if (T === 0 && R === 0) { O = U - S; }
        else if (R > 0) { var gRaw = ((R === 0 || S === 0)) ? T : ((T > 0 && U > 0) ? (T - R) : (U - S) / 1.05); O = Math.max(gRaw, U - S); }
        else { O = T - S; }
      } else {
        var oRaw = (T > 0 && U > 0) ? (T - R) : (U - S) / 1.05;
        O = Math.max(oRaw, U - S);
      }
      V = O - (U - S); // 增加利润
    }
    // 补差价手动改值：直接用改值，利润随之重算
    if (mod.oOverride !== undefined && mod.oOverride !== null) {
      O = num(mod.oOverride);
      V = O - (U - S);
    }
    return { R: R, S: S, T: T, U: U, O: O, V: V, price: O };
  }

  function computeState(origItems, modItems) {
    var rows = [];
    var sums = { R: 0, S: 0, T: 0, U: 0, O: 0, V: 0 };
    for (var i = 0; i < 11; i++) {
      var r = calcRow(origItems[i], modItems[i], CATS[i]);
      r.cat = CATS[i].label;
      r.orig = origItems[i];
      r.mod = modItems[i];
      r.changed = (norm(origItems[i].name) !== norm(modItems[i].name)) ||
                  (origItems[i].qty !== modItems[i].qty);
      rows.push(r);
      sums.R += r.R; sums.S += r.S; sums.T += r.T; sums.U += r.U;
      sums.O += r.O; sums.V += r.V;
    }
    return { rows: rows, sums: sums };
  }

  // 配置价（整机到手价，来自 links.json）
  function basePrice(key) {
    for (var i = 0; i < data.links.length; i++) {
      var l = data.links[i];
      if (l.b === key) return l.c;
    }
    var s = stripSuffix(key);
    for (var j = 0; j < data.links.length; j++) {
      if (data.links[j].b === s.base) return data.links[j].c;
    }
    return 0;
  }

  // 店铺/链接/配置 联动数据
  function linkTree() {
    var shops = [];
    var map = {};
    for (var i = 0; i < data.links.length; i++) {
      var l = data.links[i];
      if (!map[l.a]) { map[l.a] = {}; shops.push(l.a); }
      var linkKey = linkNameOf(l.b);
      if (!map[l.a][linkKey]) map[l.a][linkKey] = [];
      map[l.a][linkKey].push(l);
    }
    return { shops: shops, map: map };
  }

  function linkNameOf(key) {
    var parts = String(key).split(' / ');
    return parts.length > 2 ? parts[1] : (parts[0] || key);
  }
  function configNameOf(key) {
    var parts = String(key).split(' / ');
    return parts.length > 2 ? parts.slice(2).join(' / ') : (parts.length > 1 ? parts.slice(1).join(' / ') : key);
  }

  // ---------- 游戏帧数图匹配（移植 GetAllGameData 规则） ----------
  // 帧数图：优先读 data.frames（网页可改），缺省用内置 img/label
  function frameById(id) { var fr = data.frames || []; for (var i = 0; i < fr.length; i++) if (fr[i].id === id) return fr[i]; return null; }
  function frame(id, d) { var r = frameById(id); return { img: (r && r.img) || d.img, label: (r && r.label) || d.label }; }
  function matchFps(cpuName, ramName, ramQty, gpuName) {
    var cpu = norm(cpuName).toUpperCase();
    var ram = norm(ramName).toUpperCase();
    var gpu = norm(gpuName).toUpperCase();
    var qty = num(ramQty);
    function has(s, k) { return s.indexOf(k) >= 0; }

    // 规则2（B3）先于规则3（B2）
    if (has(cpu, '9600X') && has(ram, '6000') && has(ram, 'C28') &&
        ((has(ram, '32G') && qty === 1) ||
         (has(ram, '16G*2') && qty === 1) ||
         (has(ram, '16G') && qty === 2 && !has(ram, '32G') && !has(ram, '*2'))) &&
        has(gpu, '5060TI') && has(gpu, '8G')) {
      return frame('B3', { img: 'fps2.jpg', label: '9600X + 6000C28 双条 + 5060TI' });
    }
    // 规则1（B1）
    if (has(cpu, '9600X') && has(ram, '5600') && has(ram, 'C40') && has(ram, '16G') &&
        qty === 1 && has(gpu, '5060TI') && has(gpu, '8G')) {
      return frame('B1', { img: 'fps1.jpg', label: '9600X + 5600C40 + 5060TI' });
    }
    // 规则3（B2）
    if (has(cpu, '9600X') && has(ram, '6000') && has(ram, 'C28') && has(ram, '16G') &&
        qty === 1 && has(gpu, '5060TI') && has(gpu, '8G')) {
      return frame('B2', { img: 'fps3.jpg', label: '9600X + 6000C28 单条 + 5060TI' });
    }
    // 规则4（B4）
    if (has(cpu, '9700X') && has(ram, '6000') && has(ram, 'C38') && has(ram, '16G') &&
        qty === 1 && has(gpu, '5070') && has(gpu, '12G')) {
      return frame('B4', { img: 'fps4.jpg', label: '9700X + 6000C38 单条 + 5070' });
    }
    // 规则5（B5）
    if (has(cpu, '9700X') && has(ram, '6000') && has(ram, 'C38') && has(ram, '16G') &&
        qty === 2 && has(gpu, '5070') && has(gpu, '12G')) {
      return frame('B5', { img: 'fps5.jpg', label: '9700X + 6000C38 双条 + 5070' });
    }
    return null;
  }

  // 门店/链接/配置 展示名
  function fmtMoney(n) {
    return '¥' + Math.round(n).toLocaleString('zh-CN');
  }

  // 清洗固态/显卡下拉：只保留"看起来像该品类"的选项，避免渠道表列错位把 GPU 名/价格塞进固态
  function looksLikeSsd(n) {
    return /固态|硬盘|M\.2|NVME|SSD|512G|1TB|TiPlus|X4000|P3L|赛可驰|G7T|致态|金邦|P33|P3\+/.test(n) || n === '无固态' || n === '原配置图SIX赛可驰512G';
  }
  function looksLikeGpu(n) {
    return !/^\d+$/.test(n) && /RTX|RX|显卡|无显卡|映众|影驰|技嘉|魔鹰|曜夜|冰龙|风魔|猎鹰|雪鹰|圣刃|虎将|魔刃|AERO|GAMING|WF|SUPER|战鹰|雕/.test(n);
  }
  function cleanSsd(opts) { return (opts || []).filter(function (o) { return looksLikeSsd(o.n); }); }
  function cleanGpu(opts) { return (opts || []).filter(function (o) { return looksLikeGpu(o.n); }); }

  // 数据表里的"垃圾行"：只过滤真正的元数据标记与 Excel 错误值。
  // 注意：不再按纯数字/数字组合过滤 —— 有些合法型号就是纯数字（如 321123），要保证全部可见。
  function isJunkPart(name) {
    var n = norm(name);
    if (!n) return true;
    if (/更新日期|数据源/.test(n)) return true;        // 更新日期/数据源 等元数据标记
    if (/^#[A-Za-z0-9\/!?]+$/.test(n)) return true;   // Excel 错误值(如 #NAME? #N/A #REF!)
    return false;
  }

  var api = {
    norm: norm, priceOf: priceOf, num: num, CATS: CATS,
    getData: function () { return data; },   // 读取当前运行时数据（含 reload 后的远程覆盖）
    MEM_ROW: MEM_ROW, SSD_ROW: SSD_ROW, GPU_ROW: GPU_ROW,
    stripSuffix: stripSuffix, findConfig: findConfig, fillConfig: fillConfig,
    cloneItems: cloneItems, calcRow: calcRow, computeState: computeState,
    basePrice: basePrice, linkTree: linkTree, linkNameOf: linkNameOf,
    configNameOf: configNameOf, matchFps: matchFps, fmtMoney: fmtMoney,
    searchParts: searchParts, applySsdOption: applySsdOption, applyGpuOption: applyGpuOption,
    modDefault: modDefault, configPrice: configPrice,
    dataPriceTable: function (t) { return data.prices[t] || null; },
    cleanSsd: cleanSsd, cleanGpu: cleanGpu, isJunkPart: isJunkPart,
    options: { memOpts: data.memOpts, ssdOpts: data.ssdOpts, gpuOpts: data.gpuOpts,
               variants: data.variants, quickAdd: data.quickAdd, quickRep: data.quickRep },
    // 用云端发布的数据覆盖内置 data.js（闭包共享 data 引用，reload 后会全局生效）
    reload: function (newData) {
      data = newData;
      api.options.memOpts = data.memOpts;
      api.options.ssdOpts = data.ssdOpts;
      api.options.gpuOpts = data.gpuOpts;
      api.options.variants = data.variants;
      api.options.quickAdd = data.quickAdd;
      api.options.quickRep = data.quickRep;
    }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.ENGINE = api; }
})(typeof self !== 'undefined' ? self : this);

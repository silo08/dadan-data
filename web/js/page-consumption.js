// 功耗汇总页（CPU / 显卡实测功耗，取自打单表 08.27.xlsm 两个工作表）
// 数据源：window.DSHDATA.cpuPower / .gpuPower（由 rebuild_configs.ps1 从 xlsm 提取导入）。
// 若未导入，显示提示。
(function (root) {
  var E = root.ENGINE, UI = root.UI, App = root.App;

  function init(container, kind) {
    // 优先读 ENGINE.getData()（当前运行时数据，含 reload 后的远程官网覆盖），回退 DSHDATA 内置
    var D = (E && E.getData) ? E.getData() : (root.DSHDATA || {});
    var rows = (kind === 'gpu') ? (D.gpuPower || []) : (D.cpuPower || []);
    var title = (kind === 'gpu') ? '显卡实测功耗汇总 · 2026年6月' : 'CPU实测功耗汇总 · 2026年6月';
    var h = '';
    h += '<div class="pagehead"><div class="ph-title">' + UI.esc(title) + '</div><div class="ph-sub">数据来自「打单表 08.27.xlsm」对应工作表，重建 data.json 时导入。</div></div>';
    if (!rows || !rows.length) {
      h += '<div class="card" style="padding:24px"><div class="m-body">⚠️ 功耗汇总数据尚未导入。\n请在「打单表 08.27.xlsm」里有：\n· CPU实测功耗汇总_2026年6月\n· 显卡实测功耗汇总_2026年6月\n并运行数据重建脚本导入 JSON（rebuild_configs.ps1），刷新数据后这里就能显示。</div></div>';
    } else {
      h += renderTable(rows);
    }
    container.innerHTML = h;
  }

  function renderTable(rows) {
    // rows: [{name, value}] 或原始二维数据；若结构未知则尽力展示
    var h = '<div class="card"><div class="card-title"><span class="tag">功耗</span>型号 / 实测功耗</div><div class="tbl-wrap"><table class="tbl">';
    h += '<colgroup><col><col style="width:90px"><col style="width:70px"><col style="width:80px"><col style="width:80px"><col style="width:80px"><col></colgroup>';
    h += '<thead><tr><th>型号</th><th>规格</th><th class="num">TDP/TGP</th><th class="num">待机</th><th class="num">满载/游戏</th><th class="num">峰值</th><th>说明</th></tr></thead><tbody>';
    var lastGrp = '';
    (rows || []).forEach(function (r) {
      var g = r.group || '';
      if (g && g !== lastGrp) { h += '<tr class="grp"><td colspan="7">' + UI.esc(g) + '</td></tr>'; lastGrp = g; }
      h += '<tr><td class="mname">' + UI.esc(r.model || '') + '</td><td>' + UI.esc(r.spec || '') + '</td>' +
           '<td class="num">' + UI.esc(r.d || '') + '</td><td class="num">' + UI.esc(r.idle || '') + '</td>' +
           '<td class="num">' + UI.esc(r.load || '') + '</td><td class="num">' + UI.esc(r.peak || '') + '</td>' +
           '<td class="note-cell">' + UI.esc(r.note || '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  }

  root.PageConsumption = { init: init };
})(typeof self !== 'undefined' ? self : this);

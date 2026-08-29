// 报价单画布（网页版）：移植 小程序 buchajia.js / live.js 的紫渐变报价单 makePoster
// 纯 Canvas 2D，返回 dataURL 供预览/下载。逻辑与小程序一致。
(function (root) {
  var E = root.ENGINE;

  function wrapText(ctx, text, maxW) {
    var lines = [], cur = '';
    for (var i = 0; i < text.length; i++) {
      cur += text[i];
      if (ctx.measureText(cur).width > maxW) { lines.push(cur.slice(0, -1)); cur = text[i]; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function ellip(ctx, t, maxW) {
    var s = t || '';
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function FONT(sz, w) { return (w ? w + ' ' : '') + sz + 'px "Microsoft YaHei","PingFang SC",sans-serif'; }

  // 补差价报价单
  function bcj(cfg) {
    // cfg: { shopName, dateTxt, linker(链接名), cfgName, nick, orig:[{l,n,q}], mod:[{l,n,q,o}], base, sumO, total, disclaimer, extra }
    var W = 1080, x = 40, nameStartX = x + 100, qtyX = W - x, diffX = W - x - 104;   // W=1080 与小程序参考版一致，加宽避免型号被截断
    var headH = 210, cfgH = 210, rowH = 58;
    // 块标题(40px)与右侧副标题(28px)「顶部对齐」：因字号不同，标题基线需比副标题低约 (headAsc-subAsc)。
    // 用 measureText.actualBoundingBoxAscent 自动算，换字体也不歪；如想手动微调可改 BLOCK_TITLE_TUNE。
    var BLOCK_TITLE_TUNE = 0;   // 微调：正=标题再往下、负=再往上
    var blocks = [
      { head: '【原配配件】', sub: '购买整机，送系统U盘1个', rows: cfg.orig, withDiff: false },
      { head: '【改配配件】', sub: '购买整机，送系统U盘1个', rows: cfg.mod, withDiff: true }
    ];
    var H = headH + 20 + cfgH + 30 + blocks.length * (70 + 18 + 11 * rowH + 46) + 40 + 210 + 30 + 60 + 160 + 60;
    H = Math.max(H, headH + 20 + cfgH + 30 + blocks.length * (70 + 18 + (blocks[0].rows.length) * rowH + 46) + 40 + 210 + 30 + 60 + 160 + 60);
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var y = headH + 20;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, headH);
    g.addColorStop(0, '#a97be6'); g.addColorStop(0.55, '#8a4bd0'); g.addColorStop(1, '#763ec5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, headH);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = FONT(66, '800');
    ctx.fillText(cfg.shopName, W / 2, headH * 0.42);
    ctx.font = FONT(30, '700');
    ctx.textAlign = 'left'; ctx.fillText('日期：' + cfg.dateTxt, x + 20, headH * 0.72);
    if (cfg.nick) { ctx.textAlign = 'right'; ctx.fillText('业务员 · ' + cfg.nick, W - x - 20, headH * 0.72); }
    // 配置信息卡
    ctx.fillStyle = '#fbf9fe'; ctx.fillRect(x, y, W - 2 * x, cfgH);
    ctx.strokeStyle = '#e7ddf6'; ctx.strokeRect(x, y, W - 2 * x, cfgH);
    ctx.textAlign = 'left'; ctx.fillStyle = '#7c7c88'; ctx.font = FONT(28);
    ctx.fillText('链接', x + 24, y + 44);
    ctx.fillStyle = '#1d1d24'; ctx.font = FONT(30, '700');
    var yy = y + 84;
    var aLines = wrapText(ctx, cfg.linker, W - 2 * x - 48);
    for (var i = 0; i < aLines.length; i++) { ctx.fillText(aLines[i], x + 24, yy); yy += 36; }
    ctx.fillStyle = '#8a4bd0'; ctx.font = FONT(30, '700');
    var bLines = wrapText(ctx, cfg.cfgName, W - 2 * x - 48);
    for (var j = 0; j < bLines.length; j++) { ctx.fillText(bLines[j], x + 24, yy); yy += 36; }
    y += cfgH + 30;
    // 区块
    blocks.forEach(function (b, bi) {
      // 标题(40px) 与右侧副标题(28px)「顶部对齐」：head 基线 = y + (headAsc - subAsc) + BLOCK_TITLE_TUNE
      ctx.fillStyle = '#8a4bd0'; ctx.textAlign = 'left'; ctx.font = FONT(40, '700');
      var headAsc = ctx.measureText(b.head).actualBoundingBoxAscent || 32;
      ctx.textAlign = 'right'; ctx.fillStyle = '#8a8a96'; ctx.font = FONT(28);
      var subAsc = ctx.measureText(b.sub).actualBoundingBoxAscent || 22;
      var topDown = Math.max(0, Math.round(headAsc - subAsc) + BLOCK_TITLE_TUNE);
      ctx.fillStyle = '#8a4bd0'; ctx.textAlign = 'left'; ctx.font = FONT(40, '700');
      ctx.fillText(b.head, x, y + topDown);   // 标题顶部与副标题对齐
      ctx.textAlign = 'right'; ctx.fillStyle = '#8a8a96'; ctx.font = FONT(28);
      ctx.fillText(b.sub, W - x - 90, y);     // 副标题保持在 y
      ctx.textAlign = 'left';
      y += 70;
      ctx.fillStyle = '#8a8a96'; ctx.font = FONT(28);
      ctx.fillText('配件', x, y); ctx.fillText('型号', nameStartX, y);
      ctx.textAlign = 'right';
      if (b.withDiff) { ctx.fillText('补差价', diffX, y); ctx.fillText('数量', qtyX, y); }
      else { ctx.fillText('数量', qtyX, y); }
      ctx.textAlign = 'left';
      var rowTop = y + 18;
      b.rows.forEach(function (r, ri) {
        var base = rowTop + 42;
        if (ri % 2 === 1) { ctx.fillStyle = '#fcf9fe'; ctx.fillRect(x, rowTop, W - 2 * x, rowH); }
        ctx.fillStyle = '#7c7c88'; ctx.font = FONT(30);
        ctx.fillText(r.l, x, base);
        ctx.fillStyle = '#1d1d24'; ctx.font = FONT(32);
        var nameRight = b.withDiff ? (diffX - 120) : (qtyX - 90);
        ctx.fillText(ellip(ctx, r.n || '', nameRight - nameStartX), nameStartX, base);
        ctx.textAlign = 'right';
        if (b.withDiff) {
          ctx.fillStyle = r.d === 0 ? '#b8b8c4' : (r.d > 0 ? '#0b9e4a' : '#8a4bd0');
          ctx.fillText(r.d === 0 ? '0' : (r.d > 0 ? '+' : '') + Math.round(r.d), diffX, base);
          ctx.fillStyle = '#333333'; ctx.fillText(String(r.q), qtyX, base);
        } else { ctx.fillStyle = '#333333'; ctx.fillText(String(r.q), qtyX, base); }
        ctx.textAlign = 'left';
        rowTop += rowH;
      });
      y = rowTop + 46;
    });
    // 合计卡
    var sumTop = y + 40;
    ctx.fillStyle = '#f6effc'; ctx.fillRect(x, sumTop, W - 2 * x, 210);
    ctx.textAlign = 'left'; ctx.fillStyle = '#6a6a78'; ctx.font = FONT(34);
    ctx.fillText('配置价（含固态/显卡加价）', x + 28, sumTop + 58);
    ctx.textAlign = 'right'; ctx.fillStyle = '#1d1d24'; ctx.font = FONT(34, '700');
    ctx.fillText('' + Math.round(cfg.base), W - x - 28, sumTop + 58);
    ctx.textAlign = 'left'; ctx.fillStyle = '#6a6a78'; ctx.font = FONT(34);
    ctx.fillText('补差价', x + 28, sumTop + 120);
    ctx.textAlign = 'right'; ctx.fillStyle = '#0b9e4a'; ctx.font = FONT(34, '700');
    ctx.fillText((cfg.sumO >= 0 ? '+' : '') + Math.round(cfg.sumO), W - x - 28, sumTop + 120);
    ctx.textAlign = 'left'; ctx.fillStyle = '#1d1d24'; ctx.font = FONT(38, '800');
    ctx.fillText('配置价+补差价＝券前总价', x + 28, sumTop + 180);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ef3b32'; ctx.font = FONT(62, '800');
    ctx.fillText('' + Math.round(cfg.total), W - x - 28, sumTop + 188);
    y = sumTop + 210 + 20;
    ctx.textAlign = 'center'; ctx.fillStyle = '#8a4bd0'; ctx.font = FONT(38, '800');
    ctx.fillText(cfg.extra, W / 2, (y += 54));
    ctx.fillStyle = '#96949e'; ctx.font = FONT(26);
    var dLines = wrapText(ctx, cfg.disclaimer, W - 2 * x);
    for (var li = 0; li < dLines.length; li++) { ctx.fillText(dLines[li], W / 2, (y += 34)); }
    return cv.toDataURL('image/png');
  }

  // 直播间报价单（小程序正式版样式：紫渐变头+配置卡+斑马清单+红色含税总价；加宽型号列）
  function live(cfg) {
    // cfg: { shopName, dateTxt, linker, cfgName, nick, rows:[{l,n,p,q}], shipping, profit, plat, total, platFee, profitAmt, net, disclaimer }
    var W = 1600, x = 48;
    var nameX = x + 160, priceX = W - x - 120, qtyX = W - x, modelRight = priceX - 240;
    var headH = 200, cfgH = 200, rowH = 60;
    var H = headH + cfgH + cfg.rows.length * rowH + 500;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var ellip = function (t, maxW) { var s = t || ''; if (ctx.measureText(s).width <= maxW) return s; while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; };
    var wrapText = function (t, maxW) { var lines = [], cur = ''; for (var i = 0; i < t.length; i++) { cur += t[i]; if (ctx.measureText(cur).width > maxW) { lines.push(cur.slice(0, -1)); cur = t[i]; } } if (cur) lines.push(cur); return lines; };
    var FONT = function (sz, w) { return (w ? w + ' ' : '') + sz + 'px "Microsoft YaHei",sans-serif'; };
    var PUR = '#8a4bd0', PUR2 = '#763ec5';
    var y = headH + 8;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    // 顶部紫渐变
    var g = ctx.createLinearGradient(0, 0, 0, headH);
    g.addColorStop(0, '#a97be6'); g.addColorStop(0.55, '#8a4bd0'); g.addColorStop(1, '#763ec5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, headH);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = FONT(66, '800');
    ctx.fillText(cfg.shopName || '', W / 2, headH * 0.48);
    ctx.font = FONT(30);
    ctx.textAlign = 'left'; ctx.fillText('日期：' + cfg.dateTxt, x + 20, headH * 0.78);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; if (cfg.nick) ctx.fillText('业务员 · ' + cfg.nick, W - x - 20, headH * 0.78);
    // 配置信息卡
    ctx.fillStyle = '#fbf9fe'; ctx.fillRect(x, y, W - 2 * x, cfgH);
    ctx.strokeStyle = '#e7ddf6'; ctx.strokeRect(x, y, W - 2 * x, cfgH);
    ctx.textAlign = 'left'; ctx.fillStyle = '#7c7c88'; ctx.font = FONT(28);
    ctx.fillText('链接', x + 24, y + 44);
    ctx.fillStyle = '#1d1d24'; ctx.font = FONT(30, '700');
    var yy = y + 82;
    var aLines = wrapText(cfg.linker || '', W - 2 * x - 48);
    for (var i = 0; i < aLines.length; i++) { ctx.fillText(aLines[i], x + 24, yy); yy += 36; }
    ctx.fillStyle = PUR; ctx.font = FONT(30, '700');
    var bLines = wrapText(cfg.cfgName || '', W - 2 * x - 48);
    for (var j = 0; j < bLines.length; j++) { ctx.fillText(bLines[j], x + 24, yy); yy += 36; }
    y += cfgH + 80;
    // 清单标题
    ctx.fillStyle = PUR; ctx.textAlign = 'left'; ctx.font = FONT(40, '700');
    ctx.fillText('【配件清单】', x, y);
    ctx.textAlign = 'right'; ctx.fillStyle = '#8a8a96'; ctx.font = FONT(28);
    ctx.fillText('购买整机，送系统U盘1个', W - x - 20, y);
    ctx.textAlign = 'left'; y += 66;
    // 表头
    ctx.fillStyle = '#8a8a96'; ctx.font = FONT(28);
    ctx.fillText('配件', x, y); ctx.fillText('型号', nameX, y);
    ctx.textAlign = 'right'; ctx.fillText('价格', priceX, y); ctx.fillText('数量', qtyX, y);
    ctx.textAlign = 'left';
    var rowTop = y + 20;
    cfg.rows.forEach(function (r, k) {
      var base = rowTop + 44;
      if (k % 2 === 1) { ctx.fillStyle = '#fcf9fe'; ctx.fillRect(x, rowTop, W - 2 * x, rowH); }
      ctx.fillStyle = '#7c7c88'; ctx.font = FONT(30);
      ctx.fillText(r.l, x, base);
      ctx.fillStyle = '#111111'; ctx.font = FONT(32, '700');
      ctx.fillText(ellip(r.n || '', modelRight - nameX), nameX, base);
      ctx.textAlign = 'right'; ctx.fillStyle = '#333333'; ctx.font = FONT(32);
      ctx.fillText(String(r.p || 0), priceX, base);
      ctx.fillText(String(r.q), qtyX, base);
      ctx.textAlign = 'left';
      rowTop += rowH;
    });
    // 合计框
    var sumTop = rowTop + 30, boxH = 128;
    ctx.fillStyle = '#f6effc'; ctx.fillRect(x, sumTop, W - 2 * x, boxH);
    ctx.fillStyle = '#333333'; ctx.font = FONT(34);
    ctx.textAlign = 'left'; ctx.fillText('平台 ' + Math.round(cfg.platFee), x + 30, sumTop + 44);
    ctx.textAlign = 'center'; ctx.fillText('利润 ' + Math.round(cfg.profitAmt), W / 2, sumTop + 44);
    ctx.textAlign = 'right'; ctx.fillText('运费 ' + Math.round(cfg.shipping), W - x - 30, sumTop + 44);
    ctx.textAlign = 'left'; ctx.fillStyle = '#333333'; ctx.font = FONT(34, '700');
    ctx.fillText('含税总价', x + 30, sumTop + 105);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ef3b32'; ctx.font = FONT(56, '800');
    ctx.fillText('' + Math.round(cfg.total), W - x - 30, sumTop + 115);
    ctx.textAlign = 'left';
    y = sumTop + boxH + 26;
    ctx.textAlign = 'center'; ctx.fillStyle = PUR; ctx.font = FONT(48, '700');
    ctx.fillText('装机+系统+稳定性压力测试+本地配送', W / 2, (y += 30));
    var disclaimer = cfg.disclaimer || '报价为整机配置，具体以客服确认为准；装机+系统+稳定性压力测试+本地配送';
    ctx.fillStyle = '#96949e'; ctx.font = FONT(22);
    var dLines = wrapText(disclaimer, W - 2 * x);
    for (var li = 0; li < dLines.length; li++) { ctx.fillText(dLines[li], W / 2, (y += 40)); }
    return cv.toDataURL('image/png');
  }

  root.Poster = { bcj: bcj, live: live, wrapText: wrapText, ellip: ellip };
})(typeof self !== 'undefined' ? self : this);

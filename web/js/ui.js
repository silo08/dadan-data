// 通用 UI 助手（网页版）：转义、弹层、toast、日期、导航
(function (root) {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateTxt() { var d = new Date(); return today() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function stamp() { var d = new Date(); return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()); }

  // 弹层（单例 modal）：openModal(html, {title}) / closeModal()
  function openModal(html, opts) {
    opts = opts || {};
    var m = document.getElementById('modal');
    var box = document.getElementById('modalBox');
    if (!m || !box) return;
    box.innerHTML = html;
    m.style.display = 'flex';
    m.dataset.closable = opts.closable !== false ? '1' : '0';
    // 关闭：遮罩点击 + [data-close] 按钮
    m.onclick = function (e) { if (e.target === m && m.dataset.closable === '1') closeModal(); };
    box.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeModal; });
  }
  function closeModal() {
    var m = document.getElementById('modal');
    if (m) m.style.display = 'none';
  }

  // toast
  var _toastT = null;
  function toast(msg, type) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (type === 'error' ? ' err' : (type === 'ok' ? ' ok' : ''));
    if (_toastT) clearTimeout(_toastT);
    _toastT = setTimeout(function () { t.className = 'toast'; }, 1800);
  }

  // 值输入弹层（替代小程序 wx.showModal editable）：enterValue(title, cur) -> Promise<number|null>
  function enterValue(title, cur, placeholder) {
    return new Promise(function (resolve) {
      openModal(
        '<div class="m-title">' + esc(title) + '</div>' +
        '<input type="number" id="mVal" class="m-input" value="' + esc(cur != null ? cur : '') + '" placeholder="' + esc(placeholder || '') + '">' +
        '<div class="m-btns"><button class="btn" data-close>取消</button><button class="btn primary" id="mOk">确定</button></div>',
        { closable: true }
      );
      var inp = document.getElementById('mVal');
      if (inp) { inp.focus(); inp.select(); }
      var ok = document.getElementById('mOk');
      if (ok) ok.onclick = function () {
        var n = parseInt(inp.value, 10);
        resolve(isNaN(n) ? null : n);
        closeModal();
      };
      bindModalClose(function () { resolve(null); }, function (v) { resolve(v === '' ? null : parseInt(v, 10)); });
    });
  }

  // 文本输入弹层（昵称/链接）
  function enterText(title, cur, placeholder) {
    return new Promise(function (resolve) {
      openModal(
        '<div class="m-title">' + esc(title) + '</div>' +
        '<input type="text" id="mVal" class="m-input" value="' + esc(cur || '') + '" placeholder="' + esc(placeholder || '') + '">' +
        '<div class="m-btns"><button class="btn" data-close>取消</button><button class="btn primary" id="mOk">确定</button></div>',
        { closable: true }
      );
      var inp = document.getElementById('mVal');
      if (inp) { inp.focus(); inp.select(); }
      var ok = document.getElementById('mOk');
      if (ok) ok.onclick = function () { resolve(inp.value.trim()); closeModal(); };
      bindModalClose(function () { resolve(null); }, function (v) { resolve(v); });
    });
  }

  // 弹层关闭绑定：灰色遮罩点击 & 取消按钮
  function bindModalClose(onCancel, onEnter) {
    var m = document.getElementById('modal');
    if (!m) return;
    m.onclick = function (e) { if (e.target === m && m.dataset.closable === '1') { if (onCancel) onCancel(); closeModal(); } };
    m.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { if (onCancel) onCancel(); closeModal(); }; });
    // Enter 提交
    var inp = document.getElementById('mVal');
    if (inp) inp.onkeydown = function (e) { if (e.key === 'Enter' && onEnter) { onEnter(inp.value); closeModal(); } };
  }

  // 下载 dataURL
  function downloadDataUrl(dataUrl, filename) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); }, 60);
  }

  // 复制图片到剪贴板（dataURL 或 图片 URL）。成功回调 onDone(true)。
  // 用 <img>→canvas→toBlob 以达到最稳；file:// 下也能把本地图片写进剪贴板(同源不污染 canvas)。
  // 不支持剪贴板图片时回退下载。scale 可选(如 2) = 复制前放大。
  function copyImageToClipboard(url, filename, onDone, scale) {
    var img = new Image();
    img.onload = function () {
      var s = Number(scale != null ? scale : root.COPY_IMG_SCALE || 1) || 1;
      var w = Math.max(1, Math.round(img.naturalWidth * s));
      var h = Math.max(1, Math.round(img.naturalHeight * s));
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d');
      if (s !== 1) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
      ctx.drawImage(img, 0, 0, w, h);
      cv.toBlob(function (blob) {
        if (!blob) { toast('图片生成失败', 'err'); return; }
        // 兜底用 canvas 转成 PNG dataURL 下载(比原始图片URL更可靠，不会只打开不下载)
        var fallback = function () { downloadDataUrl(cv.toDataURL('image/png'), filename || 'image.png'); };
        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () {
            toast('✔ 已复制图片，直接去粘贴(Ctrl+V)', 'ok'); if (onDone) onDone(true);
          }).catch(function () { toast('复制被拒，已改为下载', 'err'); fallback(); });
        } else {
          toast('浏览器不支持剪贴板图片，已改为下载', 'err'); fallback();
        }
      }, 'image/png');
    };
    img.onerror = function () { toast('图片加载失败', 'err'); };
    img.src = url;
  }

  // 复制文本到剪贴板（优先 navigator.clipboard.writeText，回退 execCommand）
  function copyText(text, label) {
    var t = text == null ? '' : String(text);
    var done = function () { toast('✔ 已复制' + (label ? (' ' + label) : '') + '，去粘贴', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(function () { toast('复制失败', 'err'); });
    } else {
      try {
        var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
      } catch (e) { toast('复制失败', 'err'); }
    }
  }

  root.UI = {
    esc: esc, pad: pad, today: today, dateTxt: dateTxt, stamp: stamp,
    openModal: openModal, closeModal: closeModal, toast: toast,
    enterValue: enterValue, enterText: enterText, downloadDataUrl: downloadDataUrl,
    copyImageToClipboard: copyImageToClipboard, copyText: copyText
  };
})(typeof self !== 'undefined' ? self : this);

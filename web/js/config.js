// 网页版启动配置（本地/发布共用）。部署到腾讯云 COS 时，部署脚本会覆盖本文件，使网页走国内数据源。
// dataUrl/luluBase 留空 = 用 GitHub 默认地址（本地双击 / 未部署时也适用，失败会回退内置 engine/data.js）。
// cloudApiUrl = 微信云 data 云函数的 HTTP 触发地址（网页版账号与小程序互通；填了才开启云端身份/审核）。
window.DSH_WEB = {
  dataUrl: '',      // 数据源 data.json（如 'https://xxx.cos.ap-guangzhou.myqcloud.com/dadan/data.json'）
  luluBase: '',     // 噜噜雪碧图基址（如 'https://xxx.cos.ap-guangzhou.myqcloud.com/dadan/'），空则用 GitHub
  cloudApiUrl: ''   // 微信云 data 云函数 HTTP 触发 URL（开通云开发 → 云函数→HTTP触发→获取路径）
};

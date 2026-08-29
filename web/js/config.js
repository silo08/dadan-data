// 网页版启动配置（本地/发布共用）。部署到腾讯云 COS 时，部署脚本会覆盖本文件，使网页走国内数据源。
// 留空 = 用 GitHub 默认地址（本地双击 / 未部署时也适用，失败会回退内置 engine/data.js）。
window.DSH_WEB = {
  dataUrl: '',   // 数据源 data.json（如 'https://xxx.cos.ap-guangzhou.myqcloud.com/dadan/data.json'）
  luluBase: ''   // 噜噜雪碧图基址（如 'https://xxx.cos.ap-guangzhou.myqcloud.com/dadan/'），空则用 GitHub
};

/**
 * 短信日志的菜单别名页。
 *
 * 后端 `sys_menu` 里"短信日志"菜单（id 2050，侧边栏可见）的 `component` 写的是
 * `monitor/sms/log/index`，而页面实际实现于 `src/pages/system/sms/log/index.tsx`。
 * 前端用 UMI 约定式路由，菜单 component 必须能命中真实文件，否则点开白屏。
 *
 * 正确解法是后端发一次 Liquibase 把该行的 component 改成 `system/sms/log/index`
 * （或把页面整体挪到 monitor 下）；在那之前用这个别名页兜住，避免线上白屏。
 * 二者只保留一处：后端数据修正后删除本文件即可。
 */
export { default } from '../../../system/sms/log';

import { defineConfig } from '@umijs/max';

// 提取 defineConfig 的返回值类型
type UmiConfigType = ReturnType<typeof defineConfig>;

// 显式声明类型
let config: UmiConfigType;

if (process.env.UMI_TAG === 'zy') {
  config = defineConfig({
    define: {
      'process.env.msg': '现在是制药的 dev 环境!',
      'process.env.companyName': '三生制药',
      'process.env.namespaceName': 'BaseWeb3SZY/',
      'process.env.wxAgentid': 1000276, // 数字类型直接写
      'process.env.wxAppid': 'wxa070ce17d52441f5',
      'process.env.wxRedirectUri': 'https://login.3sbio.com',
      'process.env.loginUrl': 'https://dev-login.3sbio.com/user/login',
      'process.env.requestPrefix': '/dev-api',
      'process.env.clientId': 'ef51c9a3e9046c4f2ea45142c8a8344a',
    },
  });
} else {
  config = defineConfig({
    define: {
      'process.env.msg': '现在是国健的 dev 环境!',
      'process.env.companyName': '三生国健',
      'process.env.namespaceName': 'BaseWeb3SGJ/',
      'process.env.wxAgentid': 1000167, // 修正原000167为数字1000167（前导0无意义）
      'process.env.wxAppid': 'ww5cbc027668864f89',
      'process.env.wxRedirectUri': 'https://dev-login.3s-guojian.com',
      'process.env.loginUrl': 'https://dev-login.3s-guojian.com/user/login',
      'process.env.requestPrefix': '/dev-api',
      'process.env.clientId': 'ef51c9a3e9046c4f2ea45142c8a8344a',
    },
  });
}

export default config;

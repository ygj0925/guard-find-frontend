import { defineConfig } from '@umijs/max';

// 提取 defineConfig 的返回值类型
type UmiConfigType = ReturnType<typeof defineConfig>;

// 显式声明类型
let config: UmiConfigType;

if (process.env.UMI_TAG === 'zy') {
  config = defineConfig({
    define: {
      'process.env.msg': '现在是制药的 prod 环境!',
      'process.env.companyName': '三生制药',
      'process.env.namespaceName': 'BaseWeb3SZY/',
      'process.env.wxAgentid': '1000276', // 保留字符串类型，不转数字
      'process.env.wxAppid': 'wxa070ce17d52441f5',
      'process.env.wxRedirectUri': 'https://login.3sbio.com',
      'process.env.loginUrl': 'https://dev-login.3sbio.com/user/login',
      'process.env.requestPrefix': 'https://booking-dev.3s-guojian.com/dev-api',
      'process.env.clientId': 'ef51c9a3e9046c4f2ea45142c8a8344a',
    },
  });
} else {
  config = defineConfig({
    define: {
      'process.env.msg': '现在是国健的 prod 环境!',
      'process.env.companyName': '三生国健',
      'process.env.namespaceName': 'BaseWeb3SGJ/',
      'process.env.wxAgentid': '000167', // 保留前导0的字符串格式
      'process.env.wxAppid': 'ww5cbc027668864f89',
      'process.env.wxRedirectUri': 'https://dev-login.3s-guojian.com',
      'process.env.loginUrl': 'https://dev-login.3s-guojian.com/user/login',
      'process.env.requestPrefix': 'https://booking-dev.3s-guojian.com/dev-api',
      'process.env.clientId': 'ef51c9a3e9046c4f2ea45142c8a8344a',
    },
  });
}

export default config;

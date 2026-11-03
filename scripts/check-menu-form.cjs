/* Local UI regression; services are in-memory fixtures, not a backend test.
 * PLAYWRIGHT_MODULE / CHROMIUM_EXECUTABLE can point to existing installations. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const esbuild = require('esbuild');
const less = require('less');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.temp/menu-form');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  await esbuild.build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import{ConfigProvider}from'antd';import zhCN from'antd/locale/zh_CN';import DialogHost,{useDialog}from'./src/components/DialogHost';import MenuForm from'./src/pages/system/menu/components/MenuForm';
        const records=[{id:1,parentId:0,title:'系统管理',type:1,path:'/system',sort:1,status:1,icon:'settings',children:[{id:2,parentId:1,title:'用户管理',type:2,path:'/system/user',component:'system/user/index',sort:1,status:1,icon:'UserOutlined'}]},{id:3,parentId:0,title:'新增用户',type:3,sort:1,status:1,permission:'system:user:create'}];window.__records=records;window.__saved=[];
        function App(){const dialog=useDialog();return <ConfigProvider locale={zhCN} theme={{token:{motion:false}}}><button onClick={()=>dialog.open(records[0])}>编辑目录</button><button onClick={()=>dialog.open(records[0].children[0])}>编辑菜单</button><button onClick={()=>dialog.open(records[1])}>编辑按钮</button><button onClick={()=>dialog.open(null)}>新建目录</button><DialogHost dialog={dialog}>{({visible,data})=><MenuForm visible={visible} menu={data} parentMenu={null} onCancel={dialog.close} onSuccess={dialog.close}/>}</DialogHost></ConfigProvider>}createRoot(document.getElementById('root')).render(<App/>);`,
      loader: 'tsx',
      resolveDir: root,
    },
    bundle: true,
    outdir: output,
    entryNames: 'app',
    minify: true,
    format: 'esm',
    define: { 'process.env.NODE_ENV': '"production"' },
    tsconfig: path.join(root, 'tsconfig.json'),
    plugins: [
      {
        name: 'menu-ui-fixtures',
        setup(builder) {
          builder.onResolve({ filter: /^@umijs\/max$/ }, () => ({
            path: 'umi',
            namespace: 'fixture',
          }));
          builder.onResolve({ filter: /^@\/services\/web\/system$/ }, () => ({
            path: 'system',
            namespace: 'fixture',
          }));
          builder.onLoad(
            { filter: /.*/, namespace: 'fixture' },
            ({ path: name }) => ({
              contents:
                name === 'umi'
                  ? `import common from ${JSON.stringify(path.join(root, 'src/locales/zh-CN/common.ts'))};import system from ${JSON.stringify(path.join(root, 'src/locales/zh-CN/system.ts'))};const messages={...common,...system};export const useIntl=()=>({formatMessage:({id})=>messages[id]||id});`
                  : `export const menu={query:async()=>({data:window.__records}),edit:async(values)=>{window.__saved.push(values)},create:async(values)=>{window.__saved.push(values)}};`,
              resolveDir: root,
              loader: 'js',
            }),
          );
          builder.onLoad({ filter: /\.less$/ }, async ({ path: filename }) => ({
            contents: (
              await less.render(fs.readFileSync(filename, 'utf8'), { filename })
            ).css,
            loader: 'css',
          }));
        },
      },
    ],
    logLevel: 'warning',
  });
  const server = http.createServer((request, response) => {
    const filename =
      request.url === '/app.js'
        ? 'app.js'
        : request.url === '/app.css'
          ? 'app.css'
          : null;
    response.setHeader(
      'Content-Type',
      filename?.endsWith('.js')
        ? 'text/javascript'
        : filename?.endsWith('.css')
          ? 'text/css'
          : 'text/html; charset=utf-8',
    );
    response.end(
      filename
        ? fs.readFileSync(path.join(output, filename))
        : '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script>',
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const form = () =>
      page.getByRole('dialog', { name: '编辑菜单管理', exact: true });
    const picker = () =>
      page.getByRole('dialog', { name: '选择图标', exact: true });

    await page.getByRole('button', { name: '编辑目录', exact: true }).click();
    await form().getByLabel('图标', { exact: true }).waitFor();
    assert.equal(
      await form().getByLabel('图标', { exact: true }).inputValue(),
      'settings',
    );
    assert.equal(
      await form().locator('.ant-input-prefix .anticon-setting').count(),
      1,
    );
    await form().getByLabel('图标', { exact: true }).click();
    assert.equal(
      await picker()
        .getByRole('button', { name: 'setting', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    await picker().getByRole('button', { name: 'team', exact: true }).click();
    const selectedStyle = await picker()
      .getByRole('button', { name: 'team', exact: true })
      .evaluate((node) => ({
        background: getComputedStyle(node).backgroundColor,
        border: getComputedStyle(node).borderTopColor,
      }));
    assert.notEqual(selectedStyle.background, 'rgba(0, 0, 0, 0)');
    assert.notEqual(selectedStyle.border, 'rgb(240, 240, 240)');
    await picker()
      .getByRole('button', { name: /^确\s*定$/, exact: true })
      .click();
    await picker().waitFor({ state: 'hidden' });
    assert.equal(
      await form().getByLabel('图标', { exact: true }).inputValue(),
      'team',
    );
    await page.screenshot({ path: path.join(output, 'directory-desktop.png') });
    await form()
      .getByRole('button', { name: /^保\s*存$/, exact: true })
      .click();
    await form().waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.__saved.at(-1).icon), 'team');

    await page.getByRole('button', { name: '编辑菜单', exact: true }).click();
    await form().getByLabel('图标', { exact: true }).click();
    assert.equal(
      await picker()
        .getByRole('button', { name: 'user', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    await picker()
      .getByPlaceholder('搜索图标名称，如 user、setting')
      .fill('file-search');
    await picker()
      .getByRole('button', { name: 'file-search', exact: true })
      .click();
    await page.screenshot({ path: path.join(output, 'icon-picker.png') });
    await picker()
      .getByRole('button', { name: /^取\s*消$/, exact: true })
      .click();
    await picker().waitFor({ state: 'hidden' });
    assert.equal(
      await form().getByLabel('图标', { exact: true }).inputValue(),
      'UserOutlined',
    );
    await form().getByLabel('图标', { exact: true }).press('Enter');
    assert.equal(
      await picker()
        .getByRole('button', { name: 'user', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    await picker()
      .getByPlaceholder('搜索图标名称，如 user、setting')
      .fill('file-search');
    await picker()
      .getByRole('button', { name: 'file-search', exact: true })
      .click();
    await picker()
      .getByRole('button', { name: /^确\s*定$/, exact: true })
      .click();
    await picker().waitFor({ state: 'hidden' });
    assert.equal(
      await form().getByLabel('图标', { exact: true }).inputValue(),
      'file-search',
    );
    await form().getByRole('button', { name: '清空图标', exact: true }).click();
    assert.equal(
      await form().getByLabel('图标', { exact: true }).inputValue(),
      '',
    );
    assert.equal(await picker().count(), 0);
    await page.screenshot({ path: path.join(output, 'menu-desktop.png') });
    await form()
      .getByRole('button', { name: /^保\s*存$/, exact: true })
      .click();
    await form().waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.__saved.at(-1).icon), '');

    await page.getByRole('button', { name: '编辑按钮', exact: true }).click();
    await form().getByLabel('授权标识', { exact: true }).waitFor();
    assert.equal(await form().getByLabel('图标', { exact: true }).count(), 0);
    await form()
      .getByRole('button', { name: /^取\s*消$/, exact: true })
      .click();
    await form().waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '编辑菜单', exact: true }).click();
    await form().getByLabel('图标', { exact: true }).waitFor();
    const geometry = await form().evaluate((node) => {
      const modal = node.getBoundingClientRect();
      const columns = [...node.querySelectorAll('.ant-col-sm-12')].map((col) =>
        col.getBoundingClientRect(),
      );
      return {
        left: modal.left,
        right: modal.right,
        width: modal.width,
        columnWidth: columns[0].width,
        overflow: node.scrollWidth > node.clientWidth,
      };
    });
    assert(geometry.left >= 0 && geometry.right <= 390);
    assert(geometry.width >= 340, 'measure the fully opened modal');
    assert(
      geometry.columnWidth > geometry.width * 0.8,
      'narrow viewport should have one field per row',
    );
    assert(!geometry.overflow, 'form should not overflow horizontally');
    await page.screenshot({ path: path.join(output, 'menu-mobile.png') });
    await form()
      .getByRole('button', { name: /^取\s*消$/, exact: true })
      .click();
    await form().waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '新建目录', exact: true }).click();
    const createForm = page.getByRole('dialog', {
      name: '新增菜单管理',
      exact: true,
    });
    await createForm.getByLabel('菜单名称', { exact: true }).fill('测试目录');
    await createForm.getByLabel('路由地址', { exact: true }).fill('/example');
    await createForm
      .getByRole('button', { name: /^保\s*存$/, exact: true })
      .click();
    await createForm.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.__saved.at(-1).sort), 1);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify(
        {
          savedPayloads: await page.evaluate(() => window.__saved),
          mobileGeometry: geometry,
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS: directory/menu icon initialization, replacement, cancel/reopen, search, keyboard, clearing, button fields, create defaults, responsive layout; no runtime errors.',
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

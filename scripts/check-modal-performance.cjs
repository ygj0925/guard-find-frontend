/* Optional browser regression: provide PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE
 * when Playwright is installed outside this checkout. PERF_BASELINE_REF compares
 * the current tree to a Git revision without changing either checkout. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const esbuild = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.temp/modal-performance');
const baseline = process.env.PERF_BASELINE_REF;
const modes = baseline ? ['before', 'after'] : ['after'];
const menuRows = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  title: `Menu ${index + 1}`,
  type: 2,
  path: `/page-${index + 1}`,
  sort: index,
  status: 1,
}));
const permissionTree = Array.from({ length: 1500 }, (_, index) => ({
  id: index + 1,
  title: `Permission ${index + 1}`,
}));
const counts = {};
const departmentRows = Array.from({ length: 200 }, (_, index) => ({
  id: index + 1,
  name: `Department ${index + 1}`,
  sort: index,
  status: 1,
  ...(index === 0
    ? {
        children: [
          {
            id: 10001,
            parentId: 1,
            name: 'Nested department',
            sort: 0,
            status: 1,
          },
        ],
      }
    : {}),
}));

async function build(mode) {
  const plugin = {
    name: 'local-ui-fixtures',
    setup(builder) {
      builder.onResolve({ filter: /^(@umijs\/max|umi)$/ }, () => ({
        path: 'umi',
        namespace: 'fixture',
      }));
      builder.onResolve(
        { filter: /^@\/services\/web\/(system|notify)$/ },
        (args) => ({ path: args.path.split('/').pop(), namespace: 'fixture' }),
      );
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
        contents:
          args.path === 'umi'
            ? `const intl={formatMessage:({id})=>id};const state={initialState:{user:{id:1,permissions:['*:*:*'],roles:[]}}};export const useIntl=()=>intl;export const useModel=(name,select)=>{const model=name==='authorization'?{refreshAuthorization:async()=>{}}:state;return select?select(model):model};`
            : args.path === 'system'
              ? `const get=async(name)=>{const response=await fetch('/fixture/'+name);return response.json()};export const menu={query:()=>get('menu')};export const organization={query:()=>get('departments')};export const role={getPermissionTree:()=>get('tree'),getPermissionIds:()=>get('ids')};`
              : `export const announcement={query:async()=>{const response=await fetch('/fixture/notices');return response.json()},detail:async(id)=>{const response=await fetch('/fixture/notice/'+id);return response.json()}};`,
      }));
      builder.onLoad({ filter: /\.less$/ }, () => ({
        contents: '',
        loader: 'css',
      }));
      builder.onLoad({ filter: /\.[jt]sx?$/ }, (args) => {
        if (!args.path.startsWith(path.join(root, 'src') + path.sep)) return;
        const relative = path
          .relative(root, args.path)
          .replaceAll(path.sep, '/');
        let source;
        if (mode === 'before') {
          try {
            source = execFileSync('git', ['show', `${baseline}:${relative}`], {
              cwd: root,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'ignore'],
            });
          } catch {
            source = fs.readFileSync(args.path, 'utf8');
          }
        } else source = fs.readFileSync(args.path, 'utf8');
        if (relative === 'src/pages/system/menu/index.tsx') {
          source = source.replace(
            'const MenuPage: React.FC = () => {',
            'const MenuPage: React.FC = () => { window.__menuRenders=(window.__menuRenders||0)+1;',
          );
        }
        return { contents: source, loader: path.extname(args.path).slice(1) };
      });
    },
  };
  await esbuild.build({
    stdin: {
      contents: `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{ConfigProvider}from'antd';import MenuPage from './src/pages/system/menu';import MenuGrant from './src/pages/system/role/components/MenuGrant';import NoticePage from './src/pages/system/notice';import DepartmentPage from './src/pages/system/dept';
        function App(){const[visible,setVisible]=useState(false);const page=new URLSearchParams(location.search).get('page');return <ConfigProvider><div style={{padding:24}}>{page==='dept'?<DepartmentPage/>:page==='tree'?<><button id="open-tree" onClick={()=>setVisible(true)}>Open tree</button><MenuGrant visible={visible} roleId={1} onCancel={()=>setVisible(false)}/></>:page==='notice'?<NoticePage/>:<MenuPage/>}</div></ConfigProvider>};createRoot(document.getElementById('root')).render(<App/>);`,
      resolveDir: root,
      loader: 'tsx',
    },
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir: path.join(output, mode),
    entryNames: 'app',
    minify: true,
    tsconfig: path.join(root, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [plugin],
    logLevel: 'warning',
    loader: { '.woff': 'empty', '.ttf': 'empty', '.svg': 'empty' },
  });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const mode of modes) {
    await build(mode);
    console.log(mode, 'fixture bundle ready');
  }
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/fixture/')) {
      const name = url.pathname.slice('/fixture/'.length);
      counts[name] = (counts[name] || 0) + 1;
      let data =
        name === 'menu'
          ? menuRows
          : name === 'tree'
            ? permissionTree
            : name === 'ids'
              ? [1, 2]
              : null;
      if (name === 'departments') data = departmentRows;
      if (name === 'notices')
        data = {
          list: [{ id: 1, title: 'Preview notice', status: 1 }],
          total: 1,
        };
      if (name.startsWith('notice/'))
        data = {
          id: Number(name.split('/')[1]),
          title: 'Preview notice',
          content: '<p>Loaded notice content</p>',
        };
      // Deliberately keep the notice detail pending to observe immediate feedback.
      const reply = () => {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ data }));
      };
      if (name.startsWith('notice/')) setTimeout(reply, 800);
      else reply();
      return;
    }
    const mode = url.pathname.split('/')[1];
    const filename = path.basename(url.pathname);
    if (filename.endsWith('.js') || filename.endsWith('.css')) {
      const file = path.join(output, mode, filename);
      response.setHeader(
        'Content-Type',
        filename.endsWith('.js') ? 'text/javascript' : 'text/css',
      );
      response.end(fs.readFileSync(file));
    } else {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      const css = fs.existsSync(path.join(output, mode, 'app.css'))
        ? `<link rel="stylesheet" href="/${mode}/app.css">`
        : '';
      response.end(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${css}<div id="root"></div><script type="module" src="/${mode}/app.js"></script>`,
      );
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = {};
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
        : {}),
    });
    for (const mode of modes) {
      const page = await browser.newPage({
        viewport: { width: 1366, height: 768 },
      });
      const errors = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
        console.error('browser error:', error.message);
      });
      const base = `http://127.0.0.1:${server.address().port}/${mode}/`;
      await page.goto(base);
      await page.waitForSelector('.ant-table-row[data-row-key]');
      const renderedMenuRows = await page
        .locator('.ant-table-row[data-row-key]')
        .count();
      if (mode === 'before') assert.equal(renderedMenuRows, 100);
      if (mode === 'after')
        assert(
          renderedMenuRows < 30,
          `menu table should be virtualized, rendered ${renderedMenuRows} rows`,
        );
      console.log(mode, 'menu table ready');
      const before = await page.evaluate(() => window.__menuRenders);
      const menuRequests = counts.menu;
      const opened = await page.evaluate(async () => {
        const start = performance.now();
        [...document.querySelectorAll('button')]
          .find(
            (button) => button.textContent.trim() === 'common.operation.add',
          )
          .click();
        await new Promise((resolve) => {
          const check = () => {
            if (performance.now() - start > 15000) {
              resolve();
              return;
            }
            document.querySelector('.ant-modal')
              ? requestAnimationFrame(resolve)
              : requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
        return {
          elapsed: performance.now() - start,
          renders: window.__menuRenders,
        };
      });
      await page.waitForSelector('input[id="title"]');
      await page.locator('input[id="title"]').fill('unsaved value');
      await page.locator('.ant-modal-close').click();
      await page.waitForSelector('.ant-modal', { state: 'hidden' });
      await page.getByText('common.operation.add', { exact: true }).click();
      await page.waitForSelector('input[id="title"]');
      assert.equal(
        await page.locator('input[id="title"]').inputValue(),
        '',
        'a new form must not retain unsaved values',
      );
      const parentTreeRequests = counts.menu - menuRequests;
      console.log(mode, 'menu modal ready', opened);
      if (mode === 'after')
        assert.equal(parentTreeRequests, 2, 'one parent-tree request per open');
      if (mode === 'after')
        assert.equal(
          opened.renders - before,
          0,
          'opening a modal must not render its owning table page',
        );

      await page.goto(`${base}?page=dept`);
      await page.waitForSelector('.ant-table-row[data-row-key="1"]');
      const renderedDepartmentRows = await page
        .locator('.ant-table-row[data-row-key]')
        .count();
      if (mode === 'before') assert.equal(renderedDepartmentRows, 200);
      if (mode === 'after')
        assert(
          renderedDepartmentRows < 30,
          'department table should be virtualized',
        );
      await page.locator('.ant-table-row-expand-icon').first().click();
      const childRow = page.locator('.ant-table-row[data-row-key="10001"]');
      await childRow.waitFor();
      await childRow
        .getByText('common.operation.edit', { exact: true })
        .click();
      await page.waitForSelector('input[id="name"]');
      assert.equal(
        await page.locator('input[id="name"]').inputValue(),
        'Nested department',
        'expanded child actions must edit the correct record',
      );

      await page.goto(`${base}?page=tree`);
      await page.locator('#open-tree').click();
      await page.waitForSelector('.ant-tree-title');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.ant-tree-title')].some((node) =>
          node.textContent.includes('Permission'),
        ),
      );
      const treeNodes = await page.locator('.ant-tree-treenode').count();
      if (mode === 'after')
        assert(
          treeNodes < 50,
          `tree should be virtualized, rendered ${treeNodes} nodes`,
        );

      await page.goto(`${base}?page=notice`);
      await page.waitForSelector('.ant-table-tbody tr[data-row-key]');
      const noticeStart = Date.now();
      await page
        .getByText('common.operation.preview', { exact: true })
        .first()
        .click();
      await page.waitForSelector('.ant-modal');
      const noticeOpenMs = Date.now() - noticeStart;
      if (mode === 'after')
        assert(
          noticeOpenMs < 700,
          `notice shell should not wait for its 800ms request (${noticeOpenMs}ms)`,
        );
      await page.getByText('Loaded notice content', { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      results[mode] = {
        menuRows: 100,
        renderedMenuRows,
        departmentRows: 200,
        renderedDepartmentRows,
        menuOpenToFrameMs: Math.round(opened.elapsed),
        menuPageRendersOnOpen: opened.renders - before,
        parentTreeRequestsForTwoOpens: parentTreeRequests,
        permissionItems: 1500,
        renderedTreeNodes: treeNodes,
        delayedNoticeOpenMs: noticeOpenMs,
      };
      await page.screenshot({ path: path.join(output, `${mode}-notice.png`) });
      await page.close();
      console.log(mode, JSON.stringify(results[mode]));
    }
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ baseline, results }, null, 2),
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

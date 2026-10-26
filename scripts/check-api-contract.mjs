#!/usr/bin/env node
/**
 * 前后端接口契约回归检查
 *
 * 静态比对：
 *   - 后端 guard-find-backend 的 @CrudRequestMapping（按 Api.* 枚举展开）与 @Get/Post/Put/Patch/DeleteMapping
 *   - 前端 src/**\/*.ts(x) 中全部 request() 调用点（TypeScript AST，覆盖泛型换行与模板插值）
 *
 * 输出三类计数：matched / verbMismatch / noPath，供 align-backend-contract 各阶段验收。
 *
 * 用法：
 *   node scripts/check-api-contract.mjs                # 人读表格
 *   node scripts/check-api-contract.mjs --json         # 机器读
 *   node scripts/check-api-contract.mjs --max-verb-mismatch 26 --max-no-path 45
 *     超出上限则以退出码 1 结束（CI 门禁，数字只准下降）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const FE_ROOT = path.resolve(process.cwd());
const BE_ROOT = path.resolve(
  process.env.API_CONTRACT_BACKEND ||
    path.join(FE_ROOT, '..', 'guard-find-backend'),
);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.umi',
  '.umi-production',
  'target',
  'build',
]);

/* ------------------------------------------------------------------ 后端路由 */

const CRUD_EXPANSION = {
  PAGE: ['GET {b}'],
  LIST: ['GET {b}/list'],
  TREE: ['GET {b}/tree'],
  GET: ['GET {b}/{id}'],
  CREATE: ['POST {b}'],
  UPDATE: ['PUT {b}/{id}'],
  DELETE: ['DELETE {b}/{id}'],
  BATCH_DELETE: ['DELETE {b}'],
  EXPORT: ['GET {b}/export'],
  DICT: ['GET {b}/dict'],
  TREE_DICT: ['GET {b}/dict/tree'],
};

function walk(dir, match, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, match, acc);
    else if (match(entry.name)) acc.push(full);
  }
  return acc;
}

/** 从 Java 源码提取路由：注解可跨行，注释里出现的 @XxxMapping 需要剔除 */
function collectBackendRoutes() {
  const files = walk(BE_ROOT, (n) => n.endsWith('Controller.java'));
  const routes = new Map();

  for (const file of files) {
    const source = fs
      .readFileSync(file, 'utf8')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rel = path.relative(BE_ROOT, file).split(path.sep).join('/');

    const crud = source.match(
      /@CrudRequestMapping\(([\s\S]*?)\)\s*\r?\n\s*(?:@\w+[^\r\n]*\r?\n\s*)*public\s+(?:abstract\s+)?class/,
    );
    const crudPath = crud ? crud[1].match(/"([^"]+)"/)?.[1] : undefined;
    const crudApis = crud
      ? [...crud[1].matchAll(/Api\.([A-Z_]+)/g)].map((m) => m[1])
      : [];
    const classBase = source.match(
      /@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]+)"/,
    )?.[1];

    const add = (verb, p) => {
      if (!p) return;
      const key = `${verb} ${normalize(p)}`;
      if (!routes.has(key))
        routes.set(key, { verb, path: normalize(p), src: rel });
    };

    if (crudPath) {
      for (const api of crudApis) {
        for (const tpl of CRUD_EXPANSION[api] || []) {
          const [verb, tplPath] = tpl.split(' ');
          add(verb, tplPath.replace('{b}', crudPath));
        }
      }
    }

    const base = classBase || crudPath || '';
    for (const m of source.matchAll(
      /@(Get|Post|Put|Patch|Delete)Mapping\b(?:\s*\(([\s\S]*?)\))?/g,
    )) {
      const verb = m[1].toUpperCase();
      const sub = m[2] ? (m[2].match(/"([^"]*)"/)?.[1] ?? '') : '';
      add(verb, base + sub);
    }
  }
  return routes;
}

/* ------------------------------------------------------------------ 前端调用 */

function normalize(p) {
  let out = p.split('?')[0].split('#')[0];
  out = out.replace(/\$\{[^}]*\}|\{[^}]*\}|:[A-Za-z_][\w.]*/g, '{}');
  out = out.replace(/^\/+|\/+$/g, '');
  return out.toLowerCase();
}

function literalPath(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isTemplateExpression(node)) {
    // 模板插值统一视为路径参数
    let acc = node.head.text;
    for (const span of node.templateSpans) {
      acc += '{}';
      acc += span.literal.text;
    }
    return acc;
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = literalPath(node.left);
    const right = literalPath(node.right);
    if (left !== undefined) return left + (right === undefined ? '{}' : right);
  }
  if (ts.isParenthesizedExpression(node)) return literalPath(node.expression);
  return undefined;
}

/** `src/services/web/crud.ts` 工厂方法 → 后端端点模板 */
const CRUD_METHODS = {
  page: ['GET', '{b}'],
  list: ['GET', '{b}/list'],
  tree: ['GET', '{b}/tree'],
  get: ['GET', '{b}/{id}'],
  create: ['POST', '{b}'],
  update: ['PUT', '{b}/{id}'],
  remove: ['DELETE', '{b}'],
  dict: ['GET', '{b}/dict'],
  treeDict: ['GET', '{b}/dict/tree'],
  exportUrl: ['GET', '{b}/export'],
};

function collectFrontendCalls() {
  const files = walk(path.join(FE_ROOT, 'src'), (n) => /\.tsx?$/.test(n));
  const calls = [];

  for (const file of files) {
    const rel = path.relative(FE_ROOT, file).split(path.sep).join('/');
    const sf = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

    // 本文件的 `const crud = createCrud('system/user')`：把 crud.xxx() 还原成真实端点
    const crudBases = new Map();
    for (const m of sf.text.matchAll(
      /(?:const|let)\s+(\w+)\s*=\s*createCrud(?:<[\s\S]*?>)?\(\s*['"`]([^'"`]+)['"`]/g,
    )) {
      crudBases.set(m[1], m[2]);
    }

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        if (
          ts.isIdentifier(node.expression) &&
          (node.expression.text === 'request' || node.expression.text === 'download')
        ) {
          const isDownload = node.expression.text === 'download';
          const first = node.arguments[0];
          const p = literalPath(first);
          if (p !== undefined) {
            let verb = 'GET';
            const opts = node.arguments[isDownload ? 1 : 1];
            if (opts && ts.isObjectLiteralExpression(opts)) {
              for (const prop of opts.properties) {
                if (
                  ts.isPropertyAssignment(prop) &&
                  prop.name.getText() === 'method' &&
                  ts.isStringLiteral(prop.initializer)
                ) {
                  verb = prop.initializer.text.toUpperCase();
                }
              }
            }
            calls.push({
              verb,
              path: normalize(p),
              raw: p,
              src: `${rel}:${lineOf(node.getStart())}${isDownload ? '[download]' : ''}`,
            });
          }
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          const owner = node.expression.expression;
          const method = node.expression.name.text;
          const tpl = CRUD_METHODS[method];
          if (ts.isIdentifier(owner) && tpl && crudBases.has(owner.text)) {
            const resolved = tpl[1].replace('{b}', crudBases.get(owner.text));
            calls.push({
              verb: tpl[0],
              path: normalize(resolved),
              raw: resolved,
              src: `${rel}:${lineOf(node.getStart())}[${owner.text}.${method}]`,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  // crud.ts 内部的 `${base}/list` 等模板无法静态解析，单独归类不计入失配
  const resolved = [];
  const unresolved = [];
  for (const c of calls) {
    (c.path.startsWith('{}') ? unresolved : resolved).push(c);
  }
  return { calls: resolved, unresolved };
}

/* ------------------------------------------------------------------ 比对 */

const args = process.argv.slice(2);
const asNumber = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const asFlag = (name) => args.includes(name);

const backend = collectBackendRoutes();
const { calls: frontendCalls, unresolved } = collectFrontendCalls();

const backendPaths = new Map(); // normalizedPath -> Set<verb>
for (const r of backend.values()) {
  if (!backendPaths.has(r.path)) backendPaths.set(r.path, new Set());
  backendPaths.get(r.path).add(r.verb);
}

const grouped = new Map();
for (const c of frontendCalls) {
  const key = `${c.verb} ${c.path}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(c);
}

/** 已登记下线的接口前缀（后端未实现、入口已隐藏），不计入失配门禁 */
const offlineRegistry = (() => {
  try {
    const file = path.join(FE_ROOT, 'scripts', 'offline-endpoints.json');
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (json.entries || []).map((e) => e.prefix);
  } catch {
    return [];
  }
})();

const matched = [];
const verbMismatch = [];
const noPath = [];
const registeredOffline = [];

for (const [key, sites] of [...grouped.entries()].sort()) {
  const [verb, p] = key.split(' ');
  const verbs = backendPaths.get(p);
  const where = [...new Set(sites.map((s) => s.src))].join(', ');
  if (verbs?.has(verb)) matched.push({ key, where });
  else if (verbs)
    verbMismatch.push({ key, where, actual: [...verbs].join('/') });
  else if (offlineRegistry.some((prefix) => p.startsWith(prefix.replace(/^\/+/, ''))))
    registeredOffline.push({ key, where });
  else noPath.push({ key, where });
}

const unusedBackend = [...backend.values()]
  .filter((r) => !grouped.has(`${r.verb} ${r.path}`))
  .sort((a, b) => `${a.verb}${a.path}`.localeCompare(`${b.verb}${b.path}`));

/* ---------------------------------------------- 权限码（后端种子 SQL + 注解为权威） */

/** 后端可校验的权限码：sys_menu.permission 种子数据 + @SaCheckPermission 字面量 */
function collectBackendPermissions() {
  const perms = new Set();
  const files = walk(BE_ROOT, (n) => n.endsWith('.sql') || n.endsWith('Controller.java'));
  const CODE = /['"]([a-z][a-zA-Z]*:[a-zA-Z:]+)['"]/g;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(CODE)) perms.add(m[1]);
  }
  return perms;
}

/** 前端引用的权限码字面量（AccessControl / hasPermission 等） */
function collectFrontendPermissions() {
  const usage = new Map();
  const files = walk(path.join(FE_ROOT, 'src'), (n) => /\.tsx?$/.test(n));
  for (const f of files) {
    const rel = f.replace(/\\/g, '/').replace(`${FE_ROOT}/`, '');
    const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
    const take = (node) => {
      const list = ts.isArrayLiteralExpression(node)
        ? node.elements
        : [node];
      for (const el of list) {
        if (ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)) {
          if (!el.text.includes(':')) continue;
          if (!usage.has(el.text)) usage.set(el.text, new Set());
          usage.get(el.text).add(`${rel}:${lineOf(el.getStart())}`);
        } else if (ts.isBinaryExpression(el)) take(el.right);
      }
    };
    const visit = (node) => {
      if (ts.isJsxAttribute(node) && node.name.getText() === 'permission' && node.initializer) {
        const init = node.initializer;
        if (ts.isStringLiteral(init)) take(init);
        else if (ts.isJsxExpression(init) && init.expression) take(init.expression);
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        /^has(Any|All)?Permission(Or|And)?$/.test(node.expression.text)
      ) {
        for (const arg of node.arguments) take(arg);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return usage;
}

const backendPermissions = collectBackendPermissions();
const frontendPermissions = collectFrontendPermissions();
const unknownPermissions = [...frontendPermissions.entries()]
  .filter(([code]) => !backendPermissions.has(code))
  .map(([code, where]) => ({
    key: code,
    where: [...where].slice(0, 3).join(', '),
  }))
  .sort((a, b) => a.key.localeCompare(b.key));

const {
  menus: menuRows,
  missingVisible: missingPagesVisible,
  missingHidden: missingPagesHidden,
} = collectMenuPageGaps();

// 已下线菜单不需要页面文件：直接读前端的唯一事实源 OFFLINE_MENU_PATHS，避免两处清单漂移
const offlineMenuPaths = (() => {
  try {
    const src = fs.readFileSync(path.join(FE_ROOT, 'src/utils/RouteUtils.ts'), 'utf8');
    const decl = src.match(/OFFLINE_MENU_PATHS\s*=\s*\[([^\]]*)\]/);
    return decl ? [...decl[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [];
  } catch {
    return [];
  }
})();

const isOfflineMenu = (key) =>
  offlineMenuPaths.some((p) => key.startsWith(`${p} `) || key === p);
const missingPagesUnregistered = missingPagesVisible.filter(
  (m) => !isOfflineMenu(m.key),
);

const summary = {
  backendRoutes: backend.size,
  frontendCallSites: grouped.size,
  matched: matched.length,
  verbMismatch: verbMismatch.length,
  noPath: noPath.length,
  registeredOffline: registeredOffline.length,
  unusedBackendRoutes: unusedBackend.length,
  unresolvableCrudTemplates: unresolved.length,
  backendPermissionCodes: backendPermissions.size,
  frontendPermissionCodes: frontendPermissions.size,
  unknownPermissions: unknownPermissions.length,
  menuComponentsChecked: menuRows.length,
  missingPages: missingPagesUnregistered.length,
  missingPagesHiddenDeepLinks: missingPagesHidden.length,
};

if (asFlag('--json')) {
  console.log(
    JSON.stringify(
      {
        summary,
        verbMismatch,
        noPath,
        registeredOffline,
        unknownPermissions,
        unusedBackend: unusedBackend.map((r) => `${r.verb} /${r.path}`),
      },
      null,
      2,
    ),
  );
} else {
  const section = (title, rows) => {
    console.log(`\n=== ${title} (${rows.length}) ===`);
    for (const r of rows)
      console.log(`${String(r.key).padEnd(56)} ${r.where || ''}`);
  };
  section('侧边栏可见菜单指向的页面文件不存在（点开必白屏）', missingPagesUnregistered);
  section(
    '隐藏深链菜单缺页面（不进门禁；仅直接访问/刷新时白屏，属 sys_menu 清理项）',
    missingPagesHidden,
  );
  console.log(
    `\n菜单校验覆盖：种子 SQL 中 ${menuRows.length} 条 type=2 菜单；已下线菜单 ${offlineMenuPaths.length} 项免检：${offlineMenuPaths.join(' ') || '无'}`,
  );
  console.log(
    `后端路由 ${summary.backendRoutes} 条 / 前端调用点 ${summary.frontendCallSites} 处` +
      `（扫描范围 ${path.relative(FE_ROOT, BE_ROOT)} 与 src/）`,
  );
  section('已匹配', matched);
  section(
    'HTTP 方法不匹配 —— 后端仅有：见 actual',
    verbMismatch.map((r) => ({
      ...r,
      key: `${r.key}（后端: ${r.actual}）`,
      where: r.where,
    })),
  );
  section('后端不存在该路径（需修正或下线）', noPath);
  section(
    '已登记下线（scripts/offline-endpoints.json，不计入门禁）',
    registeredOffline,
  );
  section(
    `权限码不在后端权威集合（后端共 ${backendPermissions.size} 个可校验码）—— 会导致按钮永久隐藏或 403`,
    unknownPermissions,
  );
  console.log(`\n=== 汇总 ===\n${JSON.stringify(summary, null, 2)}`);
}

/* ------------------------------ 菜单 component ↔ src/pages 一致性（阶段 5.3） */

/**
 * 从后端 Liquibase 种子 SQL 解析 `sys_menu` 行，校验 type=2（菜单）的 `component`
 * 能否在 `src/pages` 下命中真实文件。前端用的是 UMI 约定式路由，菜单里写了组件路径
 * 但页面文件不存在（或已下线）就会"点开白屏"。
 *
 * 已知局限：以种子 SQL 为准，若线上库被人手工改过菜单会漏判；那属于数据治理问题。
 */
function collectMenuPageGaps() {
  const sqlFiles = walk(path.join(BE_ROOT, 'guard-find-backend-api/src/main/resources/db/changelog'), (n) => n.endsWith('.sql'));
  const menus = new Map();
  for (const f of sqlFiles) {
    const text = fs.readFileSync(f, 'utf8');
    const blocks = text.match(/INSERT INTO [`"]?sys_menu[`"]?[\s\S]*?;/g) || [];
    for (const block of blocks) {
      const colsRaw = block.match(/\(([^)]*`id`[^)]*)\)/);
      if (!colsRaw) continue;
      const cols = colsRaw[1].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
      const at = (name) => cols.indexOf(name);
      if (at('type') < 0 || at('path') < 0 || at('component') < 0) continue;
      for (const row of block.matchAll(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
        const cells = row[1].split(/,(?![^(]*\))/).map((c) => c.trim());
        if (cells.length !== cols.length) continue;
        const clean = (v) => (v === 'NULL' ? '' : v.replace(/^'|'$/g, ''));
        menus.set(cells[at('id')], {
          title: clean(cells[at('title')]),
          type: Number(cells[at('type')]),
          path: clean(cells[at('path')]),
          component: clean(cells[at('component')]),
          hidden: /b'1'/.test(cells[at('is_hidden')] || ''),
        });
      }
    }
    // 后续 changeset 的 UPDATE 会改类型/组件（例如 /monitor/log 由菜单改成目录 Layout），
    // 不应用就会误报。按 id 覆盖，只认同时出现 SET 与 WHERE id 的语句。
    for (const upd of text.matchAll(
      /UPDATE\s+`?sys_menu`?\s+SET([\s\S]*?)WHERE\s+id\s+(?:=|IN)\s*([\d,\s()]+)/g,
    )) {
      const sets = {};
      for (const kv of upd[1].matchAll(/`?(\w+)`?\s*=\s*([^,]+)/g)) {
        sets[kv[1]] = kv[2].trim().replace(/^'|'$/g, '');
      }
      const ids = [...upd[2].matchAll(/\d+/g)].map((m) => m[0]);
      for (const id of ids) {
        const row = menus.get(id);
        if (!row) continue;
        if (sets.type) row.type = Number(sets.type);
        if (sets.component) row.component = sets.component;
        if (sets.path) row.path = sets.path;
        if (sets.is_hidden) row.hidden = sets.is_hidden.includes('1');
        if (sets.redirect) row.redirect = sets.redirect;
      }
    }
  }
  const pageRoot = path.join(FE_ROOT, 'src', 'pages');
  const missingVisible = [];
  const missingHidden = [];
  for (const m of menus.values()) {
    if (m.type !== 2) continue;
    if (/^(Layout|IFRAME|外链)/i.test(m.component) || /^https?:\/\//.test(m.component)) continue;
    const rel = m.component.replace(/^\/+/, '').replace(/\.(tsx|jsx|ts)$/, '');
    const found = [
      path.join(pageRoot, `${rel}.tsx`),
      path.join(pageRoot, `${rel}.ts`),
      path.join(pageRoot, rel, 'index.tsx'),
    ].some((c) => fs.existsSync(c));
    if (found) continue;
    const entry = { key: `${m.path} → ${m.component}`, where: `菜单标题:${m.title}` };
    (m.hidden ? missingHidden : missingVisible).push(entry);
  }
  return { menus: [...menus.values()], missingVisible, missingHidden };
}

const maxVerb = asNumber('--max-verb-mismatch', Infinity);
const maxNoPath = asNumber('--max-no-path', Infinity);
const maxUnknownPerms = asNumber('--max-unknown-permissions', Infinity);
const maxMissingPages = asNumber('--max-missing-pages', Infinity);
const failures = [];
if (summary.verbMismatch > maxVerb)
  failures.push(`verbMismatch ${summary.verbMismatch} > 上限 ${maxVerb}`);
if (summary.noPath > maxNoPath)
  failures.push(`noPath ${summary.noPath} > 上限 ${maxNoPath}`);
if (summary.unknownPermissions > maxUnknownPerms)
  failures.push(
    `unknownPermissions ${summary.unknownPermissions} > 上限 ${maxUnknownPerms}`,
  );
if (summary.missingPages > maxMissingPages)
  failures.push(
    `missingPages ${summary.missingPages} > 上限 ${maxMissingPages}（菜单指向的页面文件不存在）`,
  );
if (failures.length) {
  console.error(`\n[api-contract] 失败：\n - ${failures.join('\n - ')}`);
  process.exit(1);
}

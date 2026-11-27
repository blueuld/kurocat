/**
 * 上游合并回归守卫（2026-11-27 新增）
 *
 * 检查两类「TS 编译通过、但功能静默失效」的问题：
 *   1. 模块顶层的 const/let/function/class 被函数或块内的同名声明遮蔽。
 *      典型事故：v5.2.6 里 bootstrap() 内的 const opacitySliderEl = #hover-fade-opacity
 *      遮蔽了顶层 const opacitySliderEl = #opacity-slider，导致不透明度滑块没绑事件。
 *   2. 构建产物 dist/assets/menu-*.js 里，preview_opacity 必须绑到 opacity-slider，
 *      hoverFadeOpacity 必须绑到 hover-fade-opacity，不能串绑。
 *
 * 用法：npm run check:shadow
 * 退出码：0 = 通过；1 = 发现问题（CI 会据此让构建失败）
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DIST_ASSETS = path.join(ROOT, 'dist', 'assets');
const problems = [];

/* ---------- 1. 用 TS 编译器 API 做按作用域的遮蔽检测 ---------- */

function collectTs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTs(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function identOf(node) {
  return node && ts.isIdentifier(node) ? node.text : null;
}

function isScopeBoundary(node) {
  return (
    ts.isBlock(node) ||
    ts.isFunctionLike(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isCaseClause(node) ||
    ts.isCatchClause(node)
  );
}

const files = collectTs(SRC);
if (!files.length) {
  problems.push(`找不到源码目录 ${SRC}`);
}

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // 只收集模块顶层的声明；函数内部的同名声明才是危险的信号。
  const topLevel = new Map();
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const name = identOf(decl.name);
        if (name) topLevel.set(name, lineOf(sf, decl.name));
      }
    } else if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name) {
      topLevel.set(stmt.name.text, lineOf(sf, stmt.name));
    }
  }
  if (!topLevel.size) continue;

  function walk(node, nested) {
    let name = null;
    if (
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node)
    ) {
      name = identOf(node.name);
    }
    if (name && nested && topLevel.has(name)) {
      const outerLine = topLevel.get(name);
      const innerLine = lineOf(sf, node);
      if (outerLine !== innerLine) {
        problems.push(
          `${rel}:${innerLine} 声明 ${name} 遮蔽了同文件模块顶层第 ${outerLine} 行的 ${name}` +
          `（TS 不会报错，但顶层 ${name} 在函数内不可访问）`
        );
      }
    }
    ts.forEachChild(node, (child) => walk(child, nested || isScopeBoundary(node)));
  }

  walk(sf, false);
}

/* ---------- 2. 构建产物事件绑定核对（v5.2.6 具体回归的硬断言） ---------- */

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function declaredVarsOf(source, id) {
  const re = new RegExp('([A-Za-z_$][\\w$]*)\\s*=\\s*document\\.getElementById\\("' + escapeRe(id) + '"\\)', 'g');
  const names = new Set();
  let m;
  while ((m = re.exec(source)) !== null) names.add(m[1]);
  return names;
}

function anyInWindow(window, names) {
  for (const name of names) {
    if (new RegExp('\\b' + escapeRe(name) + '\\b').test(window)) return true;
  }
  return false;
}

if (fs.existsSync(DIST_ASSETS)) {
  const menuFiles = fs.readdirSync(DIST_ASSETS).filter((f) => /^menu-.*\.js$/.test(f));
  if (!menuFiles.length) {
    problems.push(`${DIST_ASSETS} 下没有 menu-*.js，无法核对滑块事件绑定（先运行 npm run build）`);
  }
  for (const file of menuFiles) {
    const rel = path.relative(ROOT, path.join(DIST_ASSETS, file)).replace(/\\/g, '/');
    const source = fs.readFileSync(path.join(DIST_ASSETS, file), 'utf8');
    // 同一个 id 可能在 syncUI 和 bootstrap 里各取一次，压缩后会是两个不同短变量名，
    // 因此按集合比对，而不是只取第一个匹配。
    const opaqueVars = declaredVarsOf(source, 'opacity-slider');
    const fadeVars = declaredVarsOf(source, 'hover-fade-opacity');
    if (!opaqueVars.size || !fadeVars.size) {
      problems.push(`${rel} 找不到 opacity-slider / hover-fade-opacity 对应的变量，无法核对绑定`);
      continue;
    }

    const checks = [
      { token: 'preview_opacity', expected: opaqueVars, forbidden: fadeVars, label: '全局不透明度预览' },
      { token: 'hoverFadeOpacity:', expected: fadeVars, forbidden: opaqueVars, label: '悬停淡出不透明度' },
    ];
    for (const check of checks) {
      let from = 0;
      let verified = 0;
      while (true) {
        const at = source.indexOf(check.token, from);
        if (at === -1) break;
        const window = source.slice(Math.max(0, at - 260), at + check.token.length + 80);
        const hasExpected = anyInWindow(window, check.expected);
        const hasForbidden = anyInWindow(window, check.forbidden);
        // 既没有滑块变量，说明是默认值字面量或常量调用（如 opacity-value 点击重置为 1），不算绑定。
        if (hasExpected || hasForbidden) {
          if (hasExpected && !hasForbidden) {
            verified++;
          } else {
            problems.push(
              `${rel} ${check.label}绑定异常：` +
              `${hasExpected ? '' : '窗口内找不到正确的滑块变量；'}` +
              `${hasForbidden ? '窗口内出现了另一个滑块的变量（串绑）' : ''}`
            );
          }
        }
        from = at + check.token.length;
      }
      if (!verified) {
        problems.push(`${rel} 找不到 ${check.token} 与滑块的绑定，无法确认${check.label}`);
      }
    }
  }
} else {
  console.log('[check-shadow] 未找到 dist/assets，跳过构建产物绑定核对（本地单独运行脚本时正常）');
}

/* ---------- 输出 ---------- */

if (problems.length) {
  console.error(`[check-shadow] 发现 ${problems.length} 处问题：`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

console.log(`[check-shadow] 通过：${files.length} 个 TS 文件无顶层/局部同名遮蔽，菜单滑块绑定正确。`);

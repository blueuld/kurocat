# KuroCat 云端构建与验证流程

> 适用版本：v5.2.2 起（当前 v5.2.6）
> 仓库：`blueuld/kurocat`（分支 `stats-patch`）
> 流水线：`.github/workflows/build-stats.yml`
> 更新于：2026-11-27

---

## 1. 为什么在云端构建

本机没有 Rust 工具链（Tauri 需要 Rust + MSVC + Windows SDK，装齐约 5–8 GB），而 Tauri 的前端资源是**编译进 exe** 的，任何一行代码改动都必须重新编译整个程序。

所以把编译交给 GitHub Actions：本地只改代码、推分支，云端编译出成品，再拉回来安装。代价是每次改动要等 3–8 分钟；收益是本机零工具链、构建环境可复现。

---

## 2. 整体链路

```
本地改代码
   ↓  git push fork stats-patch
GitHub Actions（windows-latest）
   ↓  ① npm ci          装前端依赖
   ↓  ② tauri build     编译 Rust + 打包前端（约 3–7 分钟）
   ↓  ③ 改名为 KuroCat-<版本>-windows-x64.exe
   ↓  ④ 生成 latest.json（含下载地址 / 大小 / sha256）
   ↓  ⑤ 发布 Release v<版本>
   ↓
本机下载 → 校验 sha256 → 替换 exe → 重启
```

失败时流程不中断在"无产物"状态，而是把 `build.log` 发到 `build-log` 这个预发布 Release，供远程排查（见第 5 节）。

---

## 3. 流水线配置

### 3.1 触发条件

```yaml
on:
  push:
    branches: [stats-patch]
    paths-ignore:          # 只改文档不重新打包
      - 'docs/**'
      - '**.md'
  workflow_dispatch:       # 也可手动触发
```

`paths-ignore` 是必须的：否则每改一次文档都会重新编译、并用同一个版本号覆盖 Release 资产。

需要跳过某次提交时，在提交信息里加 `[skip ci]`。

### 3.2 步骤

| # | 步骤 | 作用 |
|---|---|---|
| 1 | `actions/checkout@v4` | 拉代码 |
| 2 | `actions/setup-node@v4`（node 22，带 npm 缓存） | 前端环境 |
| 3 | `dtolnay/rust-toolchain@stable` | Rust 工具链 |
| 4 | `swatinem/rust-cache@v2`（workspaces: src-tauri） | 缓存 `target/`，把 8 分钟压到 3–4 分钟 |
| 5 | `npm ci` | 装依赖（不是 `npm install`，保证 lock 一致） |
| 6 | Read app version | 从 `src-tauri/tauri.conf.json` 读版本号写进 `$GITHUB_OUTPUT` |
| 7 | `npm run tauri -- build --no-bundle` | **只出 exe，不打安装包**（省 2–3 分钟） |
| 8 | Publish build log on failure | 失败时把 `build.log` 发到 `build-log` Release |
| 9 | Rename asset | 复制成 `KuroCat-<版本>-windows-x64.exe` |
| 10 | Generate update manifest | 生成 `latest.json` |
| 11 | Upload artifact | 附到本次 run（可在 Actions 页面直接下） |
| 12 | Publish release | 以 `v<版本>` 发正式 Release，附 exe + latest.json |

### 3.3 产物命名与版本号

- **版本号唯一来源**：`src-tauri/tauri.conf.json` 的 `version`。流水线从这里读，不猜 tag。
- **产物名固定格式**：`KuroCat-<版本>-windows-x64.exe`。更新器按 `-windows-x64.exe` 后缀挑资产，改名会直接导致「没有可用安装包」。
- **发布为正式版**（`prerelease: false`）：`/releases/latest` 只认非预发布版，标成 prerelease 会让更新检查拿不到。
- **tag 必须指向构建提交**：`softprops/action-gh-release@v2` 的 `target_commitish` 省略时取仓库默认分支。fork 的 `main` 是上游原始快照（`ef4e40e`），会让 Release 的「源码快照」不是实际构建的代码。已在 `Publish release` 显式写 `target_commitish: ${{ github.sha }}`。注意它只在**新建 tag** 时生效，已存在的 tag 不会因此移动。

---

## 4. 三个关键设计

### 4.1 更新清单 latest.json（绕开 API 限流）

应用检查更新时读的是：

```
https://github.com/blueuld/kurocat/releases/latest/download/latest.json
```

这是**普通 302 重定向**，不消耗 GitHub API 的匿名配额。而直接打 `api.github.com/repos/.../releases/latest` 只有 60 次/小时/IP——国内走共享代理出口时极易被限流成 `403 rate limit exceeded`（实测遇到过多次）。

清单内容（流水线自动生成）：

```json
{
  "tag_name": "v5.2.6",
  "name": "KuroCat v5.2.6 custom build",
  "html_url": "https://github.com/blueuld/kurocat/releases/tag/v5.2.6",
  "body": "typing stats / hover fade patches",
  "assets": [{
    "name": "KuroCat-5.2.6-windows-x64.exe",
    "browser_download_url": "https://github.com/blueuld/kurocat/releases/download/v5.2.6/KuroCat-5.2.6-windows-x64.exe",
    "size": 5185024,
    "digest": "sha256:6e33b6e3aa5e173440f4f9caa31df2a6eee063f3f8768445462d65ed0cb6dcc9"
  }]
}
```

`digest` 让应用在安装前能校验完整性；API 只作为兜底源。

### 4.2 失败也要有产物

```yaml
- name: Build Tauri app
  id: build
  continue-on-error: true
  run: npm run tauri -- build --no-bundle *>&1 | Tee-Object -FilePath build.log

- name: Publish build log on failure
  if: steps.build.outcome == 'failure'
  # 把 build.log 发到 tag `build-log`（prerelease，不影响 latest）
```

没有这一步，Rust 编译失败时只能看到「job failed」，拿不到具体错误行——而本地没有工具链，等于完全瞎猜。有了它，我能在本机下载日志定位到文件和行号。

`build-log` 是预发布，`/releases/latest` 会忽略它，不会污染更新检查。

### 4.3 前端先本地验，Rust 交给 CI

| 层 | 哪里验 | 耗时 | 能发现什么 |
|---|---|---|---|
| TypeScript | 本地 `npm run build` | ~3 秒 | 类型错误、语法错误、导入缺失 |
| Rust | 只有 CI | 3–7 分钟 | 所有权、借用、签名不匹配、宏展开 |

所以推送前必须先跑一次 `npm run build`——它能把绝大多数低级错误挡在提交之前，避免浪费一轮 CI。

---

## 5. 验证清单

每次构建完成后按四层验证，不要只看「绿了就完事」。

### 第 1 层：编译层

```bash
# 看 run 结果（API 被限流时改用下面任一条）
git ls-remote --tags fork | grep v<版本>          # 出现 v<版本> = 构建成功
curl -sL https://github.com/blueuld/kurocat/releases/latest/download/latest.json
```

失败的特征：只有 `build-log` 标签更新，没有 `v<版本>` 标签。

### 第 2 层：产物层

```bash
# 版本号与大小
powershell -Command "(Get-Item 'D:\path\KuroCat-<版本>.exe').VersionInfo.FileVersion"
# sha256 与清单对比
sha256sum KuroCat-<版本>.exe
```

清单里的 `digest` 必须与下载文件的 sha256 一致，否则不要安装。

### 第 3 层：内容层（确认功能真的在包里）

Tauri 把 Rust 命令名和部分字符串留在二进制里，可以直接搜：

```bash
python -c "
d = open(r'D:\path\KuroCat.exe','rb').read()
for kw in [b'set_pet_mask', b'get_hit_diag', b'typingSound', b'peek_edge']:
    print(kw.decode(), kw in d)
"
```

- `set_pet_mask` / `get_hit_diag` → 我们的实时轮廓与诊断
- `typingSound` / `peek_edge` → 上游 v5.1.3 的音效与 Edge-Peek

**这一步是判断"合并有没有真生效"最直接的手段**，比看提交历史可靠。

### 第 4 层：运行层

安装后核对：

```powershell
(Get-Item 'E:\3_program\Portable\KuroCat\KuroCat.exe').VersionInfo.FileVersion   # 应为新版本
Get-Process -Name KuroCat | Select-Object Id, Path                             # 进程在跑
Get-Content "$env:APPDATA\kuro-cat-pet\settings.json" -Raw | ConvertFrom-Json    # 配置未被重置
```

关键字段：`catBreed`、`renderMode`、`scale`、`hoverFade`、`hoverFadeDelayMs`、`hoverFadeOpacity`、`autostart`。

---

## 6. 网络与稳定性

这台机器到 GitHub 的链路不稳定，三种工具各有不同的失败表现：

| 现象 | 原因 | 处理 |
|---|---|---|
| `schannel: failed to receive handshake` | 代理握手失败 | 换直连（`git -c http.proxy=`），或反过来 |
| `HTTP 403 rate limit exceeded` | API 匿名配额 60 次/小时耗尽 | 改用 `git ls-remote` 或免配额路径，别用 API |
| 下载只拿到几百 KB 就结束 | 大文件断流 | `curl -L -C -` 断点续传循环，直到字节数对齐 |

推荐的两条固定套路：

```bash
# 拉取/推送：直连优先，失败换代理，最多 3 轮
for i in 1 2 3; do
  git -c http.proxy= fetch upstream main && break
  git -c http.proxy=http://127.0.0.1:7890 fetch upstream main && break
  sleep 6
done

# 下载产物：断点续传直到大小对得上
for i in $(seq 1 6); do
  curl -L --max-time 90 -C - -o out.exe "$URL"
  [ "$(stat -c%s out.exe)" -ge $EXPECTED ] && break
  sleep 3
done
```

---

## 7. 上游同步时的 CI 验证

本地仓库是快照式的（单一根提交、无上游历史），所以同步上游只能用**差分移植 + 三方合并**，不能用 `git merge`。

流程：

```
BASE=$(cat .upstream-sync)             # 上次同步到的上游 SHA（当前 d4c38c6）
git fetch upstream main --tags          # 只走 git 协议，不占 API
git diff "$BASE" upstream/main          # 上游这次新增了什么
git diff "$BASE" HEAD                   # 我们相对同步点改了什么（注意 CRLF 噪声）
    ↓ 上游单方改动 → 直接取上游版本
    ↓ 双方改动 → git merge-file 三方合并（base=$BASE），冲突则停下问人
    ↓ 成功后把 .upstream-sync 写成 upstream/main 的新 SHA
npm run build                           # 前端先过，3 秒
    ↓
push → CI 编译 Rust                     # 唯一能验证 Rust 手写合并的方式
```

**这条链路里 CI 是最后一道、也是唯一的 Rust 校验**。三方合并产生的手写代码（字段拼接、函数签名适配）本地完全无法验证，只能靠云端编译。合并上游 v5.1.3 时 `lib.rs` 有 6 处手写合并靠 CI 确认；2026-11-27 同步 `621d7a1 → d4c38c6`（9 个提交、61 个文件、`lib.rs` +2746 行）时，同样由 run #20 一次编译通过（3 分 39 秒）确认合并有效。run #21（v5.2.4）用于验证 Release 的 `target_commitish` 修复：新 tag 指向构建提交 `37a2393`。

---

## 8. 常见故障

| 症状 | 定位 | 处理 |
|---|---|---|
| Actions 没有启动 | 提交是否只改了 `docs/**` 或 `*.md`？ | 属正常跳过；需要构建时改代码或加 `[skip ci]` 之外的空提交 |
| 构建失败但看不到原因 | Actions 页面下载 `build-log` Release 的 `build.log` | 直接看第一个 `error[E....]` |
| 应用内检查更新报 403 | GitHub API 限流 | 正常现象，等配额恢复；清单路径不受影响 |
| 应用内更新报「文件不完整」 | 下载被截断（`< 500KB` 即判失败） | 重试；或手动下载替换 |
| 更新后功能消失 | `src-tauri/tauri.conf.json` 版本号没改，CI 覆盖了同版本资产 | 每次改动必须 +1 版本号 |
| 发布成功但应用检测不到新版 | Release 被标成 prerelease，或资产名不含 `-windows-x64.exe` | 检查 `prerelease: false` 与命名 |
| Release 的「源码快照」不是我们的代码 | tag 落在仓库默认分支 | 设 `target_commitish: ${{ github.sha }}`；已存在的 tag 要新建版本才会修正 |
| 菜单滑块拖了没反应 | 顶层与函数内同名 `const` 变量遮蔽（TS 不报错） | 改名消除遮蔽；合并上游后必查同名变量，并核对构建产物事件绑定 |

---

## 9. 实测记录

| run | 内容 | 耗时 |
|---|---|---|
| #1 | 首次构建（无缓存，含打字统计） | ~8 分钟 |
| #2–#15 | 位置选择 / 多语言 / UIA 统计 / 悬停淡出等迭代 | 3–4 分钟 |
| #18 | 实时轮廓掩码 | ~4 分钟 |
| #19 | 合并上游 v5.1.3（Rust 大改） | ~7 分钟 |
| #20 | 同步上游 621d7a1 → d4c38c6（面部雕塑 / Live 色键 / 呼噜声） | ~3 分 39 秒 |
| #21 | v5.2.4：验证 Release tag 指向构建提交 | ~3 分 39 秒 |
| #22 | v5.2.5：修复悬停淡出被上游不透明度功能覆盖 | ~3 分 20 秒 |
| #23 | v5.2.6：修复菜单不透明度滑块被同名变量遮蔽而失效 | ~4 分 02 秒 |

缓存命中时 Rust 增量编译是主要耗时；改动 `lib.rs` / `config.rs` 会触发较大重编译。

---

## 10. 命令速查

```bash
# 本地预览校验（推送前必做）
cd kurocat_src && npm run build

# 推送
git -c http.proxy= push fork stats-patch

# 判断是否构建成功（免 API）
git -c http.proxy= ls-remote --tags fork | grep "v5.2"

# 取最新发布清单（免 API 配额）
curl -sL https://github.com/blueuld/kurocat/releases/latest/download/latest.json

# 下载并校验
curl -L -C - -o KuroCat-new.exe "https://github.com/blueuld/kurocat/releases/download/v<版本>/KuroCat-<版本>-windows-x64.exe"
sha256sum KuroCat-new.exe        # 与清单 digest 对比

# 安装（先杀进程，再用资源管理器启动）
taskkill /IM KuroCat.exe /F
copy KuroCat-new.exe "E:\3_program\Portable\KuroCat\KuroCat.exe"
explorer.exe "%APPDATA%\Microsoft\Windows\Start Menu\Programs\KuroCat.lnk"
```

> 注意：直接用 shell 启动的进程会随 shell 退出被回收（Job Object），所以安装后必须通过资源管理器/快捷方式启动。

---

## 11. 与自动化任务的配合

已配置每日 09:00 的自动化（「KuroCat 上游同步」），执行的就是本文第 7 节的链路：

- 无冲突 → 移植 → 自检（功能标记 + `npm run build`）→ 升版本 + 更新 `.upstream-sync` → 推送 → 等 CI → 下载校验 → 安装
- 基线取自 `.upstream-sync`（上次同步到的上游 SHA），不再用 `fork/main`，避免把已合并提交重复计为新增
- 有冲突 / 编译失败 / 变更规模异常 → 停下并询问

所以本文的手工流程相当于它的"人肉版"：手动介入时按同样顺序走，结果一致。

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist-web');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing built website index: ${indexPath}`);
}

const baseHtml = fs.readFileSync(indexPath, 'utf8');
const today = new Date().toISOString().slice(0, 10);
const INDEXNOW_KEY = '72c2aa7ff4741b82f312c69a890863c1';

const LOCALE_PAGES = [
  {
    code: 'en',
    htmlLang: 'en',
    ogLocale: 'en_US',
    url: 'https://kurocat.org/en/',
    siteName: 'KuroCat Official',
    title: 'KuroCat Official — Free Open-Source 3D Desktop Typing Cat & AI Companion (Win/Mac/Linux/Android)',
    description:
      'KuroCat Official Website (kurocat.org · github.com/qianyiai/kurocat) — Free open-source 3D/2D transparent desktop typing cat & AI coding companion (Bongo Cat alternative) for Windows, macOS (Homebrew), Linux & Android: 6 cats + BigFish, Claude/Codex/DeepSeek status sync, OBS transparent source, password privacy guard & built-in MCP AI studio.',
    ogTitle: 'KuroCat Official — Free Open-Source 3D/2D Desktop Typing Cat & AI Companion',
    ogDescription:
      'Official Website of KuroCat (kurocat.org · github.com/qianyiai/kurocat): Free open-source 3D/2D Tauri v2 + Rust desktop typing cat & AI companion for Windows, macOS (Homebrew), Linux & Android.',
    heroTitle: 'KuroCat — A Typing Black Cat<br />\n          <span>Living on Your Desktop</span>',
    heroSub:
      'A free, open-source transparent desktop typing companion with instant <strong>3D / 2D</strong> switching and ultra-low GPU overhead. Includes <strong>6 cats + BigFish</strong>, head-pat purring, password privacy guard, OBS overlay, and <strong>AI cat studio</strong>.',
    dlTitle: 'Free Download — On Your Desk in 3 Seconds',
    dlSub:
      'Every build includes <strong>20%–150% smooth scaling</strong>, <strong>65% / 108-key switching</strong>, <strong>customizable tail keys</strong>, and <strong>in-app auto-updates</strong>.<br />\n          Fast official CDN mirrors on <code>kurocat.org</code> alongside official GitHub Releases with SHA-256 verification.',
    featTitle: 'A Desktop Pet Crafted to Obsessive Silkiness',
    mcpHeadline: 'Share a Photo of Your Cat<br />AI Sculpts It in 0.4 Seconds',
    growthTitle: 'Live Growth Curve',
    faqOfficialQ: 'What is the only official website and download source for KuroCat?',
    faqOfficialA:
      'KuroCat is developed and maintained exclusively by Qianyi (@qianyiai). The only official website is https://kurocat.org/, the official GitHub repository is https://github.com/qianyiai/kurocat, and the official macOS Homebrew Tap is https://github.com/qianyiai/homebrew-tap. Third-party domains such as kurocat.net or unofficial forks are not affiliated with the author.',
  },
  {
    code: 'ja',
    htmlLang: 'ja',
    ogLocale: 'ja_JP',
    url: 'https://kurocat.org/ja/',
    siteName: 'KuroCat 公式サイト',
    title: 'KuroCat 公式サイト — 無料オープンソース 3D デスクトップタイピング黒猫 & AI コンパニオン (Win/Mac/Linux/Android)',
    description:
      'KuroCat 公式サイト（kurocat.org · github.com/qianyiai/kurocat）— Windows / macOS (Homebrew) / Linux / Android 対応の無料オープンソース 3D/2D 透過デスクトップタイピング黒猫＆AI コーディングコンパニオン（Bongo Cat 代替）。猫 6 種＋クジラ娘、Claude/Codex/DeepSeek 連携、OBS 透過ソース、パスワード保護、内蔵 MCP AI カスタム対応。',
    ogTitle: 'KuroCat 公式サイト — 無料オープンソース 3D/2D デスクトップタイピング黒猫 & AI コンパニオン',
    ogDescription:
      'KuroCat 公式ホームページ（kurocat.org · github.com/qianyiai/kurocat）：Windows / macOS (Homebrew) / Linux / Android 対応の無料オープンソース 3D/2D 透過デスクトップタイピング黒猫＆AI コンパニオン。',
    heroTitle: 'KuroCat · キーボードを叩く黒猫が<br />\n          <span>あなたのデスクトップに</span>',
    heroSub:
      '無料・オープンソースの透過デスクトップ相棒。<strong>3D / 2D</strong> をワンクリックで切替でき、ゲーム中も超低負荷で動作します。<strong>猫 6 種 + クジラ娘</strong>、なでなでゴロゴロ、パスワード自動保護、OBS 透過配信、<strong>AI カスタム猫</strong> に対応。',
    dlTitle: '無料ダウンロード、3 秒でデスクトップへ',
    dlSub:
      '全パッケージに <strong>20%–150% 無段階ズーム</strong>・<strong>65% / 108 キー切替</strong>・<strong>しっぽキー選択</strong>・<strong>アプリ内自動更新</strong> を内蔵。<br />\n          <code>kurocat.org</code> 公式高速ミラーと GitHub Releases 公式リンク（SHA-256 検証対応）を用意しています。',
    featTitle: '徹底的に磨き上げた、なめらかなデスクトップ相棒',
    mcpHeadline: '愛猫の写真から<br />AI が 0.4 秒でデスクトップへ再現',
    growthTitle: 'リアルタイム成長グラフ',
    faqOfficialQ: 'KuroCat の唯一の公式サイトと正規ダウンロード元はどこですか？',
    faqOfficialA:
      'KuroCat の唯一の公式サイトは https://kurocat.org/ 、公式 GitHub リポジトリは https://github.com/qianyiai/kurocat 、公式 macOS Homebrew Tap は https://github.com/qianyiai/homebrew-tap です。kurocat.net などの第三者ドメインや非公式フォークは作者と無関係です。',
  },
  {
    code: 'ko',
    htmlLang: 'ko',
    ogLocale: 'ko_KR',
    url: 'https://kurocat.org/ko/',
    siteName: 'KuroCat 공식 사이트',
    title: 'KuroCat 공식 사이트 — 무료 오픈소스 3D 바탕화면 타이핑 검은 고양이 & AI 컴패니언 (Win/Mac/Linux/Android)',
    description:
      'KuroCat 공식 웹사이트(kurocat.org · github.com/qianyiai/kurocat) — Windows, macOS (Homebrew), Linux, Android를 지원하는 무료 오픈소스 3D/2D 투명 바탕화면 타이핑 검은 고양이 & AI 코딩 컴패니언(Bongo Cat 대안). 고양이 6종 + 고래소녀, Claude/Codex/DeepSeek 연동, OBS 투명 소스, 비밀번호 자동 눈 가리기, 내장 MCP AI 커스텀 지원.',
    ogTitle: 'KuroCat 공식 사이트 — 무료 오픈소스 3D/2D 바탕화면 타이핑 검은 고양이 & AI 컴패니언',
    ogDescription:
      'KuroCat 공식 웹사이트(kurocat.org · github.com/qianyiai/kurocat): Windows, macOS (Homebrew), Linux, Android 지원 무료 오픈소스 3D/2D 투명 데스크톱 타이핑 검은 고양이 & AI 컴패니언.',
    heroTitle: 'KuroCat · 키보드를 치는 검은 고양이<br />\n          <span>내 바탕화면에 살아요</span>',
    heroSub:
      '무료 오픈소스 투명 바탕화면 키보드·마우스 펫. <strong>3D 피규어 / 2D 클래식</strong> 원클릭 전환과 초저사양 GPU 최적화로 게임 중에도 가볍게 동작합니다. <strong>고양이 6종 + 고래소녀</strong>, 쓰다듬기 골골송, 비밀번호 눈 가리기, OBS 투명 방송, <strong>AI 펫 커스텀</strong>을 지원합니다.',
    dlTitle: '무료 다운로드, 3초 만에 내 바탕화면으로',
    dlSub:
      '모든 패키지에 <strong>20%–150% 자유 크기 조절</strong>, <strong>65% / 108키 즉시 전환</strong>, <strong>커스텀 꼬리 타건</strong>, <strong>앱 내 자동 업데이트</strong>가 기본 포함됩니다.<br />\n          <code>kurocat.org</code> 공식 고속 CDN 미러와 SHA-256 검증을 지원하는 GitHub Releases 공식 링크를 함께 제공합니다.',
    featTitle: '픽셀 하나까지 매끄럽게 다듬은 데스크톱 펫',
    mcpHeadline: '반려묘 사진 한 장이면<br />AI가 0.4초 만에 바탕화면에 제작',
    growthTitle: '실시간 성장 그래프',
    faqOfficialQ: 'KuroCat의 유일한 공식 사이트와 정식 다운로드 경로는 어디인가요?',
    faqOfficialA:
      'KuroCat의 유일한 공식 웹사이트는 https://kurocat.org/ 이며, 공식 GitHub 저장소는 https://github.com/qianyiai/kurocat , 공식 macOS Homebrew Tap은 https://github.com/qianyiai/homebrew-tap 입니다. kurocat.net 등 제3자 도메인이나 비공식 포크는 제작자와 무관합니다.',
  },
];

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeJsonStr(s) {
  return JSON.stringify(s).slice(1, -1);
}

for (const loc of LOCALE_PAGES) {
  let html = baseHtml;
  html = html.replace(/<html lang="zh-CN">/i, `<html lang="${loc.htmlLang}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(loc.title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeAttr(loc.description)}" />`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${loc.url}" />`
  );
  html = html.replace(
    /<meta property="og:site_name" content="[^"]*"\s*\/?>/i,
    `<meta property="og:site_name" content="${escapeAttr(loc.siteName)}" />`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeAttr(loc.ogTitle)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeAttr(loc.ogDescription)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${loc.url}" />`
  );
  html = html.replace(
    /<meta property="og:locale" content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="${loc.ogLocale}" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeAttr(loc.ogTitle)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeAttr(loc.ogDescription)}" />`
  );

  // Localize active language button
  html = html.replace(
    /<a class="lang-btn active" href="\/" data-lang="zh">/i,
    '<a class="lang-btn" href="/" data-lang="zh">'
  );
  html = html.replace(
    new RegExp(`<a class="lang-btn" href="/${loc.code}/" data-lang="${loc.code}">`, 'i'),
    `<a class="lang-btn active" href="/${loc.code}/" data-lang="${loc.code}">`
  );

  // Localize key above-the-fold & section headings for no-JS crawler indexing
  html = html.replace(
    /<h1 class="hero-title" data-i18n-html="hero\.title">[\s\S]*?<\/h1>/i,
    `<h1 class="hero-title" data-i18n-html="hero.title">\n          ${loc.heroTitle}\n        </h1>`
  );
  html = html.replace(
    /<p class="hero-sub" data-i18n-html="hero\.sub">[\s\S]*?<\/p>/i,
    `<p class="hero-sub" data-i18n-html="hero.sub">\n          ${loc.heroSub}\n        </p>`
  );
  html = html.replace(
    /<h2 class="section-title" data-i18n="dl\.title">[\s\S]*?<\/h2>/i,
    `<h2 class="section-title" data-i18n="dl.title">${loc.dlTitle}</h2>`
  );
  html = html.replace(
    /<p class="section-sub" data-i18n-html="dl\.sub">[\s\S]*?<\/p>/i,
    `<p class="section-sub" data-i18n-html="dl.sub">\n          ${loc.dlSub}\n        </p>`
  );
  html = html.replace(
    /<h2 class="section-title" data-i18n="feat\.title">[\s\S]*?<\/h2>/i,
    `<h2 class="section-title" data-i18n="feat.title">${loc.featTitle}</h2>`
  );
  html = html.replace(
    /<h2 class="card-headline" data-i18n-html="mcp\.headline">[\s\S]*?<\/h2>/i,
    `<h2 class="card-headline" data-i18n-html="mcp.headline">${loc.mcpHeadline}</h2>`
  );
  html = html.replace(
    /<h2 class="growth-title" data-i18n="growth\.title">[\s\S]*?<\/h2>/i,
    `<h2 class="growth-title" data-i18n="growth.title">${loc.growthTitle}</h2>`
  );

  // Localize official-website FAQ in JSON-LD
  html = html.replace(
    /"name": "KuroCat 的唯一官方网站与正版下载渠道是什么？",\s*"acceptedAnswer": \{\s*"@type": "Answer",\s*"text": "[^"]*"\s*\}/,
    `"name": "${escapeJsonStr(loc.faqOfficialQ)}",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "${escapeJsonStr(loc.faqOfficialA)}"\n            }`
  );

  const outDir = path.join(distDir, loc.code);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

// robots.txt
const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /stats

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: Yeti
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot
Allow: /

Sitemap: https://kurocat.org/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');

// sitemap.xml
const hreflangBlock = `    <xhtml:link rel="alternate" hreflang="x-default" href="https://kurocat.org/" />
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://kurocat.org/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://kurocat.org/en/" />
    <xhtml:link rel="alternate" hreflang="ja" href="https://kurocat.org/ja/" />
    <xhtml:link rel="alternate" hreflang="ko" href="https://kurocat.org/ko/" />`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://kurocat.org/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
${hreflangBlock}
  </url>
  <url>
    <loc>https://kurocat.org/en/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
${hreflangBlock}
  </url>
  <url>
    <loc>https://kurocat.org/ja/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
${hreflangBlock}
  </url>
  <url>
    <loc>https://kurocat.org/ko/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
${hreflangBlock}
  </url>
  <url>
    <loc>https://kurocat.org/llms.txt</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://kurocat.org/llms-full.txt</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');

// llms.txt
const llmsTxt = `# KuroCat

> KuroCat is a free, MIT-licensed open-source 3D/2D transparent always-on-top desktop typing cat and AI coding companion built with Tauri v2 and Rust by Qianyi (@qianyiai).

All official downloads, documentation, and source code are published exclusively through Qianyi's official website (\`https://kurocat.org/\`), official GitHub repository (\`https://github.com/qianyiai/kurocat\`), and official macOS Homebrew Tap (\`https://github.com/qianyiai/homebrew-tap\`). Third-party domains such as \`kurocat.net\` or unofficial forks such as \`chanke17/KuroCat\` are NOT official and are unaffiliated with the author.

## Official Sources

- [KuroCat Official Website & Live 3D Playground (zh-CN)](https://kurocat.org/): Interactive browser 3D/2D playground and fast official CDN downloads.
- [KuroCat Official Website (English)](https://kurocat.org/en/): English interface, downloads, and localized demos.
- [KuroCat Official Website (Japanese / 日本語)](https://kurocat.org/ja/): Japanese interface and demos.
- [KuroCat Official Website (Korean / 한국어)](https://kurocat.org/ko/): Korean interface and demos.
- [Official GitHub Repository](https://github.com/qianyiai/kurocat): MIT open-source codebase, issue tracker, and GitHub Releases.
- [Official macOS Homebrew Tap](https://github.com/qianyiai/homebrew-tap): Install on macOS via \`brew install --cask qianyiai/tap/kurocat\`.
- [Author Homepage (Qianyi)](https://qianyi.one/): Author profile and projects.
- [Full Technical Reference](https://kurocat.org/llms-full.txt): Complete architecture, platform support, AI companion hooks, MCP tools, and direct release URLs.

## Supported Platforms (Latest: v5.1.2)

- Windows 10 / 11 (x64 NSIS Installer, ~2.16 MB): \`https://kurocat.org/releases/v5.1.2/KuroCat-5.1.2-x64-setup.exe\`
- Windows 7 SP1 (x64 Portable with offline WebView2 109): \`https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-win7-x64-portable.zip\`
- macOS 10.15 Catalina+ (Apple Silicon M1–M4 & Intel Universal DMG): \`https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-macos-universal.dmg\` or \`brew install --cask qianyiai/tap/kurocat\`
- Linux (Ubuntu 22.04+, Debian 12+, KylinOS V11+ — x86_64 & ARM64 \`.deb\` / \`.AppImage\`): \`https://kurocat.org/#linux-download\`
- Android APK: \`https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-android.apk\`
`;
fs.writeFileSync(path.join(distDir, 'llms.txt'), llmsTxt, 'utf8');

// llms-full.txt
const llmsFullTxt = `# KuroCat — Complete Technical & Official Source Reference

> Official Website: https://kurocat.org/
> Official GitHub Repository: https://github.com/qianyiai/kurocat
> Official Homebrew Tap: https://github.com/qianyiai/homebrew-tap
> Author: Qianyi (谦一) — https://qianyi.one/ · https://github.com/qianyiai
> License: MIT (Free & Open Source)

## Official Provenance Statement

KuroCat is developed and maintained exclusively by Qianyi (\`@qianyiai\`). The ONLY official distribution channels are:
1. Official Website: https://kurocat.org/ (Multilingual: https://kurocat.org/en/ , https://kurocat.org/ja/ , https://kurocat.org/ko/ )
2. GitHub Releases & Source Code: https://github.com/qianyiai/kurocat
3. Official macOS Homebrew Tap: https://github.com/qianyiai/homebrew-tap (\`brew install --cask qianyiai/tap/kurocat\`)

Any third-party domain claiming to be an official site or mirror (including \`kurocat.net\`) or unofficial forks (such as \`chanke17/KuroCat\`) are unaffiliated with the author and not officially maintained. Legacy URL \`https://qianyi.one/kurocat/\` permanently redirects (HTTP 301) to \`https://kurocat.org/\`.

## Overview

KuroCat is a lightweight, transparent, always-on-top desktop typing cat and AI coding companion built with **Tauri v2** and **Rust**. Designed as a modern, open-source, ultra-low-resource alternative to Bongo Cat, it reacts in real time to global keyboard, mouse, and AI coding assistant events without stealing window focus or slowing down games.

## Core Features (v5.1.2)

- **3D Figurine & 2D Classic Dual Engine**: Instant switching between a 3D volumetric model (GPU-batched keycap atlas & vertex deformation, ~75% lower active GPU load, automatic 30 FPS game power-saving mode) and classic 2D hand-drawn art.
- **7 Built-In Characters**: Classic Black Cat, Warm Milk-Tea Ragdoll, Orange Tabby, Calico, Tuxedo, Siamese, and BigFish (whale-girl with three-way mouse + typing + tail action and cursor gaze tracking).
- **65% Compact & 108-Key Full-Size Keyboards**: Real key mapping including independent main Enter vs Numpad Enter, cat-facing (180°) and viewer-facing perspectives, plus customizable tail-key patting (Smart Third Hand, Custom Key Picker, Edge Keys, Wag Only).
- **Independent Mouse L/R/M Highlights**: Distinct colors for Left, Right, and Middle/Scroll clicks, simultaneous dual-button press support, and optional floating key bubbles.
- **Tactile & Emotional Interactions**: Head-petting with synthesized 24.5 Hz Web Audio purring, rapid-mouse curiosity eyes, sleep/wake-up anger reactions, and optional 3D collar bell & auto-gaming headphones.
- **OS-Level Password Privacy Guard**: Automatically detects Windows and macOS password input fields so the cat gently closes its eyes (BigFish covers its eyes with both hands) while masking keycaps and key bubbles and never transmitting keystroke content.
- **AI Coding Companion Integration**: Live emotional & typing feedback for Claude Code, Codex CLI, Cursor, Windsurf, DeepSeek, and Doubao via \`--hook\`, local HTTP \`/hook\` & \`/agent/event\`, and Streamable HTTP \`/mcp\` — synced to OBS transparent overlays.
- **Built-In MCP Studio (10 Tools)**: Stdio and local Streamable HTTP (\`http://127.0.0.1:27420/mcp\`) server with zero Node.js/Python dependencies required; customize cat fur, 16-spot markings, 7 2D/3D face/ear/jaw contour parameters, and hot-reload in 0.4s.
- **Native OBS Transparent Overlay**: Local \`http://127.0.0.1:27421/obs\` Browser Source with true Alpha transparency (no chroma key), optional OBS-Only mode, and synchronized privacy masking.
- **Desktop Ergonomics**: 20%–150% smooth scaling, persistent click-through lock (\`Alt\` temporary drag), single-instance guard, anti-cheat pause/hide mode, and SHA-256 verified in-app auto-updater.

## Direct Official Downloads (v5.1.2)

- Windows 10/11 (x64 Installer): https://kurocat.org/releases/v5.1.2/KuroCat-5.1.2-x64-setup.exe
- Windows 7 SP1 (x64 Portable w/ WebView2 109): https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-win7-x64-portable.zip
- macOS 10.15+ Universal (Apple Silicon & Intel DMG): https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-macos-universal.dmg
- macOS Homebrew Cask: \`brew install --cask qianyiai/tap/kurocat\`
- Linux x86_64 \`.deb\`: https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-linux-amd64.deb
- Linux ARM64 \`.deb\`: https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-linux-arm64.deb
- Linux x86_64 \`.AppImage\`: https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-linux-amd64.AppImage
- Linux ARM64 \`.AppImage\`: https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-linux-arm64.AppImage
- Android APK: https://kurocat.org/releases/v5.1.2/KuroCat-v5.1.2-android.apk
- GitHub Releases (all platforms): https://github.com/qianyiai/kurocat/releases

## Localized Demo Media

- 3D Sleep → Wake-Up → Head-Pat Purr (9s MP4):
  - ZH: https://kurocat.org/media/wake-pet-9s.mp4
  - EN: https://kurocat.org/media/wake-pet-9s-en.mp4
  - JA: https://kurocat.org/media/wake-pet-9s-ja.mp4
  - KO: https://kurocat.org/media/wake-pet-9s-ko.mp4
- BigFish Whale-Girl Demo (14s 1080×1920 60fps MP4):
  - ZH: https://kurocat.org/media/whale-douyin-14s.mp4
  - EN: https://kurocat.org/media/whale-douyin-14s-en.mp4
  - JA: https://kurocat.org/media/whale-douyin-14s-ja.mp4
  - KO: https://kurocat.org/media/whale-douyin-14s-ko.mp4
`;
fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFullTxt, 'utf8');

// IndexNow key file
fs.writeFileSync(path.join(distDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, 'utf8');

console.log('[postbuild-kurocat-seo] Generated /en/, /ja/, /ko/, robots.txt, sitemap.xml, llms.txt, llms-full.txt & IndexNow key.');

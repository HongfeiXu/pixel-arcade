# 构建与部署

## 部署目标

GitHub Pages（免费、自带 HTTPS、支持自定义域名）。

## 构建命令

```bash
npm run build
```

Vite 会将构建产物输出到 `dist/` 目录。

## GitHub Actions 自动部署

在仓库中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

## GitHub Pages 设置

1. 仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 推送到 main 后自动构建部署

## Vite base 路径

如果仓库名不是 `<username>.github.io`，GitHub Pages 会部署到子路径下。需要在 `vite.config.ts` 中设置：

```typescript
export default defineConfig({
  base: '/<repo-name>/',
  // ...
});
```

> 如果使用自定义域名则 base 设为 `/`。
>
> **注意**：修改 base 路径后，PWA 的 `manifest.start_url`、`manifest.scope` 和 Workbox 的 `navigateFallback` 也需要同步调整，详见 [PWA 配置](pwa.md#pwa-与-base-路径)。

## 发布流程

```
本地开发 → git push main → Actions 自动构建 → GitHub Pages 更新
```

推送后约 1-2 分钟完成部署。可在仓库 Actions 标签页查看构建状态。

## 版本管理

建议使用语义化版本（但不强制），在 package.json 中维护版本号。
重大更新（如新增游戏）时打 Git Tag：

```bash
git tag v1.1.0 -m "feat: 添加贪吃蛇游戏"
git push origin v1.1.0
```

# MybcyQzqxw.github.io

基于 [Hexo](https://hexo.io/) + [Kratos-Rebirth](https://github.com/Candinya/Kratos-Rebirth) 主题搭建的个人博客,通过 GitHub Pages 自动发布。

线上访问地址:**https://mybcyqzqxw.github.io**

## 技术栈

- [Hexo](https://hexo.io/) 8.x 静态博客框架
- [Kratos-Rebirth](https://github.com/Candinya/Kratos-Rebirth) 主题(以 git submodule 引入 `themes/kratos-rebirth`)
- [pnpm](https://pnpm.io/) 作为包管理器
- GitHub Actions + GitHub Pages 自动构建部署

## 本地开发

### 环境要求

- Node.js >= 18
- pnpm

### 初始化

```bash
# 克隆仓库(包含主题子模块)
git clone --recurse-submodules https://github.com/MybcyQzqxw/MybcyQzqxw.github.io.git
cd MybcyQzqxw.github.io

# 安装站点依赖
pnpm install

# 安装并构建主题
cd themes/kratos-rebirth
pnpm install
pnpm run build
cd ../..
```

> 如果克隆时忘了加 `--recurse-submodules`,可以之后执行 `git submodule update --init --recursive` 补齐主题子模块。

### 常用命令

```bash
pnpm run server   # 本地预览,默认 http://localhost:4000
pnpm run build    # 生成静态文件到 public/
pnpm run clean    # 清理缓存与生成文件
```

### 写文章

```bash
npx hexo new post "文章标题"
```

新文章会创建在 `source/_posts/` 目录下,使用 Markdown 编写。

## 部署到 GitHub Pages

仓库已内置 GitHub Actions 工作流 [.github/workflows/deploy.yml](.github/workflows/deploy.yml):每次 push 到 `main` 分支时,会自动安装依赖、构建主题、生成站点并发布到 GitHub Pages。

首次启用时,需要在仓库的 **Settings → Pages** 中,将 **Source** 设置为 **GitHub Actions**(只需设置一次)。之后每次 push 到 `main` 都会自动触发构建与发布,几分钟后即可通过 https://mybcyqzqxw.github.io 访问最新内容。

## 目录结构

```
source/_posts/      # 博客文章(Markdown)
themes/kratos-rebirth/  # 主题(git submodule)
_config.yml          # Hexo 站点配置
_config.kratos-rebirth.yml  # 主题配置
public/              # 构建产物(已在 .gitignore 中忽略,无需提交)
```

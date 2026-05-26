# SetupAxios — Webpack 打包构建

## 文档元信息

- **文档版本**: v1.1
- **日期**: 2026-05-26
- **状态**: 最新版本
- **作者**: xcb

---

## 1. 角色 & 背景

> 你是一位注重代码质量的前端专家，你的特点是:
>
> 1. 写代码前先思考架构和可扩展性
> 2. 坚持"一次编写，处处测试"的原则
> 3. 对代码重复有"过敏反应"，善于抽象通用逻辑
> 4. 性能优化是你的本能，你会自动分析每个变更的性能影响
> 5. 你写的代码两个月后自己还能轻松看懂并修改，别的成员也能够快速看懂上手

### 1.1 项目背景

SetupAxios 是 TypeScript 编写的异步请求库，定位为 Axios 的替代方案。源码（commonRequest、apiRequest、jsonRequest、tools/、platform/）已基本开发完成，但当前项目缺失打包构建能力：

- `package.json` 中无任何 Webpack 相关依赖
- 无 `build` 脚本，无法生成可分发的 bundle 文件
- 无 `.d.ts` 类型声明文件生成机制，TypeScript 用户无法获得类型提示
- `"type": "module"` 为临时设置，最终需支持多格式输出

本次需求聚焦于为项目建立完整的 Webpack 5 打包流程，使其具备发布到 npm 的基础能力。

### 1.2 目标用户

- **npm 包消费者（ESM）**：使用 `import` 语法的现代前端项目
- **npm 包消费者（CJS）**：使用 `require` 语法的 Node.js 项目或旧构建工具
- **CDN 使用者（UMD）**：通过 `<script>` 标签直接引入的浏览器用户
- **TypeScript 用户**：需要 `.d.ts` 类型声明获得 IDE 自动补全和类型检查

### 1.3 使用场景

| 场景 | 描述 |
|------|------|
| npm 安装使用 | `pnpm add setup-axios` 后 `import { setupAxios } from 'setup-axios'` |
| CDN 引入 | `<script src="setup-axios.umd.js"></script>` 后通过 `window.SetupAxios` 访问 |
| TypeScript 项目 | 导入后获得完整的类型提示和编译检查 |
| 旧项目兼容 | CJS 格式供 Webpack 4 / Node.js 等 `require` 场景使用 |

---

## 2. 任务

### 2.1 核心功能

1. **Webpack 5 配置**：单一 `webpack.config.cjs`，输出 ESM 格式
2. **TypeScript 编译**：babel-loader + `@babel/preset-typescript` 编译 TS 源码，单一 `.babelrc` 配置文件
3. **类型检查**：fork-ts-checker-webpack-plugin 在打包过程中进行类型校验
4. **类型声明生成**：`tsc --emitDeclarationOnly` 单独步骤生成 `.d.ts`
5. **Source Map**：生成 `.map` 文件，便于调试时定位源码
6. **构建脚本**：`pnpm run build` 执行完整构建（打包 + 类型声明）

### 2.2 输出结构

```
dist/
├── index.js              # ESM 格式
├── index.js.map          # ESM source map
├── index.d.ts            # 类型声明入口
├── apiRequest.d.ts       # 各模块类型声明
├── commonRequest.d.ts
├── jsonRequest.d.ts
├── platform/             # 平台适配器类型声明
├── tools/                # 工具类型声明
└── utils/                # 工具函数类型声明
```

### 2.3 用户故事

- 作为库使用者，我想要通过 `npm install` 后直接 `import` 使用，以便在现代前端项目中集成
- 作为 TypeScript 用户，我想要获得 `.d.ts` 类型声明，以便 IDE 能自动补全和类型检查
- 作为库开发者，我想要运行 `pnpm run build` 一键完成打包，以便发布新版本

### 2.4 功能优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0（必须有） | ESM 格式输出 | 现代前端项目的主要使用方式 |
| P0（必须有） | TypeScript 源码编译 | 核心能力，否则无法输出 JS |
| P0（必须有） | `pnpm run build` 命令 | 统一构建入口 |
| P0（必须有） | `.d.ts` 类型声明生成 | TypeScript 用户的核心诉求 |
| P1（应该有） | Source Map 生成 | 调试体验 |
| P2（可以有） | fork-ts-checker-webpack-plugin | 类型检查可与 tsc 步骤合并 |

---

## 3. 约束

### 3.1 技术约束

| 项 | 选择 | 说明 |
|----|------|------|
| 打包工具 | Webpack 5 | PRD v1.0 已确定 |
| TS 编译 | babel-loader + @babel/preset-typescript | 速度快，生态成熟 |
| 类型检查 | fork-ts-checker-webpack-plugin | 独立进程，不阻塞打包 |
| .d.ts 生成 | tsc --emitDeclarationOnly | 与打包分离，可靠稳定 |
| 输出格式 | ESM | 项目氛围定义 |
| 目标环境 | ES6+ / modern browsers | 不含 IE11 |
| Source Map | 生成 .map 文件 | 调试需求 |
| 输出目录 | dist/ | 标准约定 |
| 包管理器 | pnpm | 项目已指定 |

### 3.2 业务约束

- 库体积（minified + gzipped）核心部分 < 10KB（PRD v1.0 要求）
- 构建时间 < 10 秒（常规开发机）
- 对外不引入运行时依赖，Webpack/babel 相关均为 devDependencies

### 3.3 设计约束

- `webpack.config.cjs` 使用 CJS 语法（.cjs 扩展名强制 CommonJS）
- `.babelrc` 配置简洁，仅包含 `@babel/preset-typescript`
- `package.json` 中：
  - `"type": "module"` 标记为 ESM 包
  - `"main"` 指向 ESM 输出 `dist/index.js`
  - `"types"` 指向 `.d.ts` 入口
- 构建前自动清理 `dist/` 目录（使用 Webpack 5 内置 `output.clean: true`）

---

## 4. 验收期望

### 4.1 功能验收标准

- [ ] 运行 `pnpm run build` 后 `dist/` 目录生成以下文件：
  - `index.js` + `index.js.map`
  - `index.d.ts` + 各模块 `.d.ts`
- [ ] ESM 输出使用 `import/export` 语法，可在现代浏览器或 ESM 环境运行
- [ ] `.d.ts` 文件包含核心类型的完整声明（commonRequest、apiRequest、jsonRequest、工具类型）
- [ ] `package.json` 的 `main`、`types` 字段指向正确的输出文件
- [ ] 构建过程无 TypeScript 类型错误

### 4.2 非功能验收标准

- [ ] 构建时间 < 10 秒
- [ ] 打包后核心部分体积 < 10KB（gzipped）
- [ ] 打包包含 tree-shaking 支持（ESM 输出 side-effect free）
- [ ] `dist/` 目录加入 `.gitignore`（构建产物不入库）

### 4.3 边界情况

- 源码中存在 TypeScript 类型错误时，构建应失败并给出清晰报错
- tools/ 目录下的装饰器文件即使未被 index.ts 直接导入，也应正确打包（依赖图完整）
- platform/ 下的多平台适配器应全部打包（用户可能按需引用）

---

## 5. 附录

### 5.1 涉及文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `webpack.config.cjs` | Webpack 打包配置（CJS 扩展名） |
| 新增 | `.babelrc` | Babel 配置 |
| 新增 | `tsconfig.json` | TypeScript 编译配置（至少含 emitDeclarationOnly） |
| 修改 | `package.json` | 新增 build 脚本、新增 devDependencies、修正 main/module/types 字段 |
| 修改 | `.gitignore` | 添加 dist/ |

### 5.2 devDependencies 清单

```
webpack                # ^5.x
webpack-cli            # ^5.x
babel-loader           # ^9.x
@babel/core            # ^7.x
@babel/preset-typescript # ^7.x
fork-ts-checker-webpack-plugin # ^9.x
typescript             # ^5.x
```

### 5.3 变更记录

| 版本 | 日期 | 变更人 | 变更说明 |
|------|------|--------|----------|
| v1.1 | 2026-05-26 | xcb | 简化为仅输出 ESM 格式；webpack 配置重命名为 .cjs |
| v1.0 | 2026-05-26 | xcb | 初始版本 |

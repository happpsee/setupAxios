# SetupAxios — npm 发布

## 文档元信息

- **文档版本**: v1.0
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

SetupAxios 的核心功能（commonRequest、apiRequest、jsonRequest、tools/、platform/）已开发完成，Webpack 打包流程已就绪（见 [Webpack打包_v1.1.md](Webpack打包_v1.1.md)），可通过 `pnpm run build` 生成 ESM 格式的 `dist/` 产物。当前缺失的是将打包产物发布到 npm registry 的流程，外部开发者无法通过 `npm install` 使用该库。

### 1.2 目标用户

- **npm 包消费者（ESM）**：使用 `import` 语法的现代前端项目
- **TypeScript 用户**：需要 `.d.ts` 类型声明获得 IDE 自动补全和类型检查
- **开源社区开发者**：希望通过 npm 发现并试用 SetupAxios

### 1.3 使用场景

| 场景 | 描述 |
|------|------|
| npm 安装使用 | `pnpm add setup-axios` 后 `import { setupAxios } from 'setup-axios'` |
| TypeScript 项目 | 导入后获得完整的类型提示和编译检查 |
| 版本更新 | 库发布新版本后，用户通过 `pnpm update` 升级 |

---

## 2. 任务

### 2.1 核心功能

1. **npm 账号登录**：在本地终端通过 `npm login` 登录 npmjs.org 账号，完成身份认证
2. **Registry 配置**：发布时将 registry 指向 `https://registry.npmjs.org/`（源站），当前本地 registry 为 npmmirror 镜像，仅可用于安装不可用于发布
3. **prepublishOnly 脚本**：在 `package.json` 中添加 `prepublishOnly` 脚本，确保每次发布前自动执行构建
4. **npm publish**：执行 `npm publish`（或 `pnpm publish`），将 `dist/` 产物发布到 npm
5. **发布验证**：通过 `npm pack --dry-run` 预览发布内容，在临时目录验证安装和导入

### 2.2 用户故事

- 作为开源使用者，我想要通过 `pnpm add setup-axios` 安装库，以便在项目中使用 SetupAxios 的请求能力
- 作为 TypeScript 开发者，我想要导入后获得完整的类型提示，以便提升开发效率
- 作为库维护者，我想要一键执行 `npm publish` 完成发布，以便高效迭代新版本

### 2.3 功能优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0（必须有） | npm 账号登录 | 发布的前提条件 |
| P0（必须有） | Registry 指向 npmjs.org | 源站是唯一可 publish 的 registry |
| P0（必须有） | npm publish 执行 | 核心目标 |
| P0（必须有） | 发布验证 | 确保发布有效 |
| P1（应该有） | prepublishOnly 脚本 | 防止忘记构建就发布 |
| P2（可以有） | package.json 补充 repository/homepage 字段 | 提升 npm 页面信息完整度 |

---

## 3. 约束

### 3.1 技术约束

| 项 | 选择 | 说明 |
|----|------|------|
| 发布目标 | registry.npmjs.org | 官方源，全球可访问 |
| 包名 | `setup-axios` | 公开包，非 scoped |
| 输出格式 | ESM | 与项目氛围定义一致 |
| 发布内容 | 仅 `dist/` 目录 | 通过 `files: ["dist"]` 控制 |
| 包管理器 | pnpm | 项目已指定 |
| 发布前构建 | `pnpm run build` | 确保 dist/ 为最新 |

### 3.2 业务约束

- 包名 `setup-axios` 在 npm 上当前可用（未被占用）
- 发布者需具备 npmjs.org 账号（用户已确认拥有账号）
- 首次发布版本为 `1.0.0`

### 3.3 设计约束

- `package.json` 的 `"private"` 字段不得设为 `true`
- 不在 package.json 中硬编码 registry（由用户本地 `.npmrc` 或命令行参数控制）
- `.gitignore` 保持 `dist/` 忽略（构建产物不入 git，但 npm publish 通过 `files` 字段包含）

---

## 4. 验收期望

### 4.1 功能验收标准

- [ ] `npm login --registry https://registry.npmjs.org/` 登录成功
- [ ] `pnpm run build` 正常生成 `dist/` 产物
- [ ] `npm pack --dry-run` 预览内容仅包含 `dist/` 目录下的文件
- [ ] `npm publish --registry https://registry.npmjs.org/` 发布成功
- [ ] 在临时目录执行 `npm install setup-axios` 后，`node -e "import('setup-axios')"` 可正常导入
- [ ] TypeScript 项目中 `import { setupAxios } from 'setup-axios'` 获得类型提示

### 4.2 非功能验收标准

- [ ] 发布包体积与 `dist/` 一致（无额外文件打入）
- [ ] `package.json` 中 `main`、`types`、`files` 字段指向正确

### 4.3 边界情况

- 包名 `setup-axios` 在发布瞬间被他人抢占：发布失败，需更换包名
- 未登录状态执行 publish：npm 提示 `ENEEDAUTH`，需先 `npm login`
- registry 指向镜像时 publish：返回权限错误，需指定 `--registry https://registry.npmjs.org/`
- 网络问题导致 publish 超时：重试或检查网络
- 登录凭证过期：重新 `npm login`

---

## 5. 附录

### 5.1 参考文档

- [CLAUDE.md](../CLAUDE.md) — 项目氛围定义与架构说明
- [PRD/SetupAxios_v1.0.md](SetupAxios_v1.0.md) — 项目核心功能需求
- [PRD/Webpack打包_v1.1.md](Webpack打包_v1.1.md) — 打包构建需求
- [npm Docs — Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)

### 5.2 涉及文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 可能修改 | `package.json` | 新增 `prepublishOnly` 脚本，补充 `repository`/`homepage` 等字段 |

### 5.3 变更记录

| 版本 | 日期 | 变更人 | 变更说明 |
|------|------|--------|----------|
| v1.0 | 2026-05-26 | xcb | 初始版本 |

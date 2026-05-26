# Bug修复 — 代码审查问题修复

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

SetupAxios 首版代码已完成基础架构搭建（commonRequest 裸请求、apiRequest 链式装饰器、jsonRequest 声明式配置、tools 装饰器系统、platform 平台适配器）。经代码审查发现，当前代码存在 6 个严重 Bug（功能直接失效）、3 个设计问题、4 个小问题。这些 Bug 导致核心功能无法正常工作，需要在首版发布前修复。

问题主要集中在下述几类：

- 逻辑条件写反（Bug 1：`isTempory` 判断反了）
- 参数顺序/数量错误（Bug 2：`new URL` 顺序反了、Bug 4：`addTool` 缺参数）
- 工厂函数未调用就存入（Bug 3：`Log` 没有被 `()` 调用）
- 对象生命周期管理错误（Bug 5：`CombinateManage` 每次请求都重建）
- 遗漏必要字段（Bug 6：`method` 没写进 `requestInit`）

这些属于"能通过类型检查但运行结果不符合预期"的问题，需要通过运行时测试验证修复效果。

### 1.2 目标用户

- Web 前端开发者：使用 commonRequest / apiRequest / jsonRequest 进行 HTTP 请求
- uni-app 开发者：使用跨平台统一请求方案
- SetupAxios 库的维护者和贡献者

### 1.3 使用场景

- 开发者为单个请求配置局部拦截器，期望临时拦截器在请求后自动清除、全局拦截器持续生效
- 开发者使用 `baseUrl + 相对路径` 拼接完整请求 URL
- 开发者使用 `.use(Log())` 链式调用，期望请求前后打印日志
- 开发者通过 `addDecorateTool(name, tool)` 注册自定义装饰器，期望在后续请求中生效
- 开发者发送 POST/PUT/DELETE 请求，期望 method 正确传递
- 开发者配置请求超时，期望超时后请求被取消且收到异常通知
- 开发者同时创建多个 API 实例，期望各实例的装饰器管理互不干扰

---

## 2. 任务

### 2.1 核心功能

#### P0 — 严重 Bug 修复（6 项）

1. **Bug 1：修复 `isTempory` 判断逻辑** — `commonRequest.ts` 中 `addReqInterceptor` / `addResInterceptor` 的 `isTempory` 条件判断写反，导致全局拦截器单次请求后被清除，临时拦截器反而永久保留。修复：`!isTempory` → `isTempory`，同时将 `isTempory` 重命名为 `isTemporary`

2. **Bug 2：修复 `new URL()` 参数顺序** — `utils/urlParse.ts` 中 `new URL(config.baseUrl, config.url)` 参数顺序反了，当 `baseUrl` 为绝对路径时路径全部丢失。修复：`new URL(config.url, config.baseUrl)`

3. **Bug 3：修复 Log 工厂函数未调用** — `tools/log.ts` 导出的是工厂函数 `Log`，`tools/index.ts` 把工厂本身（而非调用结果）存入 `toolMap`，导致日志永远不打印。修复：存入 `Log()` 调用结果

4. **Bug 4：修复 `addTool` 缺少 `toolName` 参数** — `apiRequest.ts` 中 `addDecorateTool` 和 `jsonRequest.ts` 中 `addCombinateTool` 调用 `addTool` 时只传了一个参数（缺少 `toolName`），工具实际未被注册。修复：补齐 `toolName` 参数，`removeTool` 同理

5. **Bug 5：修复 `CombinateManage` 每次请求都重建** — `jsonRequest.ts` 中 `useApi` 每次调用都执行 `CombinateManage(commonRequest)`，重新创建 `toolManageFactory()`，导致用户通过 `addCombinateTool` 添加的工具全部丢失。修复：在 `setupJsonAxios` 中初始化一次，缓存结果供后续请求复用

6. **Bug 6：修复 `requestInit` 未设置 `method`** — `platform/web.ts` 中 `request` 函数未将 `cfg.method` 写入 `requestInit`，导致 POST/PUT/DELETE 请求全部以 GET 发出。修复：添加 `method: cfg.method`

#### P1 — 设计问题修复（3 项）

7. **问题 7：重写 timeout 实现** — `tools/timeout.ts` 当前实现仅给 `result` 赋值 rejected Promise 对象（不会让调用方感知异常），且无法真正取消已发出的请求。修复：引入 `AbortController`，超时后调用 `controller.abort()`，将 `signal` 注入请求参数，确保 fetch 感知取消信号，调用方收到 `AbortError` 异常

8. **问题 8：修复配置合并优先级** — `platform/web.ts` 中全局配置覆盖局部配置（`{ ...reqCfg, ...config }`），与常规设计惯例相反。修复：合并顺序改为 `{ ...config, ...reqCfg }`，局部配置优先级高于全局配置

9. **问题 9：修复多实例变量覆盖** — `apiRequest.ts` / `jsonRequest.ts` 中 `addTool` / `removeTool` 以模块级变量持有，多个 `setupApiAxios` / `setupJsonAxios` 实例会互相覆盖。修复：变量改为实例闭包内持有

#### P2 — 小问题修复（4 项）

10. **变量遮蔽** — `commonRequest.ts` 中函数内部 `const config = reqInterceptor.reduce(...)` 遮蔽外层参数 `config`，改为 `interceptedConfig`

11. **未使用泛型** — `tools/errReport.ts` 中 `<T extends any>` 未被使用，删除

12. **`registerAdaptor` 未导出** — `platform/index.ts` 中 `registerAdaptor` 未从入口文件导出，补齐导出

13. **`isTempory` 拼写修正** — 全局统一改为 `isTemporary`（与 Bug 1 修复同步完成）

### 2.2 用户故事

- 作为前端开发者，我想要**为单个请求设置局部拦截器**，以便该拦截器在请求完成后自动清除，不影响后续请求
- 作为前端开发者，我想要**使用 baseUrl 配置拼接请求路径**，以便切换环境时只需修改 baseUrl
- 作为前端开发者，我想要**使用 Log() 装饰器在请求前后输出日志**，以便调试时追踪请求链路
- 作为前端开发者，我想要**通过 addDecorateTool 注册自定义装饰器**，以便扩展请求处理能力
- 作为前端开发者，我想要**发送 POST/PUT/DELETE 请求时 method 正确传递**，以便后端能正确处理不同类型的请求
- 作为前端开发者，我想要**设置请求超时后请求被真正取消且收到异常**，以便及时感知超时并做相应处理
- 作为前端开发者，我想要**局部配置优先级高于全局配置**，以便针对特定请求做差异化设置
- 作为前端开发者，我想要**创建多个 API 实例且各实例独立管理装饰器**，以便不同模块有不同的请求策略

### 2.3 功能优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0（必须有） | Bug 1：`isTempory` 判断逻辑修复 | 拦截器核心机制，行为完全相反 |
| P0（必须有） | Bug 2：`new URL()` 参数顺序修复 | 导致路径丢失，请求发到错误地址 |
| P0（必须有） | Bug 3：Log 工厂函数调用修复 | 日志装饰器完全无效 |
| P0（必须有） | Bug 4：`addTool` 参数补齐 | 工具注册功能完全无效 |
| P0（必须有） | Bug 5：`CombinateManage` 实例持久化 | 声明式请求的工具管理完全无效 |
| P0（必须有） | Bug 6：`method` 字段补齐 | 非 GET 请求全部错误 |
| P1（应该有） | 问题 7：timeout 重写 | 超时功能目前形同虚设 |
| P1（应该有） | 问题 8：配置合并优先级 | 常规设计惯例，影响使用体验 |
| P1（应该有） | 问题 9：多实例隔离 | 多实例场景下行为异常 |
| P2（可以有） | 变量遮蔽修复 | 代码可读性 |
| P2（可以有） | 未使用泛型删除 | 代码整洁 |
| P2（可以有） | `registerAdaptor` 导出 | 扩展性 |
| P2（可以有） | `isTempory` 拼写修正 | API 命名规范 |

---

## 3. 约束

### 3.1 技术约束

- **语言**：TypeScript
- **打包工具**：Webpack
- **包管理器**：pnpm
- **不引入新依赖**：`AbortController` 为浏览器原生 API，无需额外包
- **文件范围**：仅修改现有文件，不新增模块文件

### 3.2 架构约束

- 保持现有目录结构和模块分层
- 装饰器类型（`ToolInstanceType`）和执行模型（洋葱模型）不变
- `isTempory` → `isTemporary` 需通过别名导出保持向后兼容

### 3.3 测试约束

- 测试代码需覆盖每个 Bug 的核心场景
- 每个测试用例遵循：修复前失败（证明 Bug 存在）→ 修复后通过（证明 Bug 已修复）
- 测试需覆盖多实例隔离等边界场景

---

## 4. 验收期望

### 4.1 功能验收标准

**P0 — 严重 Bug：**

- [ ] **Bug 1**：调用 `addReqInterceptor(fn, true)` 添加临时拦截器，单次请求后拦截器自动清除；调用 `addReqInterceptor(fn)` 添加全局拦截器，多次请求后拦截器仍保留
- [ ] **Bug 2**：传入 `baseUrl: "https://api.example.com"` 和 `url: "/users/1"`，最终请求 URL 为 `https://api.example.com/users/1`
- [ ] **Bug 3**：调用 `.use(Log())` 后发送请求，控制台在请求前后分别输出日志
- [ ] **Bug 4**：调用 `addDecorateTool("myTool", myTool)` 后再发送请求，自定义工具被正确注册并执行
- [ ] **Bug 5**：调用 `addCombinateTool("log", Log())` 后多次调用 `useApi`，每次请求都附带 log 装饰器
- [ ] **Bug 6**：发送 POST 请求，浏览器 Network 面板显示 method 为 POST（非 GET）

**P1 — 设计问题：**

- [ ] **问题 7**：设置超时 1ms 发送慢请求，调用方收到 `AbortError` 异常，且定时器被正确清除
- [ ] **问题 8**：全局配置 `timeout: 5000`，局部请求配置 `timeout: 1000`，最终生效的是 `1000`
- [ ] **问题 9**：创建两个 `setupApiAxios` 实例，为实例 A 注册 toolA，实例 B 注册 toolB，各自的工具互不干扰

**P2 — 小问题：**

- [ ] **变量遮蔽**：`commonRequest.ts` 中不再存在变量名遮蔽问题
- [ ] **未使用泛型**：`errReport.ts` 中不再包含未使用的泛型参数
- [ ] **`registerAdaptor` 导出**：用户可通过 `import { registerAdaptor } from "setup-axios"` 使用
- [ ] **拼写修正**：`isTempory` 全局替换为 `isTemporary`，旧名称 `isTempory` 通过别名保持兼容

### 4.2 测试验收标准

每个 Bug 至少对应一个测试用例，验证修复前后的行为变化：

| 测试编号 | 对应 Bug | 测试内容 | 验证方式 |
|----------|---------|----------|----------|
| 测试 1 | Bug 1 | 局部拦截器单次请求后自动清除，全局拦截器持久保留 | 多次调用同一请求，检查拦截器是否在适当时候清除 |
| 测试 2 | Bug 2 | `baseUrl` + 相对路径正确拼接为完整 URL | 检查最终 `Request` 对象的 URL |
| 测试 3 | Bug 3 | Log 装饰器在请求前后输出日志 | 劫持 `console.log`，验证调用次数和内容 |
| 测试 4 | Bug 4 | `addDecorateTool` / `removeDecorateTool` 正确注册和移除工具 | 注册后发请求验证工具执行，移除后验证工具不执行 |
| 测试 5 | Bug 5 | 多次 `useApi` 调用共享同一 toolMap | 先注册工具再多次调用 `useApi`，验证工具始终生效 |
| 测试 6 | Bug 6 | POST/PUT/DELETE 请求正确携带 method | 检查 `Request` 对象的 `method` 属性 |
| 测试 7 | 问题 7 | 超时后请求被取消，调用方收到异常 | 模拟慢请求，验证 `AbortController.abort()` 被调用且异常被抛出 |
| 测试 8 | 问题 8 | 局部配置优先于全局配置 | 设置不同的全局和局部值，验证局部值生效 |
| 测试 9 | 问题 9 | 多实例装饰器管理互不干扰 | 创建两个实例分别注册不同工具，验证隔离性 |

### 4.3 边界情况

- 请求被超时取消后，装饰器的 `after` 切面仍正常执行（用于资源清理）
- 临时拦截器在请求过程中抛出异常时，不影响该请求后续拦截器和后续请求
- 多实例场景下，销毁一个实例不影响其他实例的拦截器和工具管理
- `isTempory` 别名在新旧 API 中均可正常使用

---

## 5. 附录

### 5.1 参考文档

- [代码审查报告](../代码审查报告.md) — 本次修复的完整 Bug 清单和分析
- [SetupAxios v1.0 PRD](./SetupAxios_v1.0.md) — 项目首版需求文档
- [CLAUDE.md](../CLAUDE.md) — 项目氛围定义与架构说明

### 5.2 变更记录

| 版本 | 日期 | 变更人 | 变更说明 |
|------|------|--------|----------|
| v1.0 | 2026-05-26 |  | 初始版本，基于代码审查报告梳理全部 Bug 修复需求 |

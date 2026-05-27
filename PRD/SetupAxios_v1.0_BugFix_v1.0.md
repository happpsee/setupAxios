# SetupAxios v1.0 Bug 修复

## 文档元信息

- **文档版本**: v1.0
- **日期**: 2026-05-27
- **状态**: 待开发
- **作者**: (package.json author 为空)

---

## 1. 角色 & 背景

### 1.1 项目背景

SetupAxios 首次代码审查发现 15 个逻辑 bug，其中 3 个致命 bug 导致核心功能完全不可用：局部拦截器语义反转、装饰器工具全部不工作、平台适配器注册机制失效。必须在 v1.0 发布前修复。

### 1.2 目标用户

使用 SetupAxios 的前端开发者，通过 `setupAxios` / `setupApiAxios` / `setupJsonAxios` 三个入口使用该库。

### 1.3 使用场景

开发者调用 `.addReqInterceptor(fn, isTempory)` 配置局部拦截器、通过 `.use()` 链式附加装饰器、通过 `registerAdaptor` 注册自定义平台适配器时，期望这些功能按文档行为工作。

---

## 2. 任务

### 2.1 核心功能

修复以下 bug，按优先级分 P0-P3：

**P0（致命 — 核心功能报废）**
1. `isTempory` 布尔逻辑反转 — `!isTempory` 改为 `isTempory`
2. 装饰器工具调用链断裂 — toolMap 存储工厂调用结果或工具直接改为 ToolInstanceType
3. `registerAdaptor` 注册的适配器永不被使用 — switch 改为 adaptors 映射表查询

**P1（严重 — 功能错误）**
4. URL 构造函数参数颠倒 — 交换 `config.baseUrl` 和 `config.url` 顺序
5. 模块级 `addTool`/`removeTool` 单例泄漏 — 创建独立全局 toolManageFactory 实例
6. `cancel: Boolean` → `boolean`

**P2（中等 — 边界缺陷）**
7. `addDecorateTool(fn)` 参数传递缺失 — 修正为双参数调用
8. `timeoutTool` falsy 判断不可靠 — 用哨兵值替代 falsy 检查
9. `writeBodyData` 静默丢弃非 JSON body — 添加 warning 或支持更多 Content-Type
10. config merge 顺序反了 — `{...config, ...reqCfg}`
11. 重复 `new Request()` — 移除冗余包装

**P3（低 — 代码质量）**
12. `isTempory` → `isTemporary` 拼写修正（公开 API，需谨慎处理兼容）
13. 15+ 处 `any` 替换为具体类型
14. `useApi` 每次创建新 factory → 复用同一 toolMap

### 2.2 用户故事

- 作为 开发者，我想要 添加 `isTempory=true` 的局部拦截器后它仅在单次请求生效，以便 不需要手动清理临时拦截器
- 作为 开发者，我想要 `.use('log')` / `.use('timeout')` 链式附加的装饰器真正执行，以便 获得日志和超时能力
- 作为 开发者，我想要 `registerAdaptor('wx', myAdaptor)` 注册的适配器被实际调用，以便 扩展到微信小程序平台

### 2.3 功能优先级

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 3 个 | 核心功能报废，必须最先修复 |
| P1 | 3 个 | 功能错误，用户直接可感知 |
| P2 | 5 个 | 边界缺陷，特定场景触发 |
| P3 | 3 个 | 代码质量，不影响功能但影响可维护性 |

---

## 3. 约束

### 3.1 技术约束

- TypeScript，不改变现有三层架构（commonRequest → 装饰器层 → tools/platform）
- P0/P1 修复不改变公开 API 签名（参数名、函数签名保持兼容）
- `isTempory` → `isTemporary` 拼写修正需要评估是否做向后兼容别名

### 3.2 业务约束

- 该项目尚未发布，API 可以 breaking change
- 修复完成后需在 `PRD/` 下将本文档状态更新为"最新版本"
- 文档状态规则：首次创建为"待开发"→ 代码完成后改为"最新版本"→ 再次修改改为"待更新"并递增版本号，文件名同步更新

### 3.3 设计约束

- 遵循项目 CLAUDE.md 中定义的架构分层和洋葱模型约定
- 装饰器统一遵循 `ToolInstanceType` 类型
- 平台适配器通过 `registerAdaptor` 扩展，`adaptors` 映射表为唯一真相来源

---

## 4. 验收期望

### 4.1 功能验收标准

- [ ] `addReqInterceptor(fn, true)` 添加的拦截器在单次请求后自动清除；`addReqInterceptor(fn, false)` 添加的拦截器持久保留
- [ ] 使用 `apiRequest.use('log')` 或 JSON Schema 配置 `{ log: true }` 后，请求实际输出 console.log
- [ ] 使用 `apiRequest.use('timeout', '3000')` 后，超过 3 秒未完成的请求自动取消
- [ ] `registerAdaptor('wx', mockAdaptor)` 注册自定义适配器后，`setupAxios({ platform: 'wx' })` 实际调用该适配器
- [ ] `setupAxios({ baseUrl: 'http://api.com', url: '/users' })` 发起请求到 `http://api.com/users`
- [ ] 多实例场景下，每个 `setupApiAxios` 实例的装饰器工具互不干扰

### 4.2 非功能验收标准

- [ ] 修复后 `tsc --noEmit` 零错误
- [ ] 编译产物 `pnpm run build` 成功
- [ ] 所有修复不引入新的 any 类型

### 4.3 边界情况

- 未注册的平台类型调用时回退到 webAdaptor 并给出 warning
- 同步 throw 的工具异常应被捕获而不是中断整个工具链
- `timeoutTool` 中 result 为 `0` / `false` / `""` 时不被超时覆盖
- `writeBodyData` 中 data 存在但 Content-Type 缺失时输出 warning

---

## 5. 附录

### 5.1 参考文档

- 项目 CLAUDE.md（架构分层、洋葱模型、装饰器注册中心说明）
- `PRD/SetupAxios_v1.0.md`（原始产品需求）

### 5.2 变更记录

| 版本 | 日期 | 变更人 | 变更说明 |
|------|------|--------|----------|
| v1.0 | 2026-05-27 | PM Agent | 初始版本 — 首次代码审查 bug 汇总 |

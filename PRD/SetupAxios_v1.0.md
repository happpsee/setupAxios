# SetupAxios — 异步请求库

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

Axios 作为主流的 HTTP 请求库存在两个核心不足：

- **拦截器只能全局配置**，无法针对单个请求独立设置拦截逻辑
- **功能过于单一**，仅提供裸请求能力，缺乏围绕请求生命周期的扩展功能（如超时处理、日志记录、错误上报等）

SetupAxios 的目标是为 Ajax 框架提供一个新的可能：在裸请求（commonRequest）之上，通过**装饰器工具系统**动态附加功能，实现从请求前、请求中到请求后一条龙的处理能力。同时提供 JSON Schema 声明式配置，降低使用门槛。

### 1.2 目标用户

- **Web 前端开发者**：习惯 Axios 用法，需要更灵活的拦截器和装饰器能力
- **uni-app 开发者**：需要跨平台（H5 + 小程序）统一的请求方案
- 所有基于 JavaScript 语法的前端平台开发者

### 1.3 使用场景

| 场景 | 描述 |
|------|------|
| 单请求局部拦截 | 某个接口需要单独的超时时间、日志格式，不影响全局配置 |
| 声明式 API 配置 | 通过 JSON Schema 定义接口，自动挂载对应的装饰器工具 |
| 链式装饰器组合 | 通过 `.use()` 链式调用动态组合多个装饰器（日志 + 超时 + 错误上报） |
| 跨平台请求 | 同一套 API 在浏览器和 uni-app 小程序中运行，仅切换平台适配器 |
| 自定义扩展 | 用户编写符合规范的装饰器或平台适配器，通过注册函数接入系统 |

---

## 2. 任务

### 2.1 核心功能

1. **commonRequest（裸请求）**：基于 Fetch/XHR 的基础请求单元，支持 GET/POST/PUT/DELETE，内置请求拦截器和响应拦截器，通过 `isTempory` 参数区分全局拦截器和局部拦截器
2. **apiRequest（链式装饰器请求）**：通过 `@DecorateManage()` 类装饰器 + `.use()` 链式调用，实现装饰器的**局部化**附加，每个请求独立控制装饰器组合
3. **jsonRequest（JSON Schema 请求）**：声明式 API 配置，JSON 字段名与 toolMap 中注册的装饰器键名自动匹配，运行时动态附加对应装饰器
4. **tools（装饰器工具系统）**：基于 `toolManageFactory` 的装饰器注册中心，所有装饰器遵循统一的 `ToolInstanceType` 类型（工厂函数模式），内置 log / timeout / errReport 三个装饰器
5. **platform（平台适配器）**：工厂函数模式的平台适配层，通过 `registerAdaptor` 扩展，首期支持 web（浏览器 Fetch）和 uni（uni-app）

### 2.2 用户故事

- 作为前端开发者，我想要**为单个请求独立设置超时和日志**，以便不同接口有不同的处理策略，而不影响全局配置
- 作为 uni-app 开发者，我想要**一套 API 代码在 H5 和小程序端通用**，以便减少平台差异带来的维护成本
- 作为团队技术负责人，我想要**通过 JSON 配置文件声明所有接口**，以便团队成员无需关心底层装饰器的实现细节
- 作为开源使用者，我想要**编写自定义装饰器并注册到系统中**，以便扩展库的能力满足业务需求

### 2.3 功能优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0（必须有） | commonRequest 基础请求 + 拦截器 | 库的基石，所有上层功能依赖 |
| P0（必须有） | tools 装饰器系统 + toolManageFactory | 装饰器注册、执行的核心机制 |
| P0（必须有） | web 平台适配器 | 浏览器是最大用户群体 |
| P1（应该有） | apiRequest 链式 `.use()` 调用 | 局部化装饰器的核心体验 |
| P1（应该有） | jsonRequest 声明式配置 | 降低使用门槛的关键功能 |
| P1（应该有） | 内置 log / timeout / errReport | 开箱即用的装饰器 |
| P1（应该有） | uni 平台适配器 | uni-app 用户的核心诉求 |
| P2（可以有） | 用户自定义装饰器注册（addTool） | 扩展性保障 |
| P2（可以有） | 用户自定义平台适配器（registerAdaptor） | 扩展性保障 |
| P2（可以有） | Node.js 平台适配器 | SSR / 服务端场景 |

---

## 3. 约束

### 3.1 技术约束

- **语言**：TypeScript
- **打包工具**：Webpack
- **输出格式**：ESM
- **包管理器**：pnpm

### 3.2 架构约束

- **装饰器类型规范**：所有装饰器必须是工厂函数，返回符合 `ToolInstanceType` 类型的函数，接收 `DecorateInstanceType` 或 `CombinateInstanceType` 参数
- **平台适配器规范**：所有适配器必须是工厂函数（接收 `DftBaseCfg`），返回符合 `CommonRequest` 类型的实际请求函数
- **装饰器执行顺序**：按 `toolMap` 中注册的顺序执行，采用洋葱模型（请求前 → 原始方法 → 请求后 `after` 切面）
- **目录结构**：保持现有约定，不可随意变更

```
SetupAxios/
├── index.ts              # 入口文件
├── commonRequest.ts      # 裸请求
├── jsonRequest.ts        # JSON Schema 请求
├── apiRequest.ts         # 链式装饰器请求
├── package.json
├── utils/                # 工具函数
├── types/                # TypeScript 类型声明
├── platform/             # 平台适配器
│   ├── index.ts          # 适配器管理器
│   ├── web.ts            # 浏览器适配器
│   └── uni.ts            # uni-app 适配器（待开发）
└── tools/                # 请求装饰器
    ├── index.ts          # 装饰器管理器（toolManageFactory）
    ├── errReport.ts      # 错误上报装饰器
    ├── log.ts            # 日志装饰器
    └── timeout.ts        # 超时装饰器
```

### 3.3 设计约束

- API 风格向 Axios 靠拢，降低现有 Axios 用户的迁移成本
- 装饰器命名与 JSON Schema 字段名一致，确保声明式配置直观可用
- 优先保证 tree-shaking 友好，避免打入未使用的代码

---

## 4. 验收期望

### 4.1 功能验收标准

- [ ] commonRequest 支持 GET / POST / PUT / DELETE 四种 HTTP 方法
- [ ] commonRequest 支持通过 `isTempory` 参数添加全局拦截器和局部拦截器，局部拦截器在单次请求后自动清除
- [ ] apiRequest 支持 `.use(Log()).use(Timeout(3000)).use(ErrReport())` 链式调用，装饰器按 toolMap 顺序执行（洋葱模型）
- [ ] jsonRequest 读取 JSON Schema 配置后，自动将自定义字段匹配 toolMap 中的装饰器并附加到请求
- [ ] web 平台适配器基于 Fetch API 正常发送请求并正确解析 JSON 响应
- [ ] uni 平台适配器在 uni-app 环境下正常发送请求
- [ ] 内置 log 装饰器在请求前后输出日志
- [ ] 内置 timeout 装饰器在超时后抛出错误
- [ ] 内置 errReport 装饰器捕获请求异常并执行上报逻辑
- [ ] 用户可通过 `addTool(name, factory)` 注册自定义装饰器，通过 `removeTool(name)` 移除
- [ ] 用户可通过 `registerAdaptor(name, adaptor)` 注册自定义平台适配器
- [ ] 打包输出 ESM 格式

### 4.2 非功能验收标准

- [ ] 核心模块（commonRequest / tools）具备完整的 TypeScript 类型推断
- [ ] 库体积（minified + gzipped）核心部分 < 10KB
- [ ] 边界情况：请求失败时装饰器的 `after` 切面仍能正常执行（如错误上报）
- [ ] 边界情况：未配置对应装饰器时，JSON Schema 的额外字段不影响请求正常发出

### 4.3 边界情况

- JSON Schema 中引用了未注册的装饰器字段名时，忽略该字段而非报错
- 请求被取消时（`cancel: true`），原始方法不执行，但 `after` 队列仍需执行（用于清理资源）
- 局部拦截器在 onFulfilled / onRejected 中抛出异常时，不应影响后续请求的拦截器链

---

## 5. 附录

### 5.1 参考文档

- [CLAUDE.md](../CLAUDE.md) — 项目氛围定义与架构说明
- [Axios](https://axios-http.com/) — 参考 API 风格

### 5.2 变更记录

| 版本 | 日期 | 变更人 | 变更说明 |
|------|------|--------|----------|
| v1.0 | 2026-05-26 | Xcb | 初始版本，基于 CLAUDE.md 整理 |

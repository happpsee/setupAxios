# 项目名称: SetupAxios

## 产品愿景

SetupAxios 是一个基于原生 JS/TS 的异步请求库，定位类似 Axios，但解决其两个核心不足：

- **拦截器只能全局配置** → 提供 `isTempory` 参数实现**请求级局部拦截器**，单次请求后自动清除
- **仅有裸请求能力** → 在裸请求之上提供**装饰器工具系统**，以洋葱模型动态附加超时、日志、错误上报等功能

核心差异化价值：通过工厂模式 + 装饰器注册中心（`toolManageFactory`），让用户可以链式组合装饰器（`.use()`）、声明式配置（JSON Schema）、或自行扩展装饰器和平台适配器。

## 目标用户

- Web 前端开发者（习惯 Axios，需要更灵活的拦截器）
- uni-app 开发者（跨 H5 + 小程序统一请求方案）
- 所有 JS 运行时平台的前端开发者

## 架构分层

```
┌─────────────────────────────────┐
│         apiRequest.ts           │  ← 类装饰器 + .use() 链式调用（局部装饰器）
│        jsonRequest.ts           │  ← JSON Schema 声明式配置
├─────────────────────────────────┤
│       commonRequest.ts          │  ← 裸请求 + 请求/响应拦截器（全局 & 局部）
├─────────────────────────────────┤
│  tools/          platform/      │  ← 装饰器工厂 & 平台适配器（可扩展）
└─────────────────────────────────┘
```

### 核心机制

- **局部拦截器**：`addReqInterceptor(fn, isTempory)` / `addResInterceptor(fn, isTempory)`，`isTempory=false` 时拦截器仅在本次请求生效
- **装饰器注册中心**：`toolManageFactory()` 创建 Map 存储，通过 `addTool`/`removeTool` 管理，所有装饰器遵循 `ToolInstanceType` 统一类型（工厂函数返回装饰器函数）
- **执行模型**：洋葱模型，按 `toolMap` 注册顺序执行 → 原始方法 → `after` 切面队列（即使取消也执行 after 用于清理）

## 功能清单

| 模块 | 文件 | 说明 |
|------|------|------|
| 裸请求 | `commonRequest.ts` | GET/POST/PUT/DELETE，请求/响应拦截器，`isTempory` 区分全局/局部 |
| 链式装饰器请求 | `apiRequest.ts` | `@DecorateManage()` 类装饰器，`addDecorateTool` 全局注册 |
| JSON Schema 请求 | `jsonRequest.ts` | `CombinateManage` 包装，字段名匹配 toolMap 键名自动附加装饰器 |
| 装饰器系统 | `tools/index.ts` | `toolManageFactory`，统一 `ToolInstanceType` 类型 |
| 内置装饰器 | `tools/log.ts`, `timeout.ts`, `errReport.ts` | 日志、超时、错误上报 |
| 平台适配器 | `platform/web.ts` | Fetch 适配器（首期），通过 `registerAdaptor` 扩展 |
| 入口 | `index.ts` | 导出 `setupAxios` / `setupApiAxios` / `setupJsonAxios` |

## 约束

### 技术栈
- TypeScript
- Webpack（打包输出 ESM + CJS + UMD）
- pnpm

### 目录结构
```
SetupAxios/
├── index.ts              # 入口
├── commonRequest.ts      # 裸请求
├── apiRequest.ts         # 链式装饰器请求
├── jsonRequest.ts        # JSON Schema 请求
├── package.json
├── utils/                # 工具函数
├── types/                # TypeScript 类型声明
├── platform/             # 平台适配器
│   ├── index.ts          # 适配器管理器 + registerAdaptor
│   └── web.ts            # 浏览器适配器
├── tools/                # 请求装饰器
│   ├── index.ts          # toolManageFactory + addTool/removeTool
│   ├── log.ts            # 日志装饰器
│   ├── timeout.ts        # 超时装饰器
│   └── errReport.ts      # 错误上报装饰器
└── PRD/                  # 需求文档
    └── SetupAxios_v1.0.md
```

### 核心约束 (必须遵守!!!)
1. 进行任何操作前，遵循 `karpathy-guidelines` skill 作为行为标准
2. 详细需求以 `PRD/SetupAxios_v1.0.md` 为准，CLAUDE.md 为精简版项目氛围定义

## 打包方式
- `pnpm run build`


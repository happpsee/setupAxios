# 🚀 SetupAxios

<p align="center">
  <img src="https://img.shields.io/npm/v/setup-axios" alt="npm version">
  <img src="https://img.shields.io/npm/l/setup-axios" alt="license">
  <img src="https://img.shields.io/bundlejs/size/setup-axios" alt="bundle size">
</p>

<p align="center"><b>基于 TypeScript 的异步请求库，比 Axios 多走一步。</b></p>

---

## ✨ 为什么选 SetupAxios？

Axios 很棒，但有两个痛点一直没解决：

| 😢 Axios 的问题 | 🎯 SetupAxios 的方案 |
|---|---|
| 拦截器只能**全局配置**，单个接口想加特殊处理要 hack | `isTempory: true` —— **请求级局部拦截器**，用完自动清除 |
| 只有裸请求能力，超时 / 日志 / 错误上报得自己写 | **装饰器工具系统** —— 洋葱模型动态附加，开箱即用 |

---

## 📦 安装

```bash
pnpm add setup-axios    # pnpm 🎯
npm install setup-axios  # npm
yarn add setup-axios     # yarn
```

---

## ⚡ 快速开始

### 🟢 场景一：裸请求 + 局部拦截器

```ts
import { setupAxios } from 'setup-axios'

const { commonRequest, addReqInterceptor, addResInterceptor } = setupAxios({
  baseUrl: 'https://api.example.com',
  headers: { 'Content-Type': 'application/json' }
})

// 🔥 局部拦截器：仅本次请求生效，自动清除
addReqInterceptor((ctx) => {
  ctx.config.headers!['X-Trace-Id'] = crypto.randomUUID()
  return ctx
}, true)

const { data } = await commonRequest<{ name: string }>({ url: '/user/info' })
console.log(data.name)
```

### 🔵 场景二：装饰器链式调用

```ts
import { setupApiAxios } from 'setup-axios'

const api = new setupApiAxios({
  baseUrl: 'https://api.example.com'
})

// 🧩 按需注册装饰器，按 toolMap 顺序执行（洋葱模型）
api.addDecorateTool('log', Log())
api.addDecorateTool('timeout', Timeout(3000))

// GET / POST / PUT / DELETE 全支持
const user = await api.get<{ name: string }>('/user/info')
const result = await api.post<{ id: string }>('/user/create', { name: 'Alice' })
```

### 🟡 场景三：JSON Schema 声明式

```ts
import { setupJsonAxios } from 'setup-axios'

const { useApi } = setupJsonAxios({
  jsonAxios: {
    getUser: { url: '/user/info', method: 'GET' },       // ← 声明式定义
    createUser: { url: '/user/create', method: 'POST' }
  },
  config: { baseUrl: 'https://api.example.com' }
})

// 🎯 按名称调用，无需关心底层装饰器
const user = await useApi('getUser')
await useApi('createUser', { name: 'Alice', age: 25 })
```

---

## 📖 API 概览

### 🏗️ 核心函数

| 导出 | 说明 |
|---|---|
| `setupAxios(config, platform?)` | 🌱 裸请求 + 全局/局部拦截器 |
| `setupApiAxios` | 🧩 类实例，支持注册装饰器工具 |
| `setupJsonAxios({ jsonAxios, config })` | 📋 JSON Schema 声明式请求 |
| `registerAdaptor(name, adaptor)` | 🔌 注册自定义平台适配器 |

### 🛠️ 内置装饰器

| 装饰器 | 功能 |
|---|---|
| 🪵 `Log()` | 请求前后输出时间戳日志 |
| ⏱️ `Timeout(ms)` | 超时自动 Abort，`after` 清理定时器 |
| 📡 `ErrReport(callback)` | 请求完成后执行上报回调 |

### 🔌 内置平台适配器

| 适配器 | 说明 |
|---|---|
| 🌐 `web`（默认） | 浏览器 Fetch API |
| 📱 `uni` | uni-app 跨平台适配器 |

---

## 📝 许可证

[ISC](./LICENSE)

---

<p align="center"><sub>Made with ❤️ by xcb</sub></p>

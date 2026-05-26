# 项目名称: SetupAxios

## 产品愿景
 为ajax框架提供一个新的可能, 定位类似axios, 是一个基于原生js的异步请求库,具备平台适配器和装饰器两大功能

## 功能(精简版)
- 基于json Schema配置的请求(也就是jsonRequest)
- 基于ts装饰器的链式请求(也就是apiRequest.ts)
- 也可以使用最基本的请求方式(也就是commonRequest.ts), 具备基本请求能力同时也有请求和响应拦截器两种, 基本请求方式称为裸请求
- 在commonRequest的基础上封装apiRequest和jsonRequest, 为用户提供具有装饰模式的强大工具
- 装饰工具(tools目录下), 为上层请求提供统一的装饰器工具，装饰工具编写具有统一的格式类型
- 为外提供自定义装饰工具和平台适配器的功能


## 约束
  ### 技术栈
   - TypeScript
   - Webpack
  ### 目录结构
    SetupAxios/
    |--- index.ts # 入口文件
    |--- commonRequest.ts # 普通请求(裸请求)文件
    |--- jsonRequest.ts # 基于Json配置的请求方式，具备能够被装饰的功能
    |--- apiRequest.ts # 在普通请求上具有链式请求的方式，具备能够被装饰的功能
    |--- package.json 
    |--- utils/ # 项目使用到的工具函数所处的目录
    |--- types/ # 项目使用的TypeScript的类型的声明
    |--- platform/ # 平台适配器功能目录 
      |--- index.ts # 平台适配器管理工具，可以允许自定义平台适配器
      |--- ... # 其它所有ts，一个文件代码一个平台的适配器
    |--- tools/  # 请求装饰器功能目录
      |--- index.ts 装饰器管理工具，可以允许自定义装饰器
      |--- errReport.ts # 错误上报装饰器
      |--- log.ts # 日志装饰器
      |--- timeout.ts # 超时报错装饰器
    |--- PRD/ #需求文档
   ### 项目核心约束 (必须要遵守!!!)
     在进行任何操作前，都应该遵守karpathy-guidelines这个skill, 并且作为标准执行

## 打包方式
  - pnpm run build打包

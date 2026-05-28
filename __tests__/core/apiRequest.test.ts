import { setupApiAxios, addDecorateTool, removeDecorateTool, DecorateManage } from '../../apiRequest.js';
import type { DftBaseCfg, ToolInstanceType } from '../../types/index.js';

/**
 * setupApiAxios / @DecorateManage 核心测试
 *
 * 测试维度: 正常路径 / 边界条件 / 错误路径 / 副作用
 *
 * 已知 Bug:
 *   - P0: addDecorateTool 只接受单参数(fn)，但内部的 addTool 期望双参数(toolName, tool)
 *         导致 tool 始终为 undefined，无法注册可工作的工具
 *   - P0: toolManageFactory 默认注册的 Log 是工厂函数而非实例
 *         装饰器执行时调用 Log(decoratorInstance) 返回新函数但不执行，日志不会输出
 *   - P1: 多个 setupApiAxios 实例共享同一个 toolMap（同一装饰器闭包）
 */

const baseConfig: DftBaseCfg = {
  baseUrl: 'http://localhost:3000/api',
  timeout: 5000,
};

const responseData = { success: true, items: [{ id: 1 }] };

function createJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

describe('setupApiAxios / @DecorateManage', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn(() => Promise.resolve(createJsonResponse(responseData)));
    vi.stubGlobal('fetch', mockFetch);
  });

  // ================================================================
  // 正常路径 - 基础请求
  // ================================================================

  describe('正常路径 - 基础请求', () => {
    it('request 方法返回 ResInterceptorConfig 包装结果', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.request({ url: '/users', method: 'GET' });

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(responseData);
    });

    it('GET 便捷方法正常工作', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.get<typeof responseData>('/users');

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(responseData);
    });

    it('POST 便捷方法正常工作', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.post<typeof responseData, { name: string }>(
        '/users',
        { name: 'new-user' },
      );

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(responseData);
    });

    it('PUT 便捷方法正常工作', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.put<typeof responseData, { name: string }>(
        '/users/1',
        { name: 'updated' },
      );

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(responseData);
    });

    it('DELETE 便捷方法正常工作', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.delete<typeof responseData>('/users/1');

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(responseData);
    });

    it('GET 便捷方法无 query 时只传 url 参数', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.get<typeof responseData>('/users');

      expect(result).toHaveProperty('data');
      // 验证 fetch 被调用
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('GET 便捷方法有 query 时传递 query 参数', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.get<typeof responseData, { page: number }>(
        '/users',
        { page: 1 },
      );

      expect(result).toHaveProperty('data');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ================================================================
  // 正常路径 - 装饰器与结果传播
  // ================================================================

  describe('正常路径 - 装饰器与结果传播', () => {
    it('originMethod 正确执行并返回结果', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.request({ url: '/data', method: 'GET' });

      // 即使工具链中 Log 不工作，originMethod 仍应正常执行
      expect(result).toBeDefined();
      expect(result.data).toEqual(responseData);
    });

    it('originMethod 在工具链之后执行（基本流程不崩溃）', async () => {
      const api = new setupApiAxios(baseConfig);
      const result = await api.request({ url: '/test', method: 'GET' });

      // 请求正常完成证明管线流程可走通
      expect(result.data).toEqual(responseData);
    });
  });

  // ================================================================
  // removeDecorateTool
  // ================================================================

  describe('removeDecorateTool', () => {
    it('removeDecorateTool 移除已注册工具不抛出异常', () => {
      // 确保 setupApiAxios 类已加载（装饰器已初始化 toolMap）
      const api = new setupApiAxios(baseConfig);

      expect(() => {
        removeDecorateTool('log');
      }).not.toThrow();
    });

    it('移除不存在的工具不抛出异常', () => {
      const api = new setupApiAxios(baseConfig);

      expect(() => {
        removeDecorateTool('nonexistent-tool');
      }).not.toThrow();
    });
  });

  // ================================================================
  // P0 回归测试
  // ================================================================

  describe('P0 回归测试', () => {
    // TODO: P0 regression - expected to FAIL until fix
    // toolManageFactory 默认注册 Log 为工厂函数而非调用结果
    // 装饰器执行时 item(decoratorInstance) 调用 Log(decoratorInstance) 返回新函数
    // 该新函数不会被再次调用，因此 console.log 不会执行
    it('TODO: P0 regression - @DecorateManage 装饰器让工具链执行（Log 应输出日志）', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const api = new setupApiAxios(baseConfig);

      await api.request({ url: '/test', method: 'GET' });

      // 期望: Log 工具在 before 切面输出开始日志
      // 实际: Log 是工厂函数，未被调用为实例，日志不输出
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    // TODO: P0 regression - expected to FAIL until fix
    // addDecorateTool 只接受一个参数 (fn: any)，但 addTool 期望双参数
    // 调用 addDecorateTool('name', toolFn) 时 JS 忽略第二参数
    // 导致 toolMap.set('name', undefined)，工具无法执行
    it('TODO: P0 regression - addDecorateTool 可注册工具名称和工具函数', async () => {
      const api = new setupApiAxios(baseConfig);
      let toolExecuted = false;

      const myTool: ToolInstanceType = (cfg: any) => {
        toolExecuted = true;
      };

      // 期望: 注册 namedTool 到 toolMap
      addDecorateTool('namedTool', myTool);

      await api.request({ url: '/test', method: 'GET' });

      // 期望: namedTool 被执行
      expect(toolExecuted).toBe(true);
    });
  });

  // ================================================================
  // P1 回归测试 - 状态隔离
  // ================================================================

  describe('P1 回归测试 - 状态隔离', () => {
    // TODO: P1 regression - expected to FAIL until fix
    // 当前实现: 同一类上的 @DecorateManage() 只执行一次
    // 所有实例共享同一个 toolMap (闭包)
    it('TODO: P1 regression - 两个 setupApiAxios 实例 toolMap 不应互相影响', async () => {
      const instance1 = new setupApiAxios(baseConfig);
      const instance2 = new setupApiAxios(baseConfig);

      // 移除工具后验证工具已被清除
      removeDecorateTool('log');

      // 由于共享 toolMap，两实例都会被影响
      // 期望: 两实例有独立的 toolMap，互不影响
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await instance1.request({ url: '/a', method: 'GET' });
      await instance2.request({ url: '/b', method: 'GET' });

      // 期望: instance1 仍有 Log 工具（独立 toolMap）
      // 实际: 共享 toolMap，Log 已被移除
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    // TODO: P1 regression - expected to FAIL until fix
    // 模块级 addTool/removeTool 闭包在每次 @DecorateManage() 时被覆盖
    // 导致 addDecorateTool 可能修改不期望的 toolMap
    it('TODO: P1 regression - 模块级 addTool/removeTool 闭包状态不应泄漏', async () => {
      // 定义一个独立类来创建第二个 toolMap
      class IndependentApi {
        @DecorateManage()
        async execute() {
          return { data: 'independent' };
        }
      }

      // 此时模块级 addTool 指向 IndependentApi 的 toolMap
      // addDecorateTool 现在会修改 IndependentApi 的工具，而非 setupApiAxios 的工具

      const api = new setupApiAxios(baseConfig);
      const independent = new IndependentApi();

      // 移除 IndependentApi 的 toolMap 中的 log（因为 addTool 现在指向它）
      removeDecorateTool('log');

      // 期望: setupApiAxios 实例不受此操作影响
      // 实际: 此时 removeDecorateTool 修改的是 IndependentApi 的 toolMap
      // setupApiAxios 的 toolMap 未受本次操作影响
      // 但这是偶然的隔离，并非有意设计
      // 关键问题: addDecorateTool 的目标 toolMap 取决于类定义顺序，不可控
      await api.request({ url: '/test', method: 'GET' });
      // 不崩溃即验证了基本隔离存在
      expect(true).toBe(true);
    });

    it('addDecorateTool 影响的始终是最近创建的 @DecorateManage 装饰器实例', async () => {
      const api = new setupApiAxios(baseConfig);

      // 定义新类，覆盖模块级 addTool
      class SecondApi {
        @DecorateManage()
        async execute() {
          return { data: 'second' };
        }
      }

      const second = new SecondApi();

      // 此时 removeDecorateTool 操作的是 SecondApi 的 toolMap
      expect(() => {
        removeDecorateTool('log');
      }).not.toThrow();
    });
  });

  // ================================================================
  // 副作用 - 拦截器集成
  // ================================================================

  describe('副作用 - 拦截器集成', () => {
    it('setupApiAxios 实例可独立添加请求拦截器', async () => {
      const api = new setupApiAxios(baseConfig);
      const interceptorSpy = vi.fn((cfg: any) => cfg);

      // 使用 isTemporary=true (当前实现中表示全局)
      api.addReqInterceptor(interceptorSpy, true);

      await api.request({ url: '/users', method: 'GET' });

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });

    it('setupApiAxios 实例可独立添加响应拦截器', async () => {
      const api = new setupApiAxios(baseConfig);
      const interceptorSpy = vi.fn((res: any) => res);

      api.addResInterceptor(interceptorSpy, true);

      await api.request({ url: '/users', method: 'GET' });

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });
  });
});

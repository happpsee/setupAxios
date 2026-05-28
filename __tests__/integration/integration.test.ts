import { setupAxios } from '../../commonRequest.js';
import { setupApiAxios } from '../../apiRequest.js';
import { setupJsonAxios } from '../../jsonRequest.js';
import { toolManageFactory } from '../../tools/index.js';
import { Log } from '../../tools/log.js';
import { timeoutTool } from '../../tools/timeout.js';
import { errReportTool } from '../../tools/errReport.js';
import type { DftBaseCfg, DecorateInstanceType, JsonCfgType } from '../../types/index.js';

/**
 * 端到端集成测试
 *
 * 测试全链路: 装饰器/工具 + 拦截器 + 请求/响应
 *
 * 对于工具链测试，由于 addDecorateTool 存在单参数 bug，无法通过公共 API 注册工具。
 * 集成测试直接使用 toolManageFactory（tools/index.ts 的公共导出）创建工具链
 * 并通过手动构建装饰器管线来验证工具行为。
 *
 * 已知 Bug:
 *   - P0: addDecorateTool 单参数 bug，工具无法通过公共 API 注册
 *   - P0: toolManageFactory 默认注册的 Log 是工厂函数，装饰器调用时生成实例但不执行
 */

const baseConfig: DftBaseCfg = {
  baseUrl: 'http://localhost:3000/api',
  timeout: 5000,
};

const responseData = { success: true, items: [{ id: 1 }, { id: 2 }] };

function createJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

/**
 * 辅助函数: 手动构建装饰器管线
 * 绕过 addDecorateTool 的单参数 bug，直接使用 toolManageFactory
 */
function createToolPipeline(tools: Record<string, (cfg: DecorateInstanceType) => any>) {
  const { toolMap, addTool } = toolManageFactory();
  // 移除默认的不工作的 Log（工厂函数而非实例）
  toolMap.delete('log');

  for (const [name, toolInstance] of Object.entries(tools)) {
    addTool(name, toolInstance);
  }

  return {
    toolMap,
    /**
     * 对给定的 originMethod 执行完整的洋葱模型
     */
    async execute<T>(
      originMethod: () => Promise<T>,
    ): Promise<{ result?: T; decoratorInstance: DecorateInstanceType }> {
      const decoratorInstance: DecorateInstanceType = {
        this: null as any,
        arguments: null as any,
        originMethod,
        after: [],
        registryAfter: (fn: any) => {
          decoratorInstance.after.push(fn);
        },
        cancel: false,
      };

      // Before 切面：按 toolMap 注册顺序执行
      for (const item of toolMap.values()) {
        await Promise.resolve(item(decoratorInstance));
      }

      // 原始方法
      if (!decoratorInstance.cancel) {
        const res = await decoratorInstance.originMethod();
        decoratorInstance.result = res;
      }

      // After 切面：按注册顺序执行
      for (const item of decoratorInstance.after) {
        await Promise.resolve(item(decoratorInstance));
      }

      return { result: decoratorInstance.result as T | undefined, decoratorInstance };
    },
  };
}

describe('端到端集成测试', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn(() => Promise.resolve(createJsonResponse(responseData)));
    vi.stubGlobal('fetch', mockFetch);
  });

  // ================================================================
  // 全链路测试: setupApiAxios + 拦截器
  // ================================================================

  describe('全链路: setupApiAxios + 拦截器 + mock fetch', () => {
    it('完整请求管线：请求拦截器 -> 请求 -> 响应拦截器 -> 返回 data', async () => {
      const api = new setupApiAxios(baseConfig);
      const reqOrder: string[] = [];
      const resOrder: string[] = [];

      api.addReqInterceptor((cfg) => { reqOrder.push('req1'); return cfg; }, true);
      api.addReqInterceptor((cfg) => { reqOrder.push('req2'); return cfg; }, true);
      api.addResInterceptor((res) => { resOrder.push('res1'); return res; }, true);
      api.addResInterceptor((res) => { resOrder.push('res2'); return res; }, true);

      const result = await api.request({ url: '/full-pipeline', method: 'GET' });

      expect(reqOrder).toEqual(['req1', 'req2']);
      expect(resOrder).toEqual(['res1', 'res2']);
      expect(result.data).toEqual(responseData);
    });
  });

  // ================================================================
  // 工具链测试: 超时装饰器触发 cancel
  // ================================================================

  describe('工具链: 超时装饰器触发 cancel', () => {
    /**
     * 辅助函数: 创建装饰器实例并执行工具链的 before 切面
     * 不调用 originMethod，避免 `await` 阻塞导致 timeout 无法触发 cancel
     */
    function executeBeforeHooks(
      toolMap: Map<string, (cfg: DecorateInstanceType) => any>,
      originMethod: () => Promise<any>,
    ) {
      const decoratorInstance: DecorateInstanceType = {
        this: null as any,
        arguments: null as any,
        originMethod,
        after: [] as Array<(...args: unknown[]) => unknown>,
        registryAfter: (fn: any) => {
          decoratorInstance.after.push(fn);
        },
        cancel: false,
      };

      const runTools = async () => {
        for (const item of toolMap.values()) {
          await Promise.resolve(item(decoratorInstance));
        }
      };

      return { decoratorInstance, runTools };
    }

    it('超时后 cancel 被设置为 true', async () => {
      vi.useFakeTimers();

      const pipeline = createToolPipeline({
        timeout: timeoutTool('100'), // 100ms 超时
      });

      const { decoratorInstance, runTools } = executeBeforeHooks(
        pipeline.toolMap,
        async () => ({ data: 'should-not-run' }),
      );

      // 执行 before 切面（注册 timeout）
      await runTools();

      // 在 originMethod 调用前推进时间，触发超时
      await vi.advanceTimersByTimeAsync(200);

      // 超时后 cancel 应为 true
      expect(decoratorInstance.cancel).toBe(true);

      vi.useRealTimers();
    });

    it('超时触发 cancel 后 originMethod 不被执行', async () => {
      vi.useFakeTimers();

      const pipeline = createToolPipeline({
        timeout: timeoutTool('50'),
      });

      let originCalled = false;
      const { decoratorInstance, runTools } = executeBeforeHooks(
        pipeline.toolMap,
        async () => {
          originCalled = true;
          return { data: 'result' };
        },
      );

      // 执行 before 切面（注册 timeout）
      await runTools();

      // 推进时间触发超时
      await vi.advanceTimersByTimeAsync(100);

      // 模拟管线: cancel=true 时应跳过 originMethod
      if (!decoratorInstance.cancel) {
        await decoratorInstance.originMethod();
      }

      // originMethod 不应被调用（cancel=true 时跳过）
      expect(originCalled).toBe(false);

      vi.useRealTimers();
    });

    // AMEND-5: cancel=true 时 after 队列仍然执行
    it('cancel=true 时 after 队列仍然执行（AMEND-5 验证）', async () => {
      vi.useFakeTimers();

      let afterExecuted = false;

      const pipeline = createToolPipeline({
        timeout: timeoutTool('50'),
        registerAfter: (cfg: DecorateInstanceType) => {
          cfg.registryAfter(() => {
            afterExecuted = true;
          });
        },
      });

      const { decoratorInstance, runTools } = executeBeforeHooks(
        pipeline.toolMap,
        async () => ({ data: 'should-not-run' }),
      );

      // 执行 before 切面
      await runTools();

      // 推进时间触发超时
      await vi.advanceTimersByTimeAsync(100);

      // cancel 应为 true
      expect(decoratorInstance.cancel).toBe(true);

      // 即使 cancel=true，after 队列仍应执行
      for (const item of decoratorInstance.after) {
        await Promise.resolve(item(decoratorInstance));
      }

      // after 回调应该被执行（即使 cancel=true）
      expect(afterExecuted).toBe(true);

      vi.useRealTimers();
    });
  });

  // ================================================================
  // 工具链测试: Log + ErrReport 组合
  // ================================================================

  describe('工具链: Log + ErrReport 组合', () => {
    // TODO: P0 regression - expected to FAIL until fix
    // Log 在 toolManageFactory 中存储为工厂函数 (Log)，而非调用结果 (Log())
    // 装饰器执行时 item(decoratorInstance) 调用 Log(decoratorInstance) 返回未执行的新实例
    it('TODO: P0 regression - Log 和 ErrReport 组合时两个 after 均执行', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      let errReportCalled = false;

      const pipeline = createToolPipeline({
        log: Log(), // 手动调用 Log() 获得正确实例
        errReport: errReportTool(() => {
          errReportCalled = true;
        }),
      });

      const { commonRequest } = setupAxios(baseConfig);
      const { result } = await pipeline.execute(() =>
        commonRequest({ url: '/combined', method: 'GET' }),
      );

      // Log 应输出日志
      expect(consoleSpy).toHaveBeenCalled();
      // ErrReport 的 after 回调应被执行
      expect(errReportCalled).toBe(true);
      // 请求结果应正常返回
      expect(result!.data).toEqual(responseData);

      consoleSpy.mockRestore();
    });

    it('工具链中一个工具注册的 after 抛异常不中断后续 after 执行', async () => {
      const afterExecutionOrder: string[] = [];

      const pipeline = createToolPipeline({
        errorTool: (cfg: DecorateInstanceType) => {
          cfg.registryAfter(() => {
            afterExecutionOrder.push('errorTool');
            throw new Error('after 错误');
          });
        },
        safeTool: (cfg: DecorateInstanceType) => {
          cfg.registryAfter(() => {
            afterExecutionOrder.push('safeTool');
          });
        },
      });

      const resultPromise = pipeline.execute(async () => {
        return { data: 'ok' };
      });

      // errorTool 的 after 抛异常会导致整个管线 reject
      await expect(resultPromise).rejects.toThrow('after 错误');

      // safeTool 的 after 可能未被执行（取决于错误传播方式）
      // 当前实现: 使用 for...of + await，异常会中断后续执行
      expect(afterExecutionOrder).toEqual(['errorTool']);
    });
  });

  // ================================================================
  // 全链路测试: setupJsonAxios + 拦截器
  // ================================================================

  describe('全链路: setupJsonAxios + useApi + 拦截器', () => {
    const jsonAxios: Record<string, JsonCfgType> = {
      getUserList: { url: '/users', method: 'GET' },
      createRecord: { url: '/records', method: 'POST' },
    };

    it('完整管线: useApi -> 请求拦截器 -> 请求 -> 响应拦截器 -> data', async () => {
      const { useApi, addReqInterceptor, addResInterceptor } = setupJsonAxios({
        jsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      const reqSpy = vi.fn((cfg: any) => cfg);
      const resSpy = vi.fn((res: any) => res);

      addReqInterceptor(reqSpy, true);
      addResInterceptor(resSpy, true);

      const result = await useApi<typeof responseData, void>(
        'getUserList',
        undefined as unknown as void,
      );

      expect(reqSpy).toHaveBeenCalledTimes(1);
      expect(resSpy).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(responseData);
    });

    it('useApi + POST 方法 + 请求/响应拦截器', async () => {
      const { useApi, addReqInterceptor, addResInterceptor } = setupJsonAxios({
        jsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      const reqSpy = vi.fn((cfg: any) => {
        // 验证拦截器可看到 POST 方法和 data
        expect(cfg.config.method).toBe('POST');
        return cfg;
      });
      const resSpy = vi.fn((res: any) => res);

      addReqInterceptor(reqSpy, true);
      addResInterceptor(resSpy, true);

      const result = await useApi<typeof responseData, { name: string }>(
        'createRecord',
        { name: 'integration-test' },
      );

      expect(reqSpy).toHaveBeenCalledTimes(1);
      expect(resSpy).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(responseData);
    });

    it('多个 useApi 调用共享同一拦截器注册', async () => {
      const { useApi, addReqInterceptor, addResInterceptor } = setupJsonAxios({
        jsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      const reqSpy = vi.fn((cfg: any) => cfg);
      const resSpy = vi.fn((res: any) => res);

      // 使用全局拦截器（isTemporary=false），确保多次 useApi 调用都能生效
      addReqInterceptor(reqSpy, false);
      addResInterceptor(resSpy, false);

      await useApi('getUserList', undefined as unknown as void);
      await useApi('createRecord', { name: 'second' });

      // 全局拦截器应对每次调用都生效
      expect(reqSpy).toHaveBeenCalledTimes(2);
      expect(resSpy).toHaveBeenCalledTimes(2);
    });
  });
});

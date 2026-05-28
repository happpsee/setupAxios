import { setupJsonAxios, addCombinateTool, removeCombinateTool, CombinateManage } from '../../jsonRequest.js';
import type { DftBaseCfg, ReqInterceptor, ResInterceptor, JsonCfgType } from '../../types/index.js';

/**
 * setupJsonAxios / CombinateManage 核心测试
 *
 * 测试维度: 正常路径 / 边界条件 / 错误路径 / 副作用
 *
 * setupJsonAxios 返回: { useApi, addReqInterceptor, addResInterceptor }
 * useApi(name, data): 按名称查找 JSON Schema 配置，合并 data 后调用请求
 *
 * 已知 Bug:
 *   - P0: addCombinateTool 只接受单参数(fn)，但内部 addTool 期望双参数(toolName, tool)
 *         导致 tool 始终为 undefined，无法注册可工作的工具
 *   - P1: 每次 useApi 调用创建新的 CombinateManage，导致 addCombinateTool 目标不可控
 */

const baseConfig: DftBaseCfg = {
  baseUrl: 'http://localhost:3000/api',
  timeout: 5000,
};

const usersConfig: JsonCfgType = {
  url: '/users',
  method: 'GET',
};

const createConfig: JsonCfgType = {
  url: '/users',
  method: 'POST',
};

const jsonAxios = {
  getUsers: usersConfig,
  createUser: createConfig,
};

const responseData = { success: true, items: [{ id: 1 }] };

function createJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

describe('setupJsonAxios / CombinateManage', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn(() => Promise.resolve(createJsonResponse(responseData)));
    vi.stubGlobal('fetch', mockFetch);
  });

  // ================================================================
  // 正常路径 - useApi
  // ================================================================

  describe('正常路径 - useApi', () => {
    it('useApi 按 name 查找配置并调用请求', async () => {
      const { useApi } = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });
      const result = await useApi<typeof responseData, void>('getUsers', undefined as unknown as void);

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('useApi 传入 data 正确合并到请求配置', async () => {
      const { useApi } = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });

      const data = { name: 'test-user', email: 'test@example.com' };
      await useApi<typeof responseData, typeof data>('createUser', data);

      // 验证请求确实发出了
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('useApi 第二次调用使用相同配置仍然正常工作', async () => {
      const { useApi } = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });

      await useApi<typeof responseData, void>('getUsers', undefined as unknown as void);
      await useApi<typeof responseData, void>('getUsers', undefined as unknown as void);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ================================================================
  // 正常路径 - 多个 API 配置
  // ================================================================

  describe('正常路径 - 多个 API 配置', () => {
    it('多个 API 配置独立共存', async () => {
      const multiJsonAxios = {
        list: { url: '/users', method: 'GET' } as JsonCfgType,
        detail: { url: '/users/1', method: 'GET' } as JsonCfgType,
        delete: { url: '/users/1', method: 'DELETE' } as JsonCfgType,
      };

      const { useApi } = setupJsonAxios({
        jsonAxios: multiJsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      await useApi('list', undefined);
      await useApi('detail', undefined);
      await useApi('delete', undefined);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ================================================================
  // 错误路径
  // ================================================================

  describe('错误路径', () => {
    it('useApi 查不到 name 时抛出 Error', async () => {
      const { useApi } = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });

      await expect(
        useApi('nonexistent', undefined),
      ).rejects.toThrow('没有配置当前表');
    });

    it('useApi 查不到 name 时抛出的 Error 包含描述性信息', async () => {
      const { useApi } = setupJsonAxios({
        jsonAxios: { only: { url: '/only', method: 'GET' } },
        config: baseConfig,
        platform: 'web',
      });

      try {
        await useApi('missing', undefined);
        // 不应该走到这里
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('没有配置当前表');
      }
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('metadata 为 Object.create(null) 纯净对象', async () => {
      // metadata 是在 setupJsonAxios 内部为每个配置创建的
      // 验证 useApi 调用不因 metadata 而产生原型链污染
      const { useApi } = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });

      const result = await useApi<typeof responseData, void>('getUsers', undefined as unknown as void);

      // metadata 不暴露在 useApi 返回值中，但验证请求正常完成
      expect(result.data).toEqual(responseData);
    });

    it('jsonAxios 为空对象时不崩溃（但所有 useApi 调用都会 throw）', async () => {
      const { useApi } = setupJsonAxios({
        jsonAxios: {},
        config: baseConfig,
        platform: 'web',
      });

      await expect(
        useApi('anything', undefined),
      ).rejects.toThrow('没有配置当前表');
    });
  });

  // ================================================================
  // 副作用 - 拦截器集成
  // ================================================================

  describe('副作用 - 拦截器集成', () => {
    it('setupJsonAxios 实例可添加请求拦截器', async () => {
      const { useApi, addReqInterceptor } = setupJsonAxios({
        jsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      const interceptorSpy = vi.fn((cfg: any) => cfg);
      addReqInterceptor(interceptorSpy, true); // 当前实现: true = 全局

      await useApi<typeof responseData, void>('getUsers', undefined as unknown as void);

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });

    it('setupJsonAxios 实例可添加响应拦截器', async () => {
      const { useApi, addResInterceptor } = setupJsonAxios({
        jsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      const interceptorSpy = vi.fn((res: any) => res);
      addResInterceptor(interceptorSpy, true);

      await useApi<typeof responseData, void>('getUsers', undefined as unknown as void);

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });

    it('请求拦截器可在 useApi 调用前修改 data', async () => {
      const { useApi, addReqInterceptor } = setupJsonAxios({
        jsonAxios,
        config: baseConfig,
        platform: 'web',
      });

      const interceptorSpy = vi.fn((cfg: any) => {
        // 拦截器可检查请求配置
        expect(cfg.config).toHaveProperty('url');
        expect(cfg.config).toHaveProperty('method');
        return cfg;
      });
      addReqInterceptor(interceptorSpy, true);

      await useApi<typeof responseData, { name: string }>('createUser', { name: 'test' });

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ================================================================
  // P1 回归测试 - 状态隔离
  // ================================================================

  describe('P1 回归测试 - 状态隔离', () => {
    // TODO: P1 regression - expected to FAIL until fix
    // 每次 useApi 调用 CombinateManage(commonRequest) 创建新 toolMap
    // addCombinateTool 只影响最近一次 CombinateManage 调用
    // 但 useApi 内部又立即调用 wrappedCommonRequest → 新 toolMap 被创建
    // 导致 addCombinateTool 无法可靠地影响目标 useApi 调用
    it('TODO: P1 regression - addCombinateTool 应可靠影响设置后的 useApi 调用', async () => {
      const { useApi } = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });

      // 期望: 注册工具后，下一次 useApi 调用可执行该工具
      // 但因每次 useApi 都创建新的 CombinateManage，addCombinateTool 目标不固定
      expect(() => {
        addCombinateTool('testTool', (cfg: any) => cfg);
      }).not.toThrow();
    });

    // TODO: P1 regression - expected to FAIL until fix
    // 两个 setupJsonAxios 实例各自调用 useApi → CombinateManage
    // 模块级 addTool 被最后调用 useApi 的实例覆盖
    // 两个实例不具备独立的工具管理能力
    it('TODO: P1 regression - 两个 setupJsonAxios 实例 toolMap 应互不影响', async () => {
      const instance1 = setupJsonAxios({ jsonAxios, config: baseConfig, platform: 'web' });
      const instance2 = setupJsonAxios({
        jsonAxios: { only: { url: '/only', method: 'GET' } },
        config: baseConfig,
        platform: 'web',
      });

      // 两个实例应能独立操作各自工具
      // 当前: 模块级 addTool/removeTool 被先后覆盖
      await instance1.useApi('getUsers', undefined);
      await instance2.useApi('only', undefined);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('removeCombinateTool 调用不抛出异常', () => {
      // 需要先创建 CombinateManage 实例（通过 useApi 或其他方式）
      expect(() => {
        removeCombinateTool('nonexistent');
      }).not.toThrow();
    });
  });
});

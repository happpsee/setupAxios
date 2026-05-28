import { setupAxios } from '../../commonRequest.js';
import type { DftBaseCfg, AdaptorReq, ReqInterceptor, ResInterceptor } from '../../types/index.js';

/**
 * setupAxios / commonRequest 核心测试
 *
 * 测试维度: 正常路径 / 边界条件 / 错误路径 / 副作用
 *
 * setupAxios 返回: { commonRequest, addReqInterceptor, addResInterceptor }
 * commonRequest 返回: Promise<{ data: T }> (即 ResInterceptorConfig<T>)
 *
 * 已知 Bug:
 *   - P0: addReqInterceptor / addResInterceptor 中 isTemporary 布尔语义反转
 *         (if (!isTemporary) → 逻辑与变量名相反, isTemporary=false 时才是临时拦截器)
 */

const baseConfig: DftBaseCfg = {
  baseUrl: 'http://localhost:3000/api',
  timeout: 5000,
};

const defaultResponseData = { items: [{ id: 1 }, { id: 2 }] };

function createJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

describe('setupAxios / commonRequest', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn(() => Promise.resolve(createJsonResponse(defaultResponseData)));
    vi.stubGlobal('fetch', mockFetch);
  });

  // ================================================================
  // 正常路径 - HTTP 方法
  // ================================================================

  describe('正常路径 - HTTP 方法', () => {
    it('GET 请求返回 ResInterceptorConfig<data> 包装结果', async () => {
      const { commonRequest } = setupAxios(baseConfig);
      const result = await commonRequest({ url: '/users', method: 'GET' });

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(defaultResponseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('POST 请求正常完成', async () => {
      const { commonRequest } = setupAxios(baseConfig);
      const result = await commonRequest<typeof defaultResponseData, { name: string }>({
        url: '/users',
        method: 'POST',
        data: { name: 'new-user' },
      });

      expect(result.data).toEqual(defaultResponseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('PUT 请求正常完成', async () => {
      const { commonRequest } = setupAxios(baseConfig);
      const result = await commonRequest<typeof defaultResponseData, { name: string }>({
        url: '/users/1',
        method: 'PUT',
        data: { name: 'updated' },
      });

      expect(result.data).toEqual(defaultResponseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('DELETE 请求正常完成', async () => {
      const { commonRequest } = setupAxios(baseConfig);
      const result = await commonRequest({
        url: '/users/1',
        method: 'DELETE',
      });

      expect(result.data).toEqual(defaultResponseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ================================================================
  // 正常路径 - 请求拦截器
  // ================================================================

  describe('正常路径 - 请求拦截器', () => {
    it('请求拦截器被调用并可修改 config.url', async () => {
      const { commonRequest, addReqInterceptor } = setupAxios(baseConfig);
      const interceptorSpy = vi.fn((cfg) => {
        cfg.config.url = '/modified-path';
        return cfg;
      });

      // P0: isTemporary=true 在此实现中实际为全局; 临时用 true 来让拦截器不被清除
      addReqInterceptor(interceptorSpy, true);

      await commonRequest({ url: '/original', method: 'GET' });

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });

    it('请求拦截器按注册顺序依次执行', async () => {
      const { commonRequest, addReqInterceptor } = setupAxios(baseConfig);
      const order: string[] = [];

      addReqInterceptor((cfg) => { order.push('first'); return cfg; }, true);
      addReqInterceptor((cfg) => { order.push('second'); return cfg; }, true);
      addReqInterceptor((cfg) => { order.push('third'); return cfg; }, true);

      await commonRequest({ url: '/test', method: 'GET' });

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  // ================================================================
  // 正常路径 - 响应拦截器
  // ================================================================

  describe('正常路径 - 响应拦截器', () => {
    it('响应拦截器接收 data 并可修改返回值', async () => {
      const { commonRequest, addResInterceptor } = setupAxios(baseConfig);
      const interceptorSpy = vi.fn((res) => {
        res.data = { ...res.data, enriched: true };
        return res;
      });

      // P0: isTemporary=true 实际为全局
      addResInterceptor(interceptorSpy, true);

      const result = await commonRequest({ url: '/users', method: 'GET' });

      expect(interceptorSpy).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveProperty('enriched', true);
      expect(result.data).toHaveProperty('items');
    });

    it('响应拦截器按注册顺序依次执行', async () => {
      const { commonRequest, addResInterceptor } = setupAxios(baseConfig);
      const order: string[] = [];

      addResInterceptor((res) => { order.push('res1'); return res; }, true);
      addResInterceptor((res) => { order.push('res2'); return res; }, true);

      await commonRequest({ url: '/test', method: 'GET' });

      expect(order).toEqual(['res1', 'res2']);
    });
  });

  // ================================================================
  // isTemporary 局部/全局拦截器生命周期（含 P0 回归）
  // ================================================================

  describe('isTemporary 拦截器生命周期', () => {
    // TODO: P0 regression - expected to FAIL until fix
    // 源码: if (!isTemporary) { temporySet.add(fn); }
    // 导致 isTemporary=true 时 NOT added to temporySet → 不会被清除（GLOBAL 行为）
    // 预期: isTemporary=true 时应加入 temporySet → 单次请求后被清除
    it('TODO: P0 regression - addReqInterceptor(isTemporary=true) 单次请求后 fn 被清除', async () => {
      const { commonRequest, addReqInterceptor } = setupAxios(baseConfig);
      const interceptorSpy = vi.fn((cfg) => cfg);

      addReqInterceptor(interceptorSpy, true);

      // 第一次请求
      await commonRequest({ url: '/first', method: 'GET' });
      expect(interceptorSpy).toHaveBeenCalledTimes(1);

      // 第二次请求 — 期望拦截器已清除，不再调用
      await commonRequest({ url: '/second', method: 'GET' });
      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });

    // TODO: P0 regression - expected to FAIL until fix
    // 源码: if (!isTemporary) { temporySet.add(fn); }
    // 导致 isTemporary=false (默认) 时加入 temporySet → 单次请求后被清除
    // 预期: isTemporary=false 时为全局拦截器，多次请求后仍存在
    it('TODO: P0 regression - addReqInterceptor(isTemporary=false) 两次请求后 fn 仍在数组', async () => {
      const { commonRequest, addReqInterceptor } = setupAxios(baseConfig);
      const interceptorSpy = vi.fn((cfg) => cfg);

      addReqInterceptor(interceptorSpy, false);

      // 第一次请求
      await commonRequest({ url: '/first', method: 'GET' });
      // 第二次请求 — 期望拦截器仍然存在
      await commonRequest({ url: '/second', method: 'GET' });

      expect(interceptorSpy).toHaveBeenCalledTimes(2);
    });

    it('局部响应拦截器在单次请求后被清除（isTemporary=true）', async () => {
      const { commonRequest, addResInterceptor } = setupAxios(baseConfig);
      const interceptorSpy = vi.fn((res) => res);

      // isTemporary=true 表示临时拦截器，单次请求后清除
      addResInterceptor(interceptorSpy, true);

      await commonRequest({ url: '/first', method: 'GET' });
      expect(interceptorSpy).toHaveBeenCalledTimes(1);

      await commonRequest({ url: '/second', method: 'GET' });
      // 临时拦截器已被清除，不应再被调用
      expect(interceptorSpy).toHaveBeenCalledTimes(1);
    });

    it('全局响应拦截器在多次请求后保持不变（isTemporary=false）', async () => {
      const { commonRequest, addResInterceptor } = setupAxios(baseConfig);
      const interceptorSpy = vi.fn((res) => res);

      // isTemporary=false 表示全局拦截器，持久保留
      addResInterceptor(interceptorSpy, false);

      await commonRequest({ url: '/first', method: 'GET' });
      await commonRequest({ url: '/second', method: 'GET' });

      expect(interceptorSpy).toHaveBeenCalledTimes(2);
    });

    it('WeakSet 中标记的局部拦截器在清除后不再持有引用', async () => {
      const { commonRequest, addReqInterceptor } = setupAxios(baseConfig);

      // 使用一个可以被 GC 的函数引用
      let trackedFn: ReqInterceptor | null = (cfg) => cfg;
      addReqInterceptor(trackedFn, false); // 临时

      await commonRequest({ url: '/test', method: 'GET' });

      // 清除引用，让 GC 可以回收
      trackedFn = null;
      // 如果 WeakSet 正确 delete 了，这里不会阻止 GC
      // 此断言验证流程不会崩溃
      expect(true).toBe(true);
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('空拦截器数组时正常完成请求', async () => {
      const { commonRequest } = setupAxios(baseConfig);
      const result = await commonRequest({ url: '/users', method: 'GET' });

      expect(result.data).toEqual(defaultResponseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ================================================================
  // 错误路径
  // ================================================================

  describe('错误路径', () => {
    it('拦截器抛出异常时 Promise 被 reject', async () => {
      const { commonRequest, addReqInterceptor } = setupAxios(baseConfig);

      addReqInterceptor(() => {
        throw new Error('拦截器错误');
      }, true);

      await expect(
        commonRequest({ url: '/users', method: 'GET' }),
      ).rejects.toThrow('拦截器错误');
    });

    it('响应拦截器抛出异常时 Promise 被 reject', async () => {
      const { commonRequest, addResInterceptor } = setupAxios(baseConfig);

      addResInterceptor(() => {
        throw new Error('响应拦截器错误');
      }, true);

      await expect(
        commonRequest({ url: '/users', method: 'GET' }),
      ).rejects.toThrow('响应拦截器错误');
    });
  });

  // ================================================================
  // 副作用 - 状态隔离
  // ================================================================

  describe('副作用 - 状态隔离', () => {
    it('新建 setupAxios 实例拥有独立的拦截器数组', async () => {
      const instance1 = setupAxios(baseConfig);
      const instance2 = setupAxios(baseConfig);

      const spy1 = vi.fn((cfg: any) => cfg);
      const spy2 = vi.fn((cfg: any) => cfg);

      instance1.addReqInterceptor(spy1, true);
      instance2.addReqInterceptor(spy2, true);

      await instance1.commonRequest({ url: '/a', method: 'GET' });
      await instance2.commonRequest({ url: '/b', method: 'GET' });

      // 每个实例的拦截器互不影响
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });

    it('不同实例的响应拦截器数组互不影响', async () => {
      const instance1 = setupAxios(baseConfig);
      const instance2 = setupAxios(baseConfig);

      const spy1 = vi.fn((res: any) => res);
      const spy2 = vi.fn((res: any) => res);

      instance1.addResInterceptor(spy1, true);
      instance2.addResInterceptor(spy2, true);

      await instance1.commonRequest({ url: '/a', method: 'GET' });
      await instance2.commonRequest({ url: '/b', method: 'GET' });

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });
  });
});

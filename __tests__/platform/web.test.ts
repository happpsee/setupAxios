import platformRequest from '../../platform/web';
import type { DftBaseCfg, AdaptorReq } from '../../types/index';

/**
 * platform/web.ts - 浏览器 Fetch 平台适配器
 *
 * platformRequest: PlatformAdaptor = (baseCfg: DftBaseCfg) => CommonRequestFn
 * 内部流程:
 *   1. urlParamsParse 构建 URL
 *   2. 合并配置: { ...reqCfg, ...baseCfg } （P2 bug: base 覆盖 req）
 *   3. 非 GET 且存在 data → writeBodyData 序列化 body
 *   4. fetch(url, { method, headers, body })
 *   5. JSON 响应 → .json()，否则返回原始 Response
 */

const baseConfig: DftBaseCfg = {
  baseUrl: 'http://localhost:3000/api',
  timeout: 5000,
};

describe('platform/web', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  describe('正常路径', () => {
    it('platformRequest 返回工厂函数', () => {
      const requestFn = platformRequest(baseConfig);
      expect(typeof requestFn).toBe('function');
    });

    it('工厂函数返回的 CommonRequestFn 返回 Promise', () => {
      const mockResponse = new Response(JSON.stringify({ id: 1 }), {
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      const result = requestFn({
        url: '/users',
        method: 'GET',
      });

      expect(result).toBeInstanceOf(Promise);
    });

    it('GET 请求正确发起并返回 JSON 解析结果', async () => {
      const responseData = { data: [{ id: 1, name: 'test' }] };
      const mockResponse = new Response(JSON.stringify(responseData), {
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      const result = await requestFn<typeof responseData>({
        url: '/users',
        method: 'GET',
      });

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('POST 请求带 JSON Content-Type 时序列化 body', async () => {
      const responseData = { id: 1, name: 'created' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      await requestFn({
        url: '/users',
        method: 'POST',
        data: { name: 'new-user' },
        headers: { 'Content-Type': 'application/json' },
      });

      // 验证 fetch 被调用
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchArg = mockFetch.mock.calls[0]?.[0] as URL;
      expect(fetchArg).toBeInstanceOf(URL);
      expect(fetchArg.href).toBe('http://localhost:3000/api/users');
      const fetchInit = mockFetch.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(fetchInit.body).toBe(JSON.stringify({ name: 'new-user' }));
    });
  });

  describe('边界条件', () => {
    it('非 GET 请求无 data 时不设置 body', async () => {
      const mockResponse = new Response('ok', {
        headers: new Headers({ 'Content-Type': 'text/plain' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      await requestFn({
        url: '/users',
        method: 'DELETE',
      });

      const fetchArg = mockFetch.mock.calls[0]?.[0] as URL;
      expect(fetchArg).toBeInstanceOf(URL);
      const fetchInit = mockFetch.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(fetchInit.body || '').toBe('');
    });

    it('非 JSON 响应返回原始 Response', async () => {
      const mockResponse = new Response('plain text response', {
        headers: new Headers({ 'Content-Type': 'text/plain' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      const result = await requestFn({
        url: '/docs/readme',
        method: 'GET',
      });

      // 非 JSON 响应返回原始 Response 对象
      expect(result).toBeInstanceOf(Response);
    });

    it('JSON 响应被正确解析为 JS 对象', async () => {
      const data = { arr: [1, 2, 3], nested: { key: 'value' } };
      const mockResponse = new Response(JSON.stringify(data), {
        headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      const result = await requestFn({
        url: '/data',
        method: 'GET',
      });

      expect(result).toEqual(data);
    });
  });

  describe('已知问题回归', () => {
    // TODO: P1 regression - expected to FAIL until fix
    // urlParamsParse 中 new URL(baseUrl, url) 参数顺序错误
    // 当 baseUrl 是绝对 URL 时，url 字段被忽略
    it('TODO: P1 regression - url 字段应被正确拼接到 baseUrl 之后', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestFn = platformRequest(baseConfig);
      await requestFn({
        url: '/users/42',
        method: 'GET',
      });

      // 期望 fetch 请求的 URL 包含 /users/42
      const fetchArg = mockFetch.mock.calls[0]?.[0] as (URL | Request);
      const actualUrl = fetchArg instanceof URL ? fetchArg.href : fetchArg.url;
      expect(actualUrl).toContain('/users/42');
    });

    // TODO: P2 regression - expected to FAIL until fix
    // 配置合并使用 { ...reqCfg, ...baseCfg }，base 覆盖 req
    it('TODO: P2 regression - 基础配置不应覆盖请求级配置的同名字段', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const customBaseConfig: DftBaseCfg = {
        baseUrl: 'http://default.example.com/api',
        timeout: 10000,
      };

      const requestFn = platformRequest(customBaseConfig);
      await requestFn({
        url: '/custom-path',
        method: 'GET',
        baseUrl: 'http://override.example.com/v2',
      } as AdaptorReq);

      // 期望: 使用请求级别的 baseUrl (http://override.example.com/v2)
      const fetchArg = mockFetch.mock.calls[0]?.[0] as (URL | Request);
      const actualUrl = fetchArg instanceof URL ? fetchArg.href : fetchArg.url;
      expect(actualUrl).toContain('override.example.com');
    });
  });
});

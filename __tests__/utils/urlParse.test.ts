import { urlParamsParse } from '../../utils/urlParse';
import type { AllReqConfig } from '../../types/index';

/**
 * urlParamsParse - URL 拼接和参数追加
 *
 * 函数签名: urlParamsParse(config: AllReqConfig): URL
 * 注意: new URL() 的参数顺序为 (url, base)，当前实现中使用 new URL(config.baseUrl, config.url)
 *       存在参数顺序 bug (P1)
 */

function makeConfig(overrides: Partial<AllReqConfig> = {}): AllReqConfig {
  return {
    baseUrl: 'http://api.example.com/v1',
    url: '/users',
    timeout: 5000,
    method: 'GET',
    ...overrides,
  };
}

describe('urlParamsParse', () => {
  describe('正常路径', () => {
    it('基本 baseUrl + url 构造 URL', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://localhost:3000/api',
        url: '/users',
      }));
      // url 追加到 baseUrl 路径后面 (Axios-like)
      expect(result.href).toBe('http://localhost:3000/api/users');
    });

    it('params 参数追加为查询字符串', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://localhost:3000/api',
        url: '/users',
        params: { page: '1', limit: '10' },
      }));
      const url = new URL(result.href);
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('limit')).toBe('10');
    });

    it('无 params 时只返回基础 URL', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/data',
      }));
      expect(result.href).toBe('http://example.com/api/data');
    });

    it('空 params 对象不影响 URL', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/data',
        params: {},
      }));
      expect(result.searchParams.toString()).toBe('');
    });

    it('params 值为数字类型时自动转为字符串', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/data',
        params: { id: 42, page: 1 },
      }));
      expect(result.searchParams.get('id')).toBe('42');
      expect(result.searchParams.get('page')).toBe('1');
    });

    it('多个 params 正确追加', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/data',
        params: { a: '1', b: '2', c: '3' },
      }));
      expect(result.searchParams.get('a')).toBe('1');
      expect(result.searchParams.get('b')).toBe('2');
      expect(result.searchParams.get('c')).toBe('3');
    });
  });

  describe('边界条件', () => {
    it('params 包含特殊字符时正确编码', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/search',
        params: { q: 'hello world', filter: 'a&b=c' },
      }));
      expect(result.searchParams.get('q')).toBe('hello world');
      expect(result.searchParams.get('filter')).toBe('a&b=c');
      // searchParams 会自动编码
      expect(result.href).toContain('hello+world');
      expect(result.href).toContain('a%26b%3Dc');
    });

    it('params 值为空字符串', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/data',
        params: { empty: '' },
      }));
      expect(result.searchParams.get('empty')).toBe('');
    });

    it('返回值为 URL 对象而非字符串', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://example.com/api',
        url: '/data',
      }));
      expect(result).toBeInstanceOf(URL);
    });
  });

  describe('已知问题回归', () => {
    // TODO: P1 regression - expected to FAIL until fix
    // 当前实现 new URL(config.baseUrl, config.url) 参数顺序反了
    // 应该为 new URL(config.url, config.baseUrl)
    // 当 baseUrl 是绝对 URL 时，url 参数被忽略，导致路径不正确
    it('TODO: P1 regression - url 字段应该追加到 baseUrl 之后而非被忽略', () => {
      const result = urlParamsParse(makeConfig({
        baseUrl: 'http://api.example.com/v1',
        url: '/users/123',
      }));
      // 期望: http://api.example.com/v1/users/123
      // 实际: http://api.example.com/v1 (url 被忽略，因为 baseUrl 是绝对 URL)
      // 此断言在实际修复前表现为: http://api.example.com/v1
      expect(result.href).toBe('http://api.example.com/v1/users/123');
    });
  });
});

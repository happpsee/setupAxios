import { writeBodyData } from '../../utils/writeBodyData';
import type { AllReqConfig } from '../../types/index';

/**
 * writeBodyData - 根据 Content-Type 序列化请求 body
 *
 * 函数签名: writeBodyData(requestInit: any, cfg: AllReqConfig): void
 * 行为: 仅当 Content-Type === "application/json" 时序列化 data 为 JSON 字符串
 *       P2 bug: 非 JSON Content-Type 时静默不处理 data（无声丢弃）
 */

function makeConfig(overrides: Partial<AllReqConfig> = {}): AllReqConfig {
  return {
    baseUrl: 'http://example.com',
    url: '/api',
    timeout: 5000,
    method: 'POST',
    ...overrides,
  };
}

describe('writeBodyData', () => {
  describe('正常路径', () => {
    it('Content-Type 为 application/json 时序列化 data 到 body', () => {
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: { 'Content-Type': 'application/json' },
        data: { name: 'test', value: 123 },
      });

      writeBodyData(requestInit, cfg);

      expect(requestInit.body).toBe(JSON.stringify({ name: 'test', value: 123 }));
    });

    it('data 为数组时正确序列化到 body', () => {
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: { 'Content-Type': 'application/json' },
        data: [1, 2, 3],
      });

      writeBodyData(requestInit, cfg);

      expect(requestInit.body).toBe('[1,2,3]');
    });

    it('data 为空对象时序列化为 "{}"', () => {
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });

      writeBodyData(requestInit, cfg);

      expect(requestInit.body).toBe('{}');
    });
  });

  describe('边界条件', () => {
    it('无 Content-Type 头时不设置 body', () => {
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: {},
        data: { name: 'test' },
      });

      writeBodyData(requestInit, cfg);

      expect(requestInit.body).toBeUndefined();
    });

    it('非 JSON Content-Type 时不设置 body', () => {
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: { name: 'test' },
      });

      writeBodyData(requestInit, cfg);

      expect(requestInit.body).toBeUndefined();
    });

    it('data 为 null 时序列化 null 字面量', () => {
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: { 'Content-Type': 'application/json' },
        data: null as unknown as undefined,
      });

      writeBodyData(requestInit, cfg);

      expect(requestInit.body).toBe('null');
    });
  });

  describe('已知问题回归', () => {
    // TODO: P2 regression - expected to FAIL until fix
    // 非 JSON Content-Type 时 data 被无声丢弃，没有任何警告或错误
    // 这可能导致用户困惑：配置了 data 但请求中 body 为空
    it('TODO: P2 regression - 非 JSON Content-Type 时 data 存在应输出 warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const requestInit: Record<string, unknown> = {};
      const cfg = makeConfig({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: { name: 'important-data' },
      });

      writeBodyData(requestInit, cfg);

      // 修复后: 输出 console.warn 提示用户 data 存在但不会被序列化
      expect(warnSpy).toHaveBeenCalled();
      expect(requestInit.body).toBeUndefined();

      warnSpy.mockRestore();
    });
  });
});

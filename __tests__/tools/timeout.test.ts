import { timeoutTool } from '../../tools/timeout';
import type { ToolInstanceType, DecorateInstanceType } from '../../types/index';

/**
 * timeoutTool - 超时取消装饰器
 *
 * 函数签名: timeoutTool(timer: string): ToolInstanceType
 * 行为: 延迟 timer ms 后检查:
 *   - config.result 为 truthy 且 !config.cancel → 请求已完成，不做操作
 *   - 否则设置 config.result = Promise.reject("请求超时!") 和 config.cancel = true
 * P2 bug: config.result 使用 truthiness 检查，result=0/false/"" 会误判
 */

function createMockInstance(overrides: Partial<DecorateInstanceType> = {}): DecorateInstanceType {
  return {
    this: {},
    arguments: [{ url: '/api/test', method: 'GET' }],
    originMethod: async () => ({ data: 'success' }),
    after: [] as Array<(...args: unknown[]) => void>,
    registryAfter: (fn: (...args: unknown[]) => void) => {
      (overrides.after || []).push(fn);
    },
    cancel: false,
    ...overrides,
    after: overrides.after ?? [] as Array<(...args: unknown[]) => void>,
  };
}

describe('timeoutTool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('正常路径', () => {
    it('timeoutTool() 返回一个函数 (ToolInstanceType)', () => {
      const tool = timeoutTool('5000');
      expect(typeof tool).toBe('function');
    });

    it('超时后设置 config.result 为 rejected Promise 且 config.cancel = true', () => {
      const instance = createMockInstance();
      const tool = timeoutTool('1000') as ToolInstanceType;

      tool(instance);

      // 超时触发
      vi.advanceTimersByTime(1000);

      // 刷新微任务队列以让 Promise.reject 的微任务执行
      // 注意: Promise.reject 不需要微任务来"创建"，它本身已经存在
      expect(instance.cancel).toBe(true);
      expect(instance.result).toBeInstanceOf(Promise);
      // 验证它是 rejected
      return expect(instance.result).rejects.toThrow('请求超时!');
    });

    it('result 为 truthy 且未取消时不触发超时覆盖', () => {
      const instance = createMockInstance({
        result: { data: 'ok' },
        cancel: false,
      });
      const tool = timeoutTool('1000') as ToolInstanceType;

      tool(instance);
      vi.advanceTimersByTime(1000);

      // result 应保持不变，未被覆盖
      expect(instance.result).toEqual({ data: 'ok' });
      expect(instance.cancel).toBe(false);
    });

    it('已取消时不重复设置 result', () => {
      const instance = createMockInstance({
        cancel: true,
      });
      const tool = timeoutTool('1000') as ToolInstanceType;

      tool(instance);
      vi.advanceTimersByTime(1000);

      // cancel 已为 true，不检查 result，直接设置超时
      // 注意：源码逻辑: if (config.result && !config.cancel) return;
      // cancel=true 时条件为 false，进入超时设置
      expect(instance.cancel).toBe(true);
      expect(instance.result).toBeInstanceOf(Promise);
    });
  });

  describe('已知问题回归', () => {
    // TODO: P2 regression - expected to FAIL until fix
    // 条件检查使用 truthiness，result=0/false/"" 被误判为"无结果"

    it('TODO: P2 regression - result=0 被误判为无结果，超时覆盖有效数据', () => {
      const instance = createMockInstance({
        result: 0 as unknown as DecorateInstanceType['result'],
        cancel: false,
      });
      const tool = timeoutTool('1000') as ToolInstanceType;

      tool(instance);
      vi.advanceTimersByTime(1000);

      // 期望: result 保持为 0（请求已完成，返回了 0）
      // 实际: 0 是 falsy，所以被判断为"无结果"，超时触发覆盖
      expect(instance.result).toBe(0);
    });

    it('TODO: P2 regression - result=false 被误判为无结果', () => {
      const instance = createMockInstance({
        result: false as unknown as DecorateInstanceType['result'],
        cancel: false,
      });
      const tool = timeoutTool('1000') as ToolInstanceType;

      tool(instance);
      vi.advanceTimersByTime(1000);

      // 期望: result 保持为 false
      expect(instance.result).toBe(false);
    });

    it('TODO: P2 regression - result="" 被误判为无结果', () => {
      const instance = createMockInstance({
        result: '' as unknown as DecorateInstanceType['result'],
        cancel: false,
      });
      const tool = timeoutTool('1000') as ToolInstanceType;

      tool(instance);
      vi.advanceTimersByTime(1000);

      // 期望: result 保持为 ""
      expect(instance.result).toBe('');
    });
  });

  describe('边界条件', () => {
    it('自定义超时时间（非默认值）正确延迟触发', () => {
      const instance = createMockInstance();
      const tool = timeoutTool('2000') as ToolInstanceType;

      tool(instance);

      // 1000ms 时不应触发
      vi.advanceTimersByTime(1000);
      expect(instance.cancel).toBe(false);

      // 2000ms 时应触发
      vi.advanceTimersByTime(1000);
      expect(instance.cancel).toBe(true);
    });
  });
});

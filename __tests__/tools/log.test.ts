import { Log } from '../../tools/log';
import type { ToolInstanceType } from '../../types/index';

/**
 * Log - 日志装饰器工厂
 *
 * 行为: 返回 ToolInstanceType 函数，执行时:
 *   1. console.log 输出请求开始时间和 arguments
 *   2. registryAfter 注册回调，在 after 切面输出结束时间和 result
 */

function createMockDecorateInstance(overrides: Record<string, unknown> = {}) {
  const instance = {
    arguments: [{ url: '/api/test', method: 'GET' }],
    result: { data: 'success' },
    after: [] as Array<(...args: unknown[]) => void>,
    registryAfter: (fn: (...args: unknown[]) => void) => {
      instance.after.push(fn);
    },
    cancel: false,
    ...overrides,
  };
  return instance;
}

describe('Log', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('正常路径', () => {
    it('Log() 返回一个函数 (ToolInstanceType)', () => {
      const logTool = Log();
      expect(typeof logTool).toBe('function');
    });

    it('执行时 console.log 输出开始时间和 arguments', () => {
      const logTool = Log() as ToolInstanceType;
      const instance = createMockDecorateInstance();

      logTool(instance as any);

      expect(consoleLogSpy).toHaveBeenCalled();
      const callArg = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(callArg).toContain('Request Start Time');
      expect(callArg).toContain('==>>>');
    });

    it('registryAfter 注册的回调在执行后输出结束时间和 result', () => {
      const logTool = Log() as ToolInstanceType;
      const instance = createMockDecorateInstance();

      // 执行装饰器，这会注册 after 回调
      logTool(instance as any);

      // 记录初始调用次数
      const callCountBeforeAfter = consoleLogSpy.mock.calls.length;

      // 执行 after 切面中的回调
      instance.after.forEach((fn) => fn());

      expect(consoleLogSpy).toHaveBeenCalledTimes(callCountBeforeAfter + 1);
      const afterCallArg = consoleLogSpy.mock.calls[callCountBeforeAfter]?.[0] as string;
      expect(afterCallArg).toContain('Request End Time');
      expect(afterCallArg).toContain('==>>>');
    });
  });

  describe('副作用', () => {
    it('多次调用 Log() 创建独立的装饰器实例', () => {
      const tool1 = Log();
      const tool2 = Log();

      expect(tool1).not.toBe(tool2);
    });
  });
});

import { errReportTool } from '../../tools/errReport';
import type { ToolInstanceType, DecorateInstanceType } from '../../types/index';

/**
 * errReportTool - 错误上报装饰器
 *
 * 函数签名: errReportTool<T>(callback: any): ToolInstanceType
 * 行为: registryAfter 注册 callback，在 after 切面执行
 */

function createMockInstance(): DecorateInstanceType {
  const instance: DecorateInstanceType = {
    this: {},
    arguments: [{ url: '/api/test', method: 'GET' }],
    originMethod: async () => ({ data: 'success' }),
    after: [] as Array<(...args: unknown[]) => void>,
    registryAfter: (fn: (...args: unknown[]) => void) => {
      instance.after.push(fn);
    },
    cancel: false,
  };
  return instance;
}

describe('errReportTool', () => {
  describe('正常路径', () => {
    it('errReportTool() 返回一个函数 (ToolInstanceType)', () => {
      const tool = errReportTool(() => {});
      expect(typeof tool).toBe('function');
    });

    it('registryAfter 注册的回调在 after 切面可被调用', () => {
      const reportFn = vi.fn();
      const instance = createMockInstance();
      const tool = errReportTool(reportFn) as ToolInstanceType;

      // 执行装饰器，注册 after 回调
      tool(instance);

      // 验证 reportFn 被注册到 after 队列
      expect(instance.after.length).toBe(1);
      expect(instance.after[0]).toBe(reportFn);

      // 执行 after 切面
      instance.after.forEach((fn) => fn());

      expect(reportFn).toHaveBeenCalledTimes(1);
    });

    it('不同类型的回调函数均可工作', () => {
      // 箭头函数
      const arrowFn = vi.fn();
      const instance1 = createMockInstance();
      const tool1 = errReportTool(arrowFn) as ToolInstanceType;
      tool1(instance1);
      instance1.after.forEach((fn) => fn());
      expect(arrowFn).toHaveBeenCalled();

      // 普通函数
      function namedFn() { /* noop */ }
      const instance2 = createMockInstance();
      const tool2 = errReportTool(namedFn) as ToolInstanceType;
      tool2(instance2);
      expect(instance2.after.length).toBe(1);
    });
  });
});

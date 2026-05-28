import { toolManageFactory } from '../../tools/index';
import type { ToolInstanceType } from '../../types/index';

/**
 * toolManageFactory - 装饰器注册中心工厂
 *
 * 返回值: { toolMap, addTool, removeTool }
 * 默认注册: toolMap 预注册 ["log", Log]
 */

function createStubTool(name: string): ToolInstanceType {
  const tool: ToolInstanceType = (config) => {
    // 空操作工具，仅用于注册/移除测试
    return config;
  };
  // 给工具加个标识用于断言
  (tool as any)._name = name;
  return tool;
}

describe('toolManageFactory', () => {
  describe('正常路径', () => {
    it('创建后 toolMap 预注册了 log 工具', () => {
      const { toolMap } = toolManageFactory();

      expect(toolMap.has('log')).toBe(true);
      expect(typeof toolMap.get('log')).toBe('function');
    });

    it('addTool 添加新工具到 toolMap', () => {
      const { toolMap, addTool } = toolManageFactory();
      const stubTool = createStubTool('test-tool');

      addTool('test-tool', stubTool);

      expect(toolMap.has('test-tool')).toBe(true);
      expect(toolMap.get('test-tool')).toBe(stubTool);
    });

    it('removeTool 移除已注册的工具', () => {
      const { toolMap, removeTool } = toolManageFactory();

      removeTool('log');

      expect(toolMap.has('log')).toBe(false);
    });

    it('addTool 覆盖同名工具', () => {
      const { toolMap, addTool } = toolManageFactory();
      const originalLog = toolMap.get('log');
      const newTool = createStubTool('custom-log');

      addTool('log', newTool);

      expect(toolMap.get('log')).toBe(newTool);
      expect(toolMap.get('log')).not.toBe(originalLog);
    });
  });

  describe('边界条件', () => {
    it('removeTool 移除不存在的工具不抛出异常', () => {
      const { removeTool } = toolManageFactory();

      expect(() => {
        removeTool('nonexistent');
      }).not.toThrow();
    });

    it('toolMap 是 Map 实例，支持 Map 原生操作', () => {
      const { toolMap } = toolManageFactory();

      expect(toolMap).toBeInstanceOf(Map);
      expect(toolMap.size).toBeGreaterThanOrEqual(1);

      // 验证 Map 迭代正常
      const entries = Array.from(toolMap.entries());
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });
});

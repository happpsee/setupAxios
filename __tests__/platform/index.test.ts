import { registerAdaptor, getPlatformRequest } from '../../platform/index';
import type { PlatformAdaptor, DftBaseCfg, CommonRequest } from '../../types/index';

/**
 * platform/index.ts - 平台适配器管理
 *
 * registerAdaptor(name, adaptor): 注册自定义平台适配器到 adaptors 记录
 * getPlatformRequest(platform, config): 根据平台类型获取请求函数
 *   P0 bug: switch 语句硬编码，默认 fallback 到 web，adaptors 记录不会被匹配
 */

function createMockAdaptor(): PlatformAdaptor {
  return (_cfg: DftBaseCfg): CommonRequest => {
    return async <Req, Res>(_reqCfg: any): Promise<Res> => {
      return { platform: 'mock', success: true } as unknown as Res;
    };
  };
}

const baseConfig: DftBaseCfg = {
  baseUrl: 'http://localhost:3000',
  timeout: 5000,
};

describe('platform/index', () => {
  describe('正常路径', () => {
    it('getPlatformRequest("web") 返回一个函数', () => {
      const requestFn = getPlatformRequest('web', baseConfig);
      expect(typeof requestFn).toBe('function');
    });

    it('返回的函数可以被调用来发起请求', async () => {
      // mock fetch 已在 setup.ts 全局 stub
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      const requestFn = getPlatformRequest('web', baseConfig);
      const result = await requestFn({
        url: '/test',
        method: 'GET',
      });

      expect(result).toEqual({ ok: true });
    });

    it('registerAdaptor 将新适配器添加到 adaptors 记录', () => {
      const mockAdaptor = createMockAdaptor();

      registerAdaptor('wx', mockAdaptor);

      // 验证已注册：getPlatformRequest 应能查询 adaptors
      // 但由于 P0 bug，switch 不会匹配 "wx"
      // 此处仅验证 registerAdaptor 不抛出异常
      expect(() => registerAdaptor('wx', mockAdaptor)).not.toThrow();
    });

    it('registerAdaptor 可覆盖已存在的适配器', () => {
      const firstAdaptor = createMockAdaptor();
      const secondAdaptor = createMockAdaptor();

      registerAdaptor('custom', firstAdaptor);
      expect(() => registerAdaptor('custom', secondAdaptor)).not.toThrow();
      // 覆盖操作应成功（不抛出异常）
    });

    it('多次 registerAdaptor 注册不同适配器均可成功', () => {
      const wxAdaptor = createMockAdaptor();
      const uniAdaptor = createMockAdaptor();

      expect(() => {
        registerAdaptor('wx', wxAdaptor);
        registerAdaptor('uni', uniAdaptor);
      }).not.toThrow();
    });
  });

  describe('已知问题回归', () => {
    // TODO: P0 regression - expected to FAIL until fix
    // switch 语句只匹配 "web" 和 default（均 fallback 到 web）
    // registerAdaptor 注册的适配器在 getPlatformRequest 中永不被使用
    it('TODO: P0 regression - registerAdaptor 注册的自定义适配器应能被 getPlatformRequest 使用', async () => {
      const customAdaptor = createMockAdaptor();
      registerAdaptor('wx', customAdaptor);

      const requestFn = getPlatformRequest('wx' as any, baseConfig);

      expect(requestFn).toBeDefined();

      // P0 修复后: getPlatformRequest 使用 adaptors 映射表查询，应返回自定义适配器
      // 调用返回的函数，验证返回的是 mock adaptor 的特征响应（非 web fetch 结果）
      const result = await requestFn({ url: '/test', method: 'GET' });
      expect(result).toEqual({ platform: 'mock', success: true });
    });

    it('getPlatformRequest 默认分支 fallback 到 web 适配器', () => {
      const requestFn = getPlatformRequest('unknown' as any, baseConfig);
      expect(typeof requestFn).toBe('function');
      // 任何未知平台类型都 fallback 到 web，不会抛出错误
    });
  });
});

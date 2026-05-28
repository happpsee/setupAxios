import type { DftBaseCfg, CommonRequest, PlatformAdaptor } from '../types/index';

/**
 * 创建 mock Response 对象，用于模拟 fetch 返回值
 * 使用原生 Response / Headers API (Node 18+ 可用)
 */
export function createMockResponse(
  data: unknown,
  contentType: string = 'application/json',
  status: number = 200,
): Response {
  const body = contentType === 'application/json'
    ? JSON.stringify(data)
    : String(data);

  const headers = new Headers({
    'Content-Type': contentType,
  });

  return new Response(body, {
    status,
    headers,
  });
}

/**
 * 创建 mock PlatformAdaptor，返回可配置的 CommonRequestFn
 * 用于隔离测试，避免依赖真实 fetch
 */
export function createMockAdaptor(
  responseData?: unknown,
  contentType?: string,
): PlatformAdaptor {
  return (_cfg: DftBaseCfg): CommonRequest => {
    return async <Req, Res>(_reqCfg: any): Promise<Res> => {
      const mockResponse = createMockResponse(
        responseData ?? { success: true },
        contentType ?? 'application/json',
      );
      const contentTypeHeader = mockResponse.headers.get('Content-Type');
      if (contentTypeHeader?.includes('application/json')) {
        return mockResponse.json() as Promise<Res>;
      }
      return mockResponse as unknown as Res;
    };
  };
}

// 每个测试文件加载时，确保 fetch 被 stub
vi.stubGlobal('fetch', vi.fn());

// 每个测试用例后清理所有 mock 和 timer
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

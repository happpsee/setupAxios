// 问题 7 测试：超时取消机制
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("timeout — 问题 7: AbortController 超时取消", () => {
  it("超时后应调用 AbortController.abort()", async () => {
    const { timeoutTool } = await import("../tools/timeout.js");

    let aborted = false;
    const originalAbortController = globalThis.AbortController;

    // Mock AbortController
    globalThis.AbortController = class extends originalAbortController {
      abort(reason?: any) {
        aborted = true;
        super.abort(reason);
      }
    } as any;

    try {
      const tool = timeoutTool(10);

      const decoratorInstance = {
        arguments: [{}],
        originMethod: () => Promise.resolve(),
        after: [] as any[],
        registryAfter: function (this: any, fn: any) {
          this.after.push(fn);
        },
        cancel: false,
      };

      tool(decoratorInstance);

      // 等待超时触发
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(aborted, true, "超时后应调用 abort()");
    } finally {
      globalThis.AbortController = originalAbortController;
    }
  });

  it("signal 应被注入到请求参数中", async () => {
    const { timeoutTool } = await import("../tools/timeout.js");

    const tool = timeoutTool(1000);

    const reqArgs: any[] = [{}];
    const decoratorInstance = {
      arguments: reqArgs,
      originMethod: () => Promise.resolve(),
      after: [] as any[],
      registryAfter: function (this: any, fn: any) {
        this.after.push(fn);
      },
      cancel: false,
    };

    tool(decoratorInstance);

    assert.ok(reqArgs[0].signal instanceof AbortSignal,
      "signal 应被注入到第一个参数中");
  });

  it("after 切面应清除定时器", async () => {
    const { timeoutTool } = await import("../tools/timeout.js");

    let cleared = false;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;

    globalThis.clearTimeout = ((id: any) => {
      cleared = true;
      return originalClearTimeout(id);
    }) as typeof clearTimeout;

    try {
      const tool = timeoutTool(100000);

      const decoratorInstance = {
        arguments: [{}],
        originMethod: () => Promise.resolve(),
        after: [] as any[],
        registryAfter: function (this: any, fn: any) {
          this.after.push(fn);
        },
        cancel: false,
      };

      tool(decoratorInstance);
      assert.strictEqual(cleared, false, "请求正常时不应提前清除定时器");

      // 模拟请求完成后执行 after 回调
      await decoratorInstance.after[0]();
      assert.strictEqual(cleared, true, "after 切面应清除定时器");
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });
});

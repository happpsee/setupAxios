// Bug 3 测试：验证 Log 工厂函数被正确调用
import { describe, it } from "node:test";
import assert from "node:assert";

describe("Log 装饰器 — Bug 3: 工厂函数调用", () => {
  it("Log() 调用后返回的是函数而非工厂", async () => {
    const { Log } = await import("../tools/log.js");

    const result = Log();

    assert.strictEqual(typeof result, "function",
      "Log() 应返回一个函数（ToolInstanceType），而非工厂函数");
    assert.notStrictEqual(result, Log,
      "Log() 的返回值不应等于 Log 本身");
  });

  it("toolMap 中存储的是已调用的工具函数", async () => {
    const { toolManageFactory } = await import("../tools/index.js");

    const { toolMap } = toolManageFactory();
    const logTool = toolMap.get("log");

    assert.ok(logTool, "toolMap 中应存在 'log' 键");
    assert.strictEqual(typeof logTool, "function",
      "toolMap 中的 log 值应是一个函数");
    assert.notStrictEqual(logTool.toString().includes("console.log"), false,
      "toolMap 中的应是实际的日志函数而非工厂");
  });

  it("Log 装饰器执行时应输出日志", async () => {
    const { Log } = await import("../tools/log.js");

    const logFn = Log();
    const logMessages: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logMessages.push(args[0]);
    };

    try {
      const decoratorInstance = {
        arguments: [{ url: "/test", method: "GET" }],
        originMethod: () => Promise.resolve(),
        after: [] as any[],
        registryAfter: function (this: any, fn: any) {
          this.after.push(fn);
        },
        cancel: false,
      };

      await logFn(decoratorInstance);

      assert.ok(logMessages.some((m) => m && m.includes("Request Start Time")),
        "应输出请求开始日志");
      assert.strictEqual(decoratorInstance.after.length, 1,
        "应注册一个 after 回调");

      // 执行 after 回调
      await decoratorInstance.after[0]();
      assert.ok(logMessages.some((m) => m && m.includes("Request End Time")),
        "应输出请求结束日志");
    } finally {
      console.log = originalLog;
    }
  });
});

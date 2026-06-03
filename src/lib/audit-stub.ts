/**
 * Audit module removed (C2b).
 * `auditStub()` returns a chainable, awaitable proxy that mimics the
 * Supabase query-builder surface but always resolves to an empty result.
 *
 * Used to replace `.from("audit_log" | "audit_import_logs" | "fin_audit_logs")`
 * call sites without touching the surrounding control flow.
 */
const EMPTY_RESULT = { data: [] as any[], error: null, count: 0 };

const makeChain = (): any => {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then")
        return (onFulfilled: any, onRejected?: any) =>
          Promise.resolve(EMPTY_RESULT).then(onFulfilled, onRejected);
      if (prop === "catch")
        return (onRejected: any) => Promise.resolve(EMPTY_RESULT).catch(onRejected);
      if (prop === "finally")
        return (cb: any) => Promise.resolve(EMPTY_RESULT).finally(cb);
      // any builder method (select, eq, gte, in, order, limit, range, insert, update, upsert, delete, maybeSingle, single, or, not, is, neq, ilike, …)
      return (..._args: any[]) => makeChain();
    },
  };
  return new Proxy(function () {}, handler);
};

export const auditStub = (..._args: any[]): any => makeChain();

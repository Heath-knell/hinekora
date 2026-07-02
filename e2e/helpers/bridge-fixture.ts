type E2EBridgeDomainMethods<TBridge extends object> = {
  [K in keyof TBridge]?: TBridge[K] | undefined;
};

type E2EBridgeDomainFactory = <TBridge extends object>(
  domain: string,
  methods: E2EBridgeDomainMethods<TBridge>,
  unexpectedBridgeCalls: string[],
  label: string,
) => TBridge;

const e2eBridgeDomainFactorySource = String(function createBridgeDomain<
  TBridge extends object,
>(
  domain: string,
  methods: E2EBridgeDomainMethods<TBridge>,
  unexpectedBridgeCalls: string[],
  label: string,
): TBridge {
  return new Proxy(methods as Record<PropertyKey, unknown>, {
    get(target, property, receiver) {
      if (typeof property === "symbol") {
        return Reflect.get(target, property, receiver);
      }

      const callName = `${domain}.${property}`;
      const value = Reflect.get(target, property, receiver);

      if (typeof value === "function") {
        return (...args: unknown[]) => {
          return (value as (...args: unknown[]) => unknown)(...args);
        };
      }

      if (Reflect.has(target, property)) {
        return value;
      }

      return () => {
        unexpectedBridgeCalls.push(callName);
        throw new Error(`Unexpected ${label} e2e bridge call: ${callName}`);
      };
    },
  }) as TBridge;
});

export {
  type E2EBridgeDomainFactory,
  type E2EBridgeDomainMethods,
  e2eBridgeDomainFactorySource,
};

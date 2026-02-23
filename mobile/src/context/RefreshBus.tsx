// mobile/src/context/RefreshBus.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type RefreshListener = () => void;

export type RefreshBus = {
  token: number;                 // ✅ changes when bump() called
  emit: () => void;              // notify subscribers
  bump: () => void;              // ✅ legacy + token bump
  subscribe: (fn: RefreshListener) => () => void;
};

const RefreshBusContext = createContext<RefreshBus | null>(null);

export function RefreshBusProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef(new Set<RefreshListener>());

  // ✅ token drives screens using [token] dependency
  const [token, setToken] = useState(0);

  const emit = useCallback(() => {
    listenersRef.current.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn("[RefreshBus] listener error", e);
      }
    });
  }, []);

  const bump = useCallback(() => {
    // increment token AND emit so both patterns work
    setToken((t) => t + 1);
    emit();
  }, [emit]);

  const subscribe = useCallback((fn: RefreshListener) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const value = useMemo(() => ({ token, emit, bump, subscribe }), [token, emit, bump, subscribe]);

  return <RefreshBusContext.Provider value={value}>{children}</RefreshBusContext.Provider>;
}

export function useRefreshBus() {
  const ctx = useContext(RefreshBusContext);
  if (!ctx) throw new Error("useRefreshBus must be used inside RefreshBusProvider");
  return ctx;
}

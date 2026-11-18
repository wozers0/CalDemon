import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Tab } from '../types';

export type Route =
  | { name: 'workout'; id: string }
  | { name: 'editor'; id?: string; copyOf?: string }
  | { name: 'session'; id: string }
  | { name: 'sessionDetail'; id: string; fresh?: boolean }
  | { name: 'history' }
  | { name: 'library' }
  | { name: 'settings' }
  | { name: 'badges' }
  | { name: 'breathe' };

export interface StackEntry {
  key: number;
  route: Route;
  leaving?: boolean;
  /** px offset the page starts its exit animation from (edge swipe) */
  from?: number;
}

interface NavValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  stack: StackEntry[];
  push: (r: Route) => void;
  replace: (r: Route) => void;
  pop: (from?: number) => void;
  popAll: () => void;
}

const NavContext = createContext<NavValue | null>(null);
const LEAVE_MS = 280;

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      return (sessionStorage.getItem('cd-tab') as Tab) || 'home';
    } catch {
      return 'home';
    }
  });
  const [stack, setStack] = useState<StackEntry[]>([]);
  const keyRef = useRef(0);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const swipeFrom = useRef<number | undefined>(undefined);

  const removeTop = useCallback((count = 1) => {
    setStack((s) => {
      const live = s.filter((e) => !e.leaving);
      const toLeave = new Set(live.slice(-count).map((e) => e.key));
      return s.map((e) => (toLeave.has(e.key) ? { ...e, leaving: true, from: swipeFrom.current } : e));
    });
    swipeFrom.current = undefined;
    setTimeout(() => setStack((s) => s.filter((e) => !e.leaving)), LEAVE_MS);
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (stackRef.current.some((e) => !e.leaving)) removeTop(1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [removeTop]);

  const push = useCallback((route: Route) => {
    keyRef.current += 1;
    const entry = { key: keyRef.current, route };
    setStack((s) => [...s, entry]);
    try {
      history.pushState({ cd: keyRef.current }, '');
    } catch {
      /* ignore */
    }
  }, []);

  const replace = useCallback((route: Route) => {
    keyRef.current += 1;
    const key = keyRef.current;
    setStack((s) => {
      const live = s.filter((e) => !e.leaving);
      if (!live.length) return [...s, { key, route }];
      const top = live[live.length - 1];
      return s.map((e) => (e.key === top.key ? { key, route } : e));
    });
  }, []);

  const pop = useCallback(
    (from?: number) => {
      swipeFrom.current = from;
      if (history.state?.cd) history.back();
      else removeTop(1);
    },
    [removeTop],
  );

  const popAll = useCallback(() => {
    const n = stackRef.current.filter((e) => !e.leaving).length;
    if (!n) return;
    removeTop(n);
    try {
      history.go(-n);
    } catch {
      /* ignore */
    }
  }, [removeTop]);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    try {
      sessionStorage.setItem('cd-tab', t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ tab, setTab, stack, push, replace, pop, popAll }), [tab, setTab, stack, push, replace, pop, popAll]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav outside NavProvider');
  return v;
}

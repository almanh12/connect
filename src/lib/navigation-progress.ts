/** Lightweight navigation progress bus (no nprogress dependency). */

type Listener = (active: boolean) => void;

let active = false;
const listeners = new Set<Listener>();

function emit(next: boolean) {
  active = next;
  listeners.forEach((listener) => listener(active));
}

export const navigationProgress = {
  isActive: () => active,

  /** Call when a route transition or router.refresh() begins. */
  start() {
    if (!active) emit(true);
  },

  /** Call when navigation has settled (pathname/searchParams updated). */
  complete() {
    if (active) emit(false);
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(active);
    return () => listeners.delete(listener);
  },
};

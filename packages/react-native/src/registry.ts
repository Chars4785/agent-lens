import type { Ref } from "react";
import { findNodeHandle, UIManager } from "react-native";

import { isAgentLensDevelopment } from "./development";
import type {
  AgentLensElementMetadata,
  AgentLensInspectionResult,
  AgentLensRegistryEntry,
  AgentLensSelectedElement,
  ElementLayout
} from "./types";

const registry = new Map<string, AgentLensRegistryEntry>();
const listeners = new Set<() => void>();
const MEASUREMENT_TIMEOUT_MS = 250;
let mountSequence = 0;

type MeasurableNode = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
};

function setForwardedRef<T>(
  ref: Ref<T> | undefined,
  value: T | null
): (() => void) | undefined {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    const cleanup: unknown = ref(value);
    return typeof cleanup === "function" ? cleanup as () => void : undefined;
  }

  (ref as { current: T | null }).current = value;
}

function isUsableLayout(layout: ElementLayout): boolean {
  return (
    Object.values(layout).every(Number.isFinite) &&
    layout.width > 0 && layout.height > 0
  );
}

function containsPoint(layout: ElementLayout, x: number, y: number): boolean {
  return (
    x >= layout.x &&
    x <= layout.x + layout.width &&
    y >= layout.y &&
    y <= layout.y + layout.height
  );
}

function measureWithCallback(
  measure: (callback: (x: number, y: number, width: number, height: number) => void) => void
): Promise<ElementLayout | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), MEASUREMENT_TIMEOUT_MS);

    try {
      measure((x, y, width, height) => {
        clearTimeout(timer);
        const layout = { x, y, width, height };
        resolve(isUsableLayout(layout) ? layout : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

export async function measureAgentLensNode(node: unknown): Promise<ElementLayout | null> {
  if (!node) {
    return null;
  }

  const measurableNode = node as MeasurableNode;
  if (typeof measurableNode.measureInWindow === "function") {
    const layout = await measureWithCallback((callback) =>
      measurableNode.measureInWindow!(callback)
    );
    if (layout) {
      return layout;
    }
  }

  try {
    const handle = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]);
    return handle && typeof UIManager.measureInWindow === "function"
      ? await measureWithCallback((callback) => UIManager.measureInWindow(handle, callback))
      : null;
  } catch {
    return null;
  }
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeAgentLensRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getAgentLensRegistrySize(): number {
  return registry.size;
}

function getRegistryEntry(id: string): AgentLensRegistryEntry | undefined {
  return registry.get(id) ?? Array.from(registry.values()).reverse().find(
    (entry) => entry.metadata.id === id
  );
}

export function registerAgentLensElement(
  metadata: AgentLensElementMetadata,
  node: unknown
): string | null {
  if (!isAgentLensDevelopment()) {
    return null;
  }

  const instanceId = `${metadata.id}:${++mountSequence}`;
  registry.set(instanceId, {
    instanceId,
    metadata,
    node,
    mountedAt: mountSequence
  });
  notifyListeners();
  return instanceId;
}

export function unregisterAgentLensElement(id: string): void {
  let removed = registry.delete(id);
  if (!removed) {
    for (const [instanceId, entry] of registry) {
      if (entry.metadata.id === id) {
        registry.delete(instanceId);
        removed = true;
      }
    }
  }
  if (removed) {
    notifyListeners();
  }
}

export function getAgentLensRegistryEntries(): AgentLensRegistryEntry[] {
  return Array.from(registry.values());
}

export async function measureAgentLensElement(
  id: string
): Promise<ElementLayout | null> {
  const entry = getRegistryEntry(id);

  if (!entry) {
    return null;
  }

  const layout = await measureAgentLensNode(entry.node);

  if (registry.get(entry.instanceId) !== entry) {
    return null;
  }

  if (layout) {
    entry.lastMeasuredLayout = layout;
  }

  return layout;
}

export async function findAgentLensElementAtPoint(
  x: number,
  y: number
): Promise<AgentLensSelectedElement | null> {
  return (await inspectAgentLensPoint(x, y)).selectedElement;
}

export async function inspectAgentLensPoint(
  x: number,
  y: number
): Promise<AgentLensInspectionResult> {
  const entries = getAgentLensRegistryEntries();
  if (!isAgentLensDevelopment()) {
    return { selectedElement: null, registeredCount: 0, measuredCount: 0 };
  }

  const measured = await Promise.all(
    entries.map(async (entry) => {
      const layout = await measureAgentLensElement(entry.instanceId);

      return layout
        ? {
            entry,
            layout,
            area: layout.width * layout.height
          }
        : null;
    })
  );

  const usable = measured.filter((item): item is NonNullable<typeof item> => Boolean(item));
  const matches = usable
    .filter(({ layout }) => containsPoint(layout, x, y))
    .sort((a, b) => {
      if (a.area !== b.area) {
        return a.area - b.area;
      }

      return b.entry.mountedAt - a.entry.mountedAt;
    });

  const selected = matches[0];

  return {
    registeredCount: entries.length,
    measuredCount: usable.length,
    selectedElement: selected ? {
      instanceId: selected.entry.instanceId,
      metadata: selected.entry.metadata,
      layout: selected.layout
    } : null
  };
}

export function createAgentLensRef<T>(
  metadata: AgentLensElementMetadata,
  forwardedRef?: Ref<T>
): (node: T | null) => void {
  let instanceId: string | null = null;
  let forwardedCleanup: (() => void) | undefined;

  return (node) => {
    if (instanceId) {
      unregisterAgentLensElement(instanceId);
      instanceId = null;
    }

    if (node === null) {
      if (forwardedCleanup) {
        const cleanup = forwardedCleanup;
        forwardedCleanup = undefined;
        cleanup();
      } else {
        setForwardedRef(forwardedRef, null);
      }
      return;
    }

    forwardedCleanup?.();
    forwardedCleanup = setForwardedRef(forwardedRef, node);
    instanceId = registerAgentLensElement(metadata, node);
  };
}

export const __agentLensCreateRef = createAgentLensRef;

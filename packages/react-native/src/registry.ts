import type { Ref } from "react";
import { findNodeHandle, UIManager } from "react-native";

import { isAgentLensDevelopment } from "./development";
import type {
  AgentLensElementMetadata,
  AgentLensRegistryEntry,
  AgentLensSelectedElement,
  ElementLayout
} from "./types";

const registry = new Map<string, AgentLensRegistryEntry>();
let mountSequence = 0;

type MeasurableNode = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
};

function setForwardedRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  (ref as { current: T | null }).current = value;
}

function isUsableLayout(layout: ElementLayout): boolean {
  return layout.width > 0 && layout.height > 0;
}

function containsPoint(layout: ElementLayout, x: number, y: number): boolean {
  return (
    x >= layout.x &&
    x <= layout.x + layout.width &&
    y >= layout.y &&
    y <= layout.y + layout.height
  );
}

function measureWithNodeMethod(node: MeasurableNode): Promise<ElementLayout | null> {
  if (typeof node.measureInWindow !== "function") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    node.measureInWindow?.((x, y, width, height) => {
      const layout = { x, y, width, height };
      resolve(isUsableLayout(layout) ? layout : null);
    });
  });
}

function measureWithUIManager(node: unknown): Promise<ElementLayout | null> {
  const handle = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]);

  if (!handle || typeof UIManager.measureInWindow !== "function") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    UIManager.measureInWindow(handle, (x, y, width, height) => {
      const layout = { x, y, width, height };
      resolve(isUsableLayout(layout) ? layout : null);
    });
  });
}

export function registerAgentLensElement(
  metadata: AgentLensElementMetadata,
  node: unknown
): void {
  if (!isAgentLensDevelopment()) {
    return;
  }

  registry.set(metadata.id, {
    metadata,
    node,
    mountedAt: ++mountSequence,
    lastMeasuredLayout: registry.get(metadata.id)?.lastMeasuredLayout
  });
}

export function unregisterAgentLensElement(id: string): void {
  registry.delete(id);
}

export function getAgentLensRegistryEntries(): AgentLensRegistryEntry[] {
  return Array.from(registry.values());
}

export async function measureAgentLensElement(
  id: string
): Promise<ElementLayout | null> {
  const entry = registry.get(id);

  if (!entry) {
    return null;
  }

  const layout =
    (await measureWithNodeMethod(entry.node as MeasurableNode)) ??
    (await measureWithUIManager(entry.node));

  if (layout) {
    entry.lastMeasuredLayout = layout;
  }

  return layout;
}

export async function findAgentLensElementAtPoint(
  x: number,
  y: number
): Promise<AgentLensSelectedElement | null> {
  if (!isAgentLensDevelopment()) {
    return null;
  }

  const measured = await Promise.all(
    getAgentLensRegistryEntries().map(async (entry) => {
      const layout = await measureAgentLensElement(entry.metadata.id);

      return layout
        ? {
            entry,
            layout,
            area: layout.width * layout.height
          }
        : null;
    })
  );

  const matches = measured
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(({ layout }) => containsPoint(layout, x, y))
    .sort((a, b) => {
      if (a.area !== b.area) {
        return a.area - b.area;
      }

      return b.entry.mountedAt - a.entry.mountedAt;
    });

  const selected = matches[0];

  if (!selected) {
    return null;
  }

  return {
    metadata: selected.entry.metadata,
    layout: selected.layout
  };
}

export function createAgentLensRef<T>(
  metadata: AgentLensElementMetadata,
  forwardedRef?: Ref<T>
): (node: T | null) => void {
  return (node) => {
    setForwardedRef(forwardedRef, node);

    if (node) {
      registerAgentLensElement(metadata, node);
      return;
    }

    unregisterAgentLensElement(metadata.id);
  };
}

export const __agentLensCreateRef = createAgentLensRef;

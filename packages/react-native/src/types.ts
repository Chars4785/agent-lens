import type { ReactNode } from "react";

export interface ElementLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AgentLensSourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface AgentLensElementMetadata {
  id: string;
  component: string;
  source: AgentLensSourceLocation;
}

export interface AgentLensRegistryEntry {
  instanceId: string;
  metadata: AgentLensElementMetadata;
  node: unknown;
  mountedAt: number;
  lastMeasuredLayout?: ElementLayout;
}

export interface AgentLensSelectedElement {
  instanceId?: string;
  metadata: AgentLensElementMetadata;
  layout: ElementLayout;
}

export interface AgentLensInspectionResult {
  selectedElement: AgentLensSelectedElement | null;
  registeredCount: number;
  measuredCount: number;
}

export interface AgentLensAnnotation {
  version: "0.1";
  component: string;
  source: AgentLensSourceLocation;
  layout: ElementLayout;
  feedback: string;
}

export interface AgentLensProps {
  children: ReactNode;
  enabled?: boolean;
}

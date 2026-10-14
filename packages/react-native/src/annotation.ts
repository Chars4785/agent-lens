import type {
  AgentLensAnnotation,
  AgentLensSelectedElement
} from "./types";

export function createAgentLensAnnotation(
  selectedElement: AgentLensSelectedElement,
  feedback: string
): AgentLensAnnotation {
  return {
    version: "0.1",
    component: selectedElement.metadata.component,
    source: selectedElement.metadata.source,
    layout: selectedElement.layout,
    feedback
  };
}

export function formatAgentLensAnnotation(
  annotation: AgentLensAnnotation
): string {
  return JSON.stringify(annotation, null, 2);
}

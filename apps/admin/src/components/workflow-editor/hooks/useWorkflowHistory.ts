import { useCallback, useRef } from "react";
import type { Edge, Node } from "@xyflow/react";

export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export function useWorkflowHistory() {
  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({
      nodes: currentNodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
      edges: currentEdges.map((e) => ({ ...e })),
    });
    historyIndexRef.current = historyRef.current.length - 1;
    // Cap history at 50 entries
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
  }, []);

  const canUndo = historyIndexRef.current >= 0;

  const undo = useCallback(
    (
      setNodes: (updater: Node[] | ((prev: Node[]) => Node[])) => void,
      setEdges: (updater: Edge[] | ((prev: Edge[]) => Edge[])) => void,
      onComplete?: () => void,
    ) => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        const state = historyRef.current[historyIndexRef.current];
        skipHistoryRef.current = true;
        setNodes(state.nodes.map((n) => ({ ...n })));
        setEdges(state.edges.map((e) => ({ ...e })));
        onComplete?.();
      } else if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        skipHistoryRef.current = true;
        setNodes([]);
        setEdges([]);
        onComplete?.();
      }
    },
    [],
  );

  const initialize = useCallback((nodes: Node[], edges: Edge[]) => {
    historyRef.current = [
      { nodes: nodes.map((n) => ({ ...n })), edges: edges.map((e) => ({ ...e })) },
    ];
    historyIndexRef.current = 0;
  }, []);

  return {
    historyRef,
    historyIndexRef,
    skipHistoryRef,
    pushHistory,
    canUndo,
    undo,
    initialize,
  };
}

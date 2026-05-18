import { useEffect } from "react";
import { toast } from "sonner";
import type { Edge, Node } from "@xyflow/react";

interface UseWorkflowKeyboardOptions {
  nodesRef: React.RefObject<Node[]>;
  edges: Edge[];
  selectedNodeIds: string[];
  copiedNodesRef: React.MutableRefObject<Node[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  _pushHistory: (nodes: Node[], edges: Edge[]) => void;
  undo: (
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
    onComplete?: () => void,
  ) => void;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleSave: () => void;
}

export function useWorkflowKeyboard(options: UseWorkflowKeyboardOptions) {
  const {
    nodesRef,
    edges,
    selectedNodeIds,
    copiedNodesRef,
    setNodes,
    setEdges,
    setIsDirty,
    _pushHistory,
    undo,
    setSelectedNodeIds,
    handleSave,
  } = options;

  // Keyboard shortcuts: copy / paste / delete / select-all / undo / save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        const selected = nodesRef.current.filter((n) => selectedNodeIds.includes(n.id));
        if (selected.length > 0) {
          copiedNodesRef.current = selected;
          toast.success(`已复制 ${selected.length} 个节点`);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        const copied = copiedNodesRef.current;
        if (copied.length === 0) return;
        const idMap = new Map<string, string>();
        const newNodes: Node[] = copied.map((n) => {
          const newId = `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          idMap.set(n.id, newId);
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + 30, y: n.position.y + 30 },
            selected: false,
          };
        });
        const newEdges: Edge[] = edges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => ({
            ...edge,
            id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}-${Date.now()}`,
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
          }));
        setIsDirty(true);
        _pushHistory(nodesRef.current, edges);
        setNodes((nds) => [...nds, ...newNodes]);
        if (newEdges.length > 0) setEdges((eds) => [...eds, ...newEdges]);
        toast.success(`已粘贴 ${copied.length} 个节点`);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeIds.length > 0) {
          setIsDirty(true);
          _pushHistory(nodesRef.current, edges);
          setNodes((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)));
          setEdges((eds) =>
            eds.filter(
              (e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target),
            ),
          );
          setSelectedNodeIds([]);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const allIds = nodesRef.current.map((n) => n.id);
        setSelectedNodeIds(allIds);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo(setNodes, setEdges, () => {
          setSelectedNodeIds([]);
          toast.success("已撤销");
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedNodeIds,
    setNodes,
    setEdges,
    setIsDirty,
    _pushHistory,
    edges,
    undo,
    setSelectedNodeIds,
    handleSave,
    nodesRef,
    copiedNodesRef,
  ]);
}

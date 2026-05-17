import { Handle, type HandleProps } from "@xyflow/react";

interface ClickableHandleProps extends HandleProps {
  nodeId: string;
  onAddNode?: (
    nodeId: string,
    handleId?: string,
    handleType?: "target" | "source",
    edgeX?: number,
    edgeY?: number,
  ) => void;
}

export default function ClickableHandle({ nodeId, onAddNode, ...props }: ClickableHandleProps) {
  return (
    <Handle
      {...props}
      isConnectableStart={true}
      isConnectableEnd={true}
      className={props.className}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const edgeX = props.type === "source" ? rect.right : rect.left;
        onAddNode?.(
          nodeId,
          props.id ?? undefined,
          props.type as "target" | "source",
          edgeX,
          rect.top + rect.height / 2,
        );
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        const computed = getComputedStyle(el).transform;
        el.dataset.origTransform = computed;
        el.style.transform = computed === "none" ? "scale(1.4)" : computed + " scale(1.4)";
        el.style.transition = "transform 0.15s ease";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        const orig = el.dataset.origTransform;
        el.style.transform = orig === "none" ? "" : orig || "";
        el.style.transition = "";
      }}
    />
  );
}

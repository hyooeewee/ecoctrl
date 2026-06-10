/**
 * Workflow Canvas Page — Full-screen workflow editor
 */
import { useState, useCallback, useEffect } from "react";
import { WorkflowCanvas } from "@/components/workflow-editor";
import { useAppStore } from "@/store/appStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ecoctrl/ui/dialog";
import { Button } from "@ecoctrl/ui/button";

export default function WorkflowCanvasPage() {
  const workflowId = useAppStore((state) => state.canvasWorkflowId);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setCanvasWorkflowId = useAppStore((state) => state.setCanvasWorkflowId);

  const [canvasDirty, setCanvasDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleBack = useCallback(() => {
    if (canvasDirty) {
      setShowLeaveDialog(true);
    } else {
      setCanvasWorkflowId(null);
      setActiveTab("workflows");
    }
  }, [canvasDirty, setCanvasWorkflowId, setActiveTab]);

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveDialog(false);
    setCanvasWorkflowId(null);
    setActiveTab("workflows");
  }, [setCanvasWorkflowId, setActiveTab]);

  const handleLeaveCancel = useCallback(() => {
    setShowLeaveDialog(false);
  }, []);

  useEffect(() => {
    if (!workflowId) {
      setActiveTab("workflows");
    }
  }, [workflowId, setActiveTab]);

  if (!workflowId) {
    return null;
  }

  return (
    <>
      <WorkflowCanvas workflowId={workflowId} onBack={handleBack} onDirtyChange={setCanvasDirty} />

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认离开</DialogTitle>
            <DialogDescription>有未保存的修改，离开后将丢失。是否继续？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleLeaveCancel}>
              留在当前页面
            </Button>
            <Button variant="destructive" onClick={handleLeaveConfirm}>
              离开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

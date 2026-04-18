import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ExportDialogProps {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  defaultFileName: string;
  defaultFormat?: string;
  defaultOperator?: string;
  onExport: (values: { fileName: string; format: string; operator: string }) => void;
}

export default function ExportDialog({
  trigger,
  title,
  description,
  defaultFileName,
  defaultFormat = "PDF",
  defaultOperator = "系统管理员",
  onExport,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState(defaultFileName);
  const [format, setFormat] = useState(defaultFormat);
  const [operator, setOperator] = useState(defaultOperator);

  const handleConfirm = () => {
    onExport({ fileName, format, operator });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 p-4 pl-[17px]">
          <div className="grid gap-2">
            <Label htmlFor="reportName">报表名称</Label>
            <Input
              id="reportName"
              placeholder={defaultFileName}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="exportFormat">导出格式</Label>
            <Input
              id="exportFormat"
              placeholder="PDF / EXCEL / CSV"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="operator">操作人</Label>
            <Input
              id="operator"
              placeholder="系统管理员"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleConfirm}>
            确认导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

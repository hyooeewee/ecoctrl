import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, FileText } from "lucide-react";

export interface TemplateDialogProps {
  trigger: React.ReactElement;
  initialTemplates: string[];
  onChange: (templates: string[]) => void;
}

export default function TemplateDialog({
  trigger,
  initialTemplates,
  onChange,
}: TemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<string[]>(initialTemplates);
  const [newTemplate, setNewTemplate] = useState("");

  const handleAdd = () => {
    const trimmed = newTemplate.trim();
    if (!trimmed || templates.includes(trimmed)) return;
    const next = [...templates, trimmed];
    setTemplates(next);
    onChange(next);
    setNewTemplate("");
  };

  const handleDelete = (name: string) => {
    const next = templates.filter((t) => t !== name);
    setTemplates(next);
    onChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管理报表模板</DialogTitle>
          <DialogDescription>维护系统内置的常用报表模板列表。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-4 pl-[17px]">
          <div className="flex items-end gap-2">
            <div className="flex-1 grid gap-2">
              <Label htmlFor="newTemplate">新增模板</Label>
              <Input
                id="newTemplate"
                placeholder="输入模板名称..."
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
            </div>
            <Button onClick={handleAdd}>添加</Button>
          </div>
          <div className="border rounded-md overflow-hidden">
            {templates.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">暂无模板</div>
            ) : (
              <ul className="divide-y">
                {templates.map((t) => (
                  <li
                    key={t}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText size={14} className="text-muted-foreground" />
                      <span>{t}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(t)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

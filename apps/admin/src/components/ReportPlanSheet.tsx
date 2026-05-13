import React, { useState } from "react";

import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import AppButton from "@/components/AppButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@ecoctrl/ui";

import type { ReportPlan } from "@ecoctrl/shared";

interface ReportPlanSheetProps {
  trigger: React.ReactElement;
  onSave: (plan: ReportPlan) => void;
}

const FREQUENCY_OPTIONS = ["每天", "每周一", "每周五", "每月 1 日", "每月末"];

export default function ReportPlanSheet({ trigger, onSave }: ReportPlanSheetProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [receiver, setReceiver] = useState("");
  const [frequency, setFrequency] = useState("每周一");
  const [status, setStatus] = useState(true);

  const handleSubmit = () => {
    if (!name.trim() || !receiver.trim() || !frequency) return;
    onSave({
      id: Date.now().toString(),
      name: name.trim(),
      receiver: receiver.trim(),
      frequency,
      status,
    });
    setName("");
    setReceiver("");
    setFrequency("每周一");
    setStatus(true);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>新建定时任务</SheetTitle>
          <SheetDescription>
            配置周期性自动报表任务，系统将按设定频率发送至指定邮箱。
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 py-6">
          <div className="grid space-y-2">
            <Label htmlFor="plan-name">报表名称</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：周度能耗报表"
            />
          </div>
          <div className="grid space-y-2">
            <Label htmlFor="plan-receiver">收件人邮箱</Label>
            <Input
              id="plan-receiver"
              type="email"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="admin@energy.com"
            />
          </div>
          <div className="grid space-y-2">
            <Label htmlFor="plan-frequency">发送频率</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v ?? "")}>
              <SelectTrigger id="plan-frequency">
                <SelectValue placeholder="选择发送频率" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid space-y-2">
            <Label>初始状态</Label>
            <div className="flex items-center gap-3">
              <AppButton
                type="button"
                level={status ? "action" : "secondary"}
                className="flex-1"
                onClick={() => setStatus(true)}
              >
                启用
              </AppButton>
              <AppButton
                type="button"
                level={!status ? "action" : "secondary"}
                className="flex-1"
                onClick={() => setStatus(false)}
              >
                停用
              </AppButton>
            </div>
          </div>
        </div>
        <SheetFooter>
          <AppButton level="action" type="button" className="w-full" onClick={handleSubmit}>
            确认创建
          </AppButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

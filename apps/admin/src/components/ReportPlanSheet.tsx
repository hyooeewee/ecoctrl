import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

import { ReportPlan } from "../types";

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
              <Button
                type="button"
                variant={status ? "default" : "outline"}
                className="flex-1"
                onClick={() => setStatus(true)}
              >
                启用
              </Button>
              <Button
                type="button"
                variant={!status ? "default" : "outline"}
                className="flex-1"
                onClick={() => setStatus(false)}
              >
                停用
              </Button>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button type="button" className="w-full" onClick={handleSubmit}>
            确认创建
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

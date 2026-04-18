import { Save } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function SystemConfig() {
  const handleSave = () => {
    console.log("Saving system configurations...");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">系统配置</h1>
      </div>

      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <CardTitle className="text-foreground text-base font-bold">基础设置</CardTitle>
          <CardDescription className="text-xs">配置能耗管理平台的全局属性。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="platform-name"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                平台名称
              </Label>
              <Input
                id="platform-name"
                defaultValue="EcoCtrl 能管平台"
                className="bg-muted/30 border-border focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="refresh-interval"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                数据刷新间隔 (秒)
              </Label>
              <Select defaultValue="30">
                <SelectTrigger id="refresh-interval" className="bg-muted/30 border-border">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 秒</SelectItem>
                  <SelectItem value="30">30 秒</SelectItem>
                  <SelectItem value="60">1 分钟</SelectItem>
                  <SelectItem value="300">5 分钟</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-border/50 space-y-5 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">启用实时告警推送</Label>
                <p className="text-muted-foreground text-xs">
                  当设备发生严重故障时，系统会自动发送桌面通知。
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">深色模式跟随系统</Label>
                <p className="text-muted-foreground text-xs">
                  自动根据操作系统的显示偏好切换应用主题。
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-border/50 bg-muted/20 flex justify-end border-t px-6 py-6">
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 shadow-primary/20 gap-2 px-6 font-semibold text-white shadow-sm"
          >
            <Save size={18} />
            保存配置
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border bg-card border-l-primary/30 overflow-hidden border border-l-4 shadow-sm">
        <CardHeader className="px-6">
          <CardTitle className="text-foreground text-base font-bold">高级选项</CardTitle>
          <CardDescription className="text-xs">涉及到系统核心逻辑，请谨慎修改。</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Button
            variant="outline"
            className="text-destructive border-destructive/20 hover:bg-destructive/5 text-xs font-semibold text-nowrap"
          >
            重置数据库索引
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

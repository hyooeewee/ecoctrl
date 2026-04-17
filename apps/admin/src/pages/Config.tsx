import React from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export default function SystemConfig() {
  const handleSave = () => {
    console.log("Saving system configurations...");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">系统配置</h1>
      </div>

      <Card className="border border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="border-b border-border/50 px-6">
          <CardTitle className="text-base font-bold text-foreground">基础设置</CardTitle>
          <CardDescription className="text-xs">配置能耗管理平台的全局属性。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="platform-name"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
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
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
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

          <div className="space-y-5 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">启用实时告警推送</Label>
                <p className="text-xs text-muted-foreground">
                  当设备发生严重故障时，系统会自动发送桌面通知。
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">深色模式跟随系统</Label>
                <p className="text-xs text-muted-foreground">
                  自动根据操作系统的显示偏好切换应用主题。
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end py-6 px-6 border-t border-border/50 bg-muted/20">
          <Button
            onClick={handleSave}
            className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/20 font-semibold px-6"
          >
            <Save size={18} />
            保存配置
          </Button>
        </CardFooter>
      </Card>

      <Card className="border border-border shadow-sm bg-card overflow-hidden border-l-4 border-l-primary/30">
        <CardHeader className="px-6">
          <CardTitle className="text-base font-bold text-foreground">高级选项</CardTitle>
          <CardDescription className="text-xs">涉及到系统核心逻辑，请谨慎修改。</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Button
            variant="outline"
            className="text-destructive border-destructive/20 hover:bg-destructive/5 font-semibold text-xs text-nowrap"
          >
            重置数据库索引
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

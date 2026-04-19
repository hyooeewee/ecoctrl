import { Save } from "lucide-react";
import React, { useEffect, useState } from "react";

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

import { SystemConfig } from "../types";
import { systemConfigApi } from "../api/systemConfig";

export default function SystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await systemConfigApi.get();
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await systemConfigApi.update(config);
    } catch (err) {
      console.error(err);
      alert("保存配置失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">加载中...</div>
    );
  }

  const currentConfig = config ?? {
    platformName: "",
    refreshInterval: 30,
    realtimeAlertEnabled: false,
    darkModeFollowSystem: false,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
                value={currentConfig.platformName}
                onChange={(e) =>
                  setConfig((prev) => (prev ? { ...prev, platformName: e.target.value } : prev))
                }
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
              <Select
                value={String(currentConfig.refreshInterval)}
                onValueChange={(v) =>
                  setConfig((prev) => (prev ? { ...prev, refreshInterval: Number(v) } : prev))
                }
              >
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
              <Switch
                checked={currentConfig.realtimeAlertEnabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => (prev ? { ...prev, realtimeAlertEnabled: checked } : prev))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">深色模式跟随系统</Label>
                <p className="text-muted-foreground text-xs">
                  自动根据操作系统的显示偏好切换应用主题。
                </p>
              </div>
              <Switch
                checked={currentConfig.darkModeFollowSystem}
                onCheckedChange={(checked) =>
                  setConfig((prev) => (prev ? { ...prev, darkModeFollowSystem: checked } : prev))
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-border/50 bg-muted/20 flex justify-end border-t px-6 py-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 shadow-primary/20 gap-2 px-6 font-semibold text-white shadow-sm"
          >
            <Save size={18} />
            {saving ? "保存中..." : "保存配置"}
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

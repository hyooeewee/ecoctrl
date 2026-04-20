import { Upload, MapPin, Tag } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui";

import { ThreeDConfig } from "../types";
import { threeDConfigApi } from "../api/3dConfig";

export default function ThreeDConfig() {
  const [config, setConfig] = useState<ThreeDConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await threeDConfigApi.get();
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-none shadow-sm lg:col-span-1">
          <CardHeader className="px-6">
            <CardTitle className="text-lg">模型上传与显示</CardTitle>
            <CardDescription>配置模型的基础加载参数和渲染风格。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 text-center">
              <Upload className="text-muted-foreground" size={32} />
              <div>
                <p className="text-sm font-medium text-foreground">点击或将模型文件拖拽至此</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 OBJ, GLB, GLTF 格式 (最大 50MB)
                </p>
              </div>
              <Button variant="outline" size="sm">
                选择文件
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预设视角</span>
                <span className="font-mono text-xs">{config?.cameraPreset ?? "--"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">环境光强度</span>
                <span className="font-mono text-xs">{config?.ambientLightIntensity ?? "--"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full border-none shadow-sm lg:col-span-2">
          <Tabs defaultValue="hotspots" className="flex h-full flex-col">
            <div className="px-6 pt-4">
              <TabsList>
                <TabsTrigger value="hotspots" className="gap-2">
                  <MapPin size={14} />
                  热点区域配置
                </TabsTrigger>
                <TabsTrigger value="labels" className="gap-2">
                  <Tag size={14} />
                  标签配置
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="hotspots" className="flex-1 p-6">
              <div className="relative flex h-full min-h-[400px] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                ></div>
                <p className="z-10 text-sm font-medium text-muted-foreground italic">
                  热点区域配置面板（演示静态效果）
                </p>
              </div>
            </TabsContent>

            <TabsContent value="labels" className="flex-1 p-6">
              <div className="relative flex h-full min-h-[400px] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                ></div>
                <p className="z-10 text-sm font-medium text-muted-foreground italic">
                  标签配置面板（演示静态效果）
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

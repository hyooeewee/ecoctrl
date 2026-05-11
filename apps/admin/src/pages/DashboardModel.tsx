import { MapPin, Tag } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui";

import { useSubBreadcrumb } from "@/hooks/useSubBreadcrumb";
import type { DashboardModelConfig } from "@ecoctrl/shared";
import { dashboardModelApi } from "../api/dashboardModel";
import ModelFileZone from "@/components/ModelFileZone";

export default function DashboardModel() {
  const [config, setConfig] = useState<DashboardModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("hotspots");
  const { setSubLabel } = useSubBreadcrumb();

  useEffect(() => {
    const labels: Record<string, string> = {
      hotspots: "热点配置",
      labels: "标签配置",
    };
    setSubLabel(labels[activeTab] ?? null);
  }, [activeTab, setSubLabel]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await dashboardModelApi.get();
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const updated = await dashboardModelApi.upload(uploadFile);
      setConfig(updated);
      setUploadFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const existingFileInfo = config?.modelFileUrl
    ? {
        name: config.modelFileUrl.split("/").pop() ?? "未知",
        size: "-",
        format: (config.modelFileUrl.split(".").pop() ?? "").toUpperCase(),
      }
    : null;

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
            <CardDescription>配置大屏首页加载的3D模型文件。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            <ModelFileZone
              file={uploadFile}
              existingInfo={existingFileInfo}
              onFileSelect={setUploadFile}
              onFileClear={() => setUploadFile(null)}
              acceptedFormats=".glb,.gltf,.obj"
            />

            {uploadFile && (
              <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                {uploading ? "上传中..." : "确认上传"}
              </Button>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">当前模型</span>
                <span className="font-mono text-xs truncate max-w-[180px]">
                  {config?.modelFileUrl?.split("/").pop() ?? "未配置"}
                </span>
              </div>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
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

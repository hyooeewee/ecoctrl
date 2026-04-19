import { Box, Layers, Image as ImageIcon, ExternalLink, FileText } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Model3D } from "../types";
import { modelsApi } from "../api/models";

export default function Models() {
  const [models, setModels] = useState<Model3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewModel, setPreviewModel] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await modelsApi.list();
        setModels(data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="models" className="flex items-center gap-2 px-6">
            <Box size={16} />
            模型资源
          </TabsTrigger>
          <TabsTrigger value="objects" className="flex items-center gap-2 px-6">
            <Layers size={16} />
            业务对象
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-6 pb-4">
              <CardTitle>模型资源</CardTitle>
              <CardDescription>展示系统中已导入的所有 3D 资产模型。</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : error ? (
                <div className="flex h-64 items-center justify-center text-sm text-red-400">
                  数据加载失败，请稍后重试
                </div>
              ) : models.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  暂无模型数据
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {models.map((model) => (
                    <Card
                      key={model.id}
                      className="group relative cursor-pointer transition-colors hover:border-blue-200"
                    >
                      <div className="border-border/50 relative flex aspect-video items-center justify-center overflow-hidden border-b bg-muted">
                        {model.thumbnailUrl ? (
                          <img
                            src={model.thumbnailUrl}
                            alt={model.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground/40 transition-transform group-hover:scale-110" />
                        )}
                        <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent"></div>

                        {/* Navigate/Arrow button */}
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          className="border-border absolute top-2 right-2 z-10 h-8 w-8 rounded-full border bg-background/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-background hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModel(model.name);
                          }}
                        >
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                      <CardContent className="px-4 py-3">
                        <p className="text-sm font-semibold">{model.name}</p>
                        <p className="mt-1 text-xs text-nowrap text-muted-foreground">
                          {model.version} / {model.format} / {model.size}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="mt-0">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted p-20">
            <div className="text-center">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">对象列表暂无数据</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击"新增对象"按钮开始管理系统资产。
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewModel} onOpenChange={(open) => !open && setPreviewModel(null)}>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-blue-600" size={18} />
              模型技术文档预览: {previewModel}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted p-4">
            <div className="relative flex h-full w-full items-center justify-center rounded-lg border border-border bg-background shadow-inner">
              {/* Simulating a PDF viewer */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="relative flex h-80 w-64 items-center justify-center overflow-hidden rounded border-2 border-dashed border-border bg-muted">
                  <div className="absolute top-0 left-0 h-2 w-full bg-blue-500/20"></div>
                  <FileText size={48} className="opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">PDF 预览加载中...</p>
                  <p className="text-xs">正在渲染技术规格书与维保手册</p>
                </div>
              </div>
              {/* In a real app, this would be:
                  <iframe src={`/docs/${previewModel}.pdf`} className="w-full h-full" />
               */}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

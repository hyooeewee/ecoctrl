import { Box, Layers, Image as ImageIcon, ExternalLink, FileText } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Models() {
  const [previewModel, setPreviewModel] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-6 bg-gray-100/80 p-1">
          <TabsTrigger
            value="models"
            className="flex items-center gap-2 px-6 data-selected:bg-white data-selected:shadow-sm"
          >
            <Box size={16} />
            模型资源
          </TabsTrigger>
          <TabsTrigger
            value="objects"
            className="flex items-center gap-2 px-6 text-gray-500 data-selected:bg-white data-selected:shadow-sm"
          >
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card
                    key={i}
                    className="group relative cursor-pointer transition-colors hover:border-blue-200"
                  >
                    <div className="border-border/50 relative flex aspect-video items-center justify-center overflow-hidden border-b bg-gray-100">
                      <ImageIcon className="h-12 w-12 text-gray-300 transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent"></div>

                      {/* Navigate/Arrow button */}
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="border-border absolute top-2 right-2 z-10 h-8 w-8 rounded-full border bg-white/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white hover:text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModel(`冷却塔模型_${i}`);
                        }}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                    <CardContent className="px-4 py-3">
                      <p className="text-sm font-semibold">冷却塔模型_{i}</p>
                      <p className="mt-1 text-xs text-nowrap text-gray-500">v2.1 / GLB / 12.4MB</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="mt-0">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-20">
            <div className="text-center">
              <Layers className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">对象列表暂无数据</h3>
              <p className="mt-1 text-sm text-gray-500">点击“新增对象”按钮开始管理系统资产。</p>
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
          <div className="flex-1 bg-gray-100 p-4">
            <div className="relative flex h-full w-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-inner">
              {/* Simulating a PDF viewer */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400">
                <div className="relative flex h-80 w-64 items-center justify-center overflow-hidden rounded border-2 border-dashed border-gray-300 bg-gray-50">
                  <div className="absolute top-0 left-0 h-2 w-full bg-blue-500/20"></div>
                  <FileText size={48} className="opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">PDF 预览加载中...</p>
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

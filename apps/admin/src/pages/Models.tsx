import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, Layers, Image as ImageIcon, ExternalLink, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Models() {
  const [previewModel, setPreviewModel] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">模型与对象管理</h1>
      </div>

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-6 bg-gray-100/80 p-1">
          <TabsTrigger
            value="models"
            className="px-6 flex gap-2 items-center data-selected:bg-white data-selected:shadow-sm"
          >
            <Box size={16} />
            模型资源
          </TabsTrigger>
          <TabsTrigger
            value="objects"
            className="px-6 flex gap-2 items-center data-selected:bg-white data-selected:shadow-sm text-gray-500"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card
                    key={i}
                    className="group cursor-pointer hover:border-blue-200 transition-colors relative"
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative border-b border-border/50">
                      <ImageIcon className="text-gray-300 w-12 h-12 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>

                      {/* Navigate/Arrow button */}
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-border shadow-sm hover:bg-white hover:text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModel(`冷却塔模型_${i}`);
                        }}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                    <CardContent className="px-4 py-3">
                      <p className="font-semibold text-sm">冷却塔模型_{i}</p>
                      <p className="text-xs text-gray-500 mt-1 text-nowrap">v2.1 / GLB / 12.4MB</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="mt-0">
          <div className="flex items-center justify-center p-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-center">
              <Layers className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">对象列表暂无数据</h3>
              <p className="mt-1 text-sm text-gray-500">点击“新增对象”按钮开始管理系统资产。</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewModel} onOpenChange={(open) => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-blue-600" size={18} />
              模型技术文档预览: {previewModel}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gray-100 p-4">
            <div className="w-full h-full bg-white rounded-lg shadow-inner flex items-center justify-center border border-gray-200 relative">
              {/* Simulating a PDF viewer */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400">
                <div className="w-64 h-80 border-2 border-dashed border-gray-300 rounded flex items-center justify-center relative overflow-hidden bg-gray-50">
                  <div className="absolute top-0 left-0 w-full h-2 bg-blue-500/20"></div>
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

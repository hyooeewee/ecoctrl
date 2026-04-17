import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, MapPin, Tag } from 'lucide-react';

export default function ThreeDConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">3D 模型设置</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-sm">
          <CardHeader className="px-6">
            <CardTitle className="text-lg">模型上传与显示</CardTitle>
            <CardDescription>配置模型的基础加载参数和渲染风格。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 bg-gray-50/50">
               <Upload className="text-gray-400" size={32} />
               <div>
                 <p className="text-sm font-medium text-gray-900">点击或将模型文件拖拽至此</p>
                 <p className="text-xs text-gray-500 mt-1">支持 OBJ, GLB, GLTF 格式 (最大 50MB)</p>
               </div>
               <Button variant="outline" size="sm">选择文件</Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">预设视角</span>
                <span className="font-mono text-xs">Default_View_01</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">环境光强度</span>
                <span className="font-mono text-xs">0.85</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm h-full">
           <Tabs defaultValue="hotspots" className="h-full flex flex-col">
              <div className="px-6 pt-4">
                <TabsList className="bg-gray-100">
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
                <div className="h-full min-h-[400px] w-full bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  <p className="text-sm font-medium text-gray-400 italic z-10">热点区域配置面板（演示静态效果）</p>
                </div>
              </TabsContent>

              <TabsContent value="labels" className="flex-1 p-6">
                <div className="h-full min-h-[400px] w-full bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  <p className="text-sm font-medium text-gray-400 italic z-10">标签配置面板（演示静态效果）</p>
                </div>
              </TabsContent>
           </Tabs>
        </Card>
      </div>
    </div>
  );
}

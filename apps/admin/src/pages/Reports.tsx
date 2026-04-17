import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileDown, PlusCircle, Settings2, CalendarDays, ExternalLink } from "lucide-react";
import { REPORT_PLANS } from "../constants/mockData";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">报表管理</h1>
          <p className="text-muted-foreground text-sm">自动化数据分析与定期报表分发系统。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => console.log("Manage report templates...")}
          >
            <Settings2 size={16} />
            管理模板
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => console.log("New scheduled report task...")}
          >
            <PlusCircle size={16} />
            新建定时任务
          </Button>
          <Button className="gap-2" onClick={() => console.log("Export current data...")}>
            <FileDown size={16} />
            导出当前数据
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white px-6">
          <CardTitle className="text-lg">定时发送计划</CardTitle>
          <CardDescription>配置自动生成的周期性数据概览并发送至指定邮箱。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[30%] px-6">报表名称</TableHead>
                <TableHead>收件人</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-gray-400" />
                    发送频率
                  </div>
                </TableHead>
                <TableHead className="text-right pr-6">状态控制</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REPORT_PLANS.map((plan) => (
                <TableRow key={plan.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium px-6">{plan.name}</TableCell>
                  <TableCell
                    className="text-blue-600 underline underline-offset-4 cursor-pointer text-sm"
                    onClick={() => console.log("Edit receiver for:", plan.name)}
                  >
                    {plan.receiver}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{plan.frequency}</TableCell>
                  <TableCell className="text-right">
                    <Switch
                      defaultChecked={plan.status}
                      onCheckedChange={(checked) =>
                        console.log(`Switch plan ${plan.name} status to:`, checked)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "能耗日报", icon: "📄", count: "1,245 份" },
          { label: "故障分析月报", icon: "📊", count: "48 份" },
          { label: "系统审计简报", icon: "🔍", count: "12 份" },
        ].map((stat, i) => (
          <Card
            key={i}
            className="border-none shadow-sm hover:translate-y-[-2px] transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="text-3xl">{stat.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.count}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 text-gray-300">
                <ExternalLink size={14} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

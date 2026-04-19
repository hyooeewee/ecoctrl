import { FileDown, PlusCircle, Settings2, CalendarDays, ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import ExportDialog from "../components/ExportDialog";
import ReportPlanSheet from "../components/ReportPlanSheet";
import TemplateDialog from "../components/TemplateDialog";
import { ReportPlan, ReportTemplate } from "../types";
import { reportsApi } from "../api/reports";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="scrollbar-hide relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export default function Reports() {
  const [reportPlans, setReportPlans] = useState<ReportPlan[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [plansData, templatesData] = await Promise.all([
        reportsApi.plans.list(),
        reportsApi.templates(),
      ]);
      setReportPlans(plansData);
      setTemplates(templatesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = (fileName: string) => {
    const headers = ["报表名称", "收件人", "发送频率", "状态"];
    const csvContent = [
      headers.join(","),
      ...reportPlans.map((plan) =>
        [
          `"${plan.name}"`,
          `"${plan.receiver}"`,
          `"${plan.frequency}"`,
          plan.status ? "启用" : "停用",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddPlan = async (plan: Omit<ReportPlan, "id">) => {
    try {
      await reportsApi.plans.create(plan);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("添加计划失败");
    }
  };

  const handleTogglePlan = async (id: string, checked: boolean) => {
    try {
      await reportsApi.plans.update(id, { status: checked });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("更新状态失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <TemplateDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Settings2 size={16} />
                管理模板
              </Button>
            }
            initialTemplates={templates.map((t) => t.name)}
            onChange={(names) =>
              setTemplates((prev) =>
                names.map(
                  (name) =>
                    prev.find((t) => t.name === name) ?? { name, count: "0 份", icon: "📄" },
                ),
              )
            }
          />
          <ReportPlanSheet
            trigger={
              <Button variant="outline" className="gap-2">
                <PlusCircle size={16} />
                新建定时任务
              </Button>
            }
            onSave={handleAddPlan}
          />
          <ExportDialog
            trigger={
              <Button className="gap-2">
                <FileDown size={16} />
                导出当前数据
              </Button>
            }
            title="导出报表数据"
            description="请确认导出信息，系统将生成包含当前所有定时计划的文件。"
            defaultFileName={`报表数据_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`}
            defaultFormat="CSV"
            defaultOperator="系统管理员"
            onExport={({ fileName }) => handleExport(fileName)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="bg-white px-6">
          <CardTitle className="text-lg">定时发送计划</CardTitle>
          <CardDescription>配置自动生成的周期性数据概览并发送至指定邮箱。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
          ) : (
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
                  <TableHead className="pr-6 text-right">状态控制</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportPlans.map((plan) => (
                  <TableRow key={plan.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="px-6 font-medium">{plan.name}</TableCell>
                    <TableCell
                      className="cursor-pointer text-sm text-blue-600 underline underline-offset-4"
                      onClick={() => console.log("Edit receiver for:", plan.name)}
                    >
                      {plan.receiver}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{plan.frequency}</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={plan.status}
                        onCheckedChange={(checked) => handleTogglePlan(plan.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {reportPlans.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      暂无定时计划
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.name}
            className="group relative cursor-pointer overflow-hidden border-none shadow-sm transition-all hover:translate-y-[-2px]"
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="text-3xl">{template.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">{template.name}</p>
                <p className="text-xl font-bold">{template.count}</p>
              </div>
              <div className="absolute top-2 right-2 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
                <ExternalLink size={14} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

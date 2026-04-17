import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, ShieldAlert, Trash2, Download } from "lucide-react";
import { USERS } from "../constants/mockData";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

export default function Accounts() {
  const handleExport = () => {
    const headers = ["姓名", "角色", "状态", "最后登录"];
    const csvContent = [
      headers.join(","),
      ...USERS.map((user) =>
        [
          `"${user.name}"`,
          `"${user.role}"`,
          user.status === "active" ? "在线" : "离线",
          `"${user.lastLogin}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `用户列表_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">账户控制</h1>
          <p className="text-muted-foreground text-sm">
            管理平台用户列表、角色分配及系统权限控制。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download size={18} />
            导出表格
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button className="gap-2">
                  <Plus size={18} />
                  新增账户
                </Button>
              }
            />
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>创建新账户</SheetTitle>
                <SheetDescription>
                  为系统添加新用户。在提交前请确保已分配正确的角色。
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-6 px-4">
                <div className="grid space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input id="name" placeholder="请输入真实姓名" />
                </div>
                <div className="grid space-y-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input id="email" placeholder="example@energy.com" />
                </div>
                <div className="grid space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <Input id="role" placeholder="运维工程师" />
                </div>
              </div>
              <SheetFooter>
                <Button
                  type="submit"
                  className="w-full"
                  onClick={() => console.log("Creating new account...")}
                >
                  确认创建
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white px-6 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="搜索账户姓名或角色..."
                className="pl-9 h-10 border-gray-200"
              />
            </div>
            <Button variant="outline" className="h-10">
              筛选
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-b border-gray-100">
                <TableHead className="w-[200px] px-6 font-semibold text-gray-600">姓名</TableHead>
                <TableHead className="font-semibold text-gray-600">角色</TableHead>
                <TableHead className="font-semibold text-gray-600">状态</TableHead>
                <TableHead className="font-semibold text-gray-600">最后登录</TableHead>
                <TableHead className="text-right pr-6 font-semibold text-gray-600">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {USERS.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium px-6">{user.name}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {user.status === "active" ? "在线" : "离线"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm italic">{user.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="编辑"
                        onClick={() => console.log("Edit user:", user.name)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="权限分配"
                        onClick={() => console.log("Assign permissions for:", user.name)}
                      >
                        <ShieldAlert size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="删除"
                        onClick={() => {
                          if (window.confirm(`确定要删除用户 "${user.name}" 吗？`)) {
                            console.log("Delete user:", user.name);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

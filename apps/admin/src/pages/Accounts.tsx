import { Plus, Search, Edit2, ShieldAlert, Trash2, Download } from "lucide-react";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import ExportDialog from "../components/ExportDialog";
import UserSheet from "../components/UserSheet";
import { USERS as INITIAL_USERS } from "../constants/mockData";
import { User } from "../types";

export default function Accounts() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const handleExport = (fileName: string) => {
    const headers = ["姓名", "邮箱", "角色", "状态", "最后登录"];
    const csvContent = [
      headers.join(","),
      ...users.map((user) =>
        [
          `"${user.name}"`,
          `"${user.email}"`,
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
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreate = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const handleEdit = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确定要删除用户 "${name}" 吗？`)) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">账户控制</h1>
          <p className="text-muted-foreground text-sm">
            管理平台用户列表、角色分配及系统权限控制。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Download size={18} />
                导出表格
              </Button>
            }
            title="导出用户列表"
            description="请确认报表导出信息，系统将根据选定参数生成文件。"
            defaultFileName={`用户列表_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`}
            defaultFormat="CSV"
            defaultOperator="系统管理员"
            onExport={({ fileName }) => handleExport(fileName)}
          />

          <UserSheet
            mode="create"
            trigger={
              <Button className="gap-2">
                <Plus size={18} />
                新增账户
              </Button>
            }
            onSave={handleCreate}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="border-b border-gray-50 bg-white px-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="搜索账户姓名或角色..."
                className="h-10 border-gray-200 pl-9"
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
                <TableHead className="font-semibold text-gray-600">邮箱</TableHead>
                <TableHead className="font-semibold text-gray-600">角色</TableHead>
                <TableHead className="font-semibold text-gray-600">状态</TableHead>
                <TableHead className="font-semibold text-gray-600">最后登录</TableHead>
                <TableHead className="pr-6 text-right font-semibold text-gray-600">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50">
                  <TableCell className="px-6 font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
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
                  <TableCell className="text-sm text-gray-500 italic">{user.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <UserSheet
                        mode="edit"
                        user={user}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            title="编辑"
                          >
                            <Edit2 size={16} />
                          </Button>
                        }
                        onSave={handleEdit}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                        title="权限分配"
                        onClick={() => console.log("Assign permissions for:", user.name)}
                      >
                        <ShieldAlert size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="删除"
                        onClick={() => handleDelete(user.id, user.name)}
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

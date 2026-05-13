import { Plus, Search, Edit2, Trash2, Download, ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@ecoctrl/ui";
import { Button } from "@ecoctrl/ui";
import AppButton from "@/components/AppButton";
import { Card, CardContent, CardHeader, CardTitle } from "@ecoctrl/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui";

import ExportDialog from "../components/ExportDialog";
import UserSheet from "../components/UserSheet";
import { authApi } from "../api/auth";
import { usersApi } from "../api/users";
import type { User, UserRole } from "@ecoctrl/shared";
import { USER_ROLE_LIST } from "@ecoctrl/shared";

export default function Accounts() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "viewer" });
  const [adding, setAdding] = useState(false);
  const [currentUser, setCurrentUser] = useState<Pick<User, "username" | "avatarUrl"> | null>(null);

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    online: { label: "在线", color: "bg-green-500" },
    offline: { label: "离线", color: "bg-muted-foreground" },
    disabled: { label: "禁用", color: "bg-red-500" },
    busy: { label: "繁忙", color: "bg-orange-500" },
  };

  const getStatus = (status: string) => STATUS_MAP[status] ?? STATUS_MAP.offline;

  const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: "超级管理员",
    admin: "管理员",
    operator: "运维工程师",
    analyst: "分析师",
    viewer: "查看员",
  };

  const fetchUsers = async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const fetchCurrentUser = async () => {
      try {
        const data = await authApi.me();
        setCurrentUser(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleAdd = async () => {
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.role) return;
    setAdding(true);
    try {
      await usersApi.create(newUser);
      await fetchUsers();
      setShowAdd(false);
      setNewUser({ username: "", email: "", password: "", role: "viewer" });
    } catch (err) {
      console.error(err);
      alert("添加用户失败");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!window.confirm(`确定要删除用户 "${username}" 吗？`)) return;
    try {
      await usersApi.delete(id);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert("删除用户失败");
    }
  };

  const handleEdit = async (user: User) => {
    try {
      await usersApi.update(user.id, user);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert("修改用户失败");
    }
  };

  const handleExport = (fileName: string) => {
    const headers = ["用户名", "邮箱", "角色", "状态", "最后登录时间"];
    const csvContent = [
      headers.join(","),
      ...filtered.map((user) =>
        [
          `"${user.username}"`,
          `"${user.email}"`,
          `"${user.role}"`,
          getStatus(user.status).label,
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

  const filtered = users.filter(
    (u) => u.username.includes(search) || u.email.includes(search) || u.role.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <AppButton level="action" className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={18} />
            新增用户
          </AppButton>
          <ExportDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Download size={18} />
                导出表格
              </Button>
            }
            title="导出用户数据"
            description="请确认导出信息，系统将生成包含当前用户列表的文件。"
            defaultFileName={`用户数据_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`}
            defaultFormat="CSV"
            defaultOperator={currentUser?.username ?? "系统管理员"}
            onExport={({ fileName }) => handleExport(fileName)}
          />
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-6">
          <CardTitle className="text-lg">用户列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6">姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="px-6 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-6 font-medium">{user.username}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${user.email}`}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {user.email}
                        <ExternalLink size={12} className="shrink-0 opacity-60" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${getStatus(user.status).color}`}
                        />
                        {getStatus(user.status).label}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <UserSheet
                          mode="edit"
                          user={user}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit2 size={14} />
                            </Button>
                          }
                          onSave={handleEdit}
                        />
                        <AppButton
                          level="danger"
                          size="icon-sm"
                          className="h-8 w-8"
                          onClick={() => handleDelete(user.id, user.username)}
                        >
                          <Trash2 size={14} />
                        </AppButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      未找到用户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={(open) => !open && setShowAdd(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增用户</DialogTitle>
            <DialogDescription>填写新用户信息并添加到系统。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">用户名</p>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">邮箱</p>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">密码</p>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                placeholder="请输入密码"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">角色</p>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser((u) => ({ ...u, role: v ?? "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色">
                    {newUser.role ? ROLE_LABELS[newUser.role as UserRole] : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_LIST.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdd(false)}
                disabled={adding}
              >
                取消
              </Button>
              <AppButton
                level="action"
                size="sm"
                onClick={handleAdd}
                disabled={
                  adding ||
                  !newUser.username ||
                  !newUser.email ||
                  !newUser.password ||
                  !newUser.role
                }
              >
                {adding ? "添加中..." : "添加"}
              </AppButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

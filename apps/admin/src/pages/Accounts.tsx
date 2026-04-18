import { Plus, Search, Edit2, Trash2, Download } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { User } from "../types";
import { usersApi } from "../api/users";

export default function Accounts() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "" });
  const [adding, setAdding] = useState(false);

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
  }, []);

  const handleAdd = async () => {
    if (!newUser.name || !newUser.email || !newUser.role) return;
    setAdding(true);
    try {
      await usersApi.create(newUser);
      await fetchUsers();
      setShowAdd(false);
      setNewUser({ name: "", email: "", role: "" });
    } catch (err) {
      console.error(err);
      alert("添加用户失败");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除用户 "${name}" 吗？`)) return;
    try {
      await usersApi.delete(id);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert("删除用户失败");
    }
  };

  const filtered = users.filter(
    (u) => u.name.includes(search) || u.email.includes(search) || u.role.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={18} />
            新增用户
          </Button>
          <Button variant="outline" className="gap-2">
            <Download size={18} />
            导出表格
          </Button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
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
            <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
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
                    <TableCell className="px-6 font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-gray-300"}`}
                      />
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
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
              <p className="mb-1 text-xs text-muted-foreground">姓名</p>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                placeholder="请输入姓名"
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
              <p className="mb-1 text-xs text-muted-foreground">角色</p>
              <Input
                value={newUser.role}
                onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                placeholder="请输入角色"
              />
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
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || !newUser.name || !newUser.email || !newUser.role}
              >
                {adding ? "添加中..." : "添加"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

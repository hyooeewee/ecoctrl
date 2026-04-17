import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  activeTab: string;
}

const tabTitleMap: Record<string, string> = {
  'dashboard': '管理总览',
  'config': '系统配置',
  'accounts': '账户控制',
  'models': '模型与对象',
  'settingsGroup': '3D 模型设置',
  'monitoring': '流程图实时监控',
  'reports': '报表管理',
  'maintenance': '维保管理',
  'faults': '故障管理',
  'energy': '能耗管理',
};

export default function Header({ activeTab }: HeaderProps) {
  const currentTitle = tabTitleMap[activeTab] || '管理总览';

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 text-sm text-muted-foreground">
        <span>首页 /</span>
        <span className="font-semibold text-foreground">{currentTitle}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索设备..."
            className="pl-10 h-9 bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-destructive rounded-full border-2 border-card"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-3 p-1 pl-3 hover:bg-muted rounded-md transition-all">
                <span className="text-sm font-medium text-foreground">Admin</span>
                <Avatar className="h-8 w-8 ring-2 ring-muted ring-offset-2">
                  <AvatarImage src={`https://avatar.vercel.sh/admin?size=32`} />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>个人信息</DropdownMenuItem>
              <DropdownMenuItem>偏好设置</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500">退出登录</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

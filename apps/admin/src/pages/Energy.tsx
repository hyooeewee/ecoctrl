import {
  Activity,
  PieChart,
  Sliders,
  ExternalLink,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { Badge } from "@ecoctrl/ui";
import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ecoctrl/ui";

import { useSubBreadcrumb } from "@/hooks/useSubBreadcrumb";
import { useAppStore } from "@/store/appStore";
import { Progress } from "../components/Progress";
import type { EnergyArea, CarbonFactor, CarbonFactorNode } from "@ecoctrl/shared";
import { energyApi } from "../api/energy";

interface TreeNode extends CarbonFactorNode {
  children: TreeNode[];
}

function buildTree(nodes: CarbonFactorNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const n of nodes) {
    map.set(n.pkid, { ...n, children: [] });
  }

  for (const n of nodes) {
    const node = map.get(n.pkid)!;
    if (n.parentPkid && map.has(n.parentPkid)) {
      map.get(n.parentPkid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();

  return nodes.reduce<TreeNode[]>((acc, node) => {
    const matches =
      node.name.toLowerCase().includes(q) ||
      (node.fullName && node.fullName.toLowerCase().includes(q));
    const filteredChildren = filterTree(node.children, query);

    if (matches || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren });
    }

    return acc;
  }, []);
}

function TreeNodeItem({
  node,
  level,
  expandedPkids,
  selectedPkid,
  onToggleExpand,
  onSelect,
}: {
  node: TreeNode;
  level: number;
  expandedPkids: Set<string>;
  selectedPkid: string | null;
  onToggleExpand: (pkid: string) => void;
  onSelect: (pkid: string) => void;
}) {
  const isExpanded = expandedPkids.has(node.pkid);
  const isSelected = selectedPkid === node.pkid;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded py-1.5 pr-2 cursor-pointer transition-colors ${isSelected ? "bg-muted" : "hover:bg-muted/60"}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.pkid)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.pkid);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted-foreground/20"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="inline-block w-5" />
        )}
        <span className="text-sm select-none">{node.name}</span>
        {!hasChildren && <span className="ml-1 text-[10px] text-muted-foreground">叶子</span>}
      </div>
      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.pkid}
            node={child}
            level={level + 1}
            expandedPkids={expandedPkids}
            selectedPkid={selectedPkid}
            onToggleExpand={onToggleExpand}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export default function Energy() {
  const [areas, setAreas] = useState<EnergyArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const activeTab = useAppStore((state) => state.energyTab);
  const setActiveTab = useAppStore((state) => state.setEnergyTab);
  const { setSubLabel } = useSubBreadcrumb();

  // Carbon factor tree states
  const [treeNodes, setTreeNodes] = useState<CarbonFactorNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeRefreshing, setTreeRefreshing] = useState(false);
  const [treeError, setTreeError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPkids, setExpandedPkids] = useState<Set<string>>(new Set());
  const [selectedPkid, setSelectedPkid] = useState<string | null>(null);
  const [fetchingPkid, setFetchingPkid] = useState<string | null>(null);
  const [fetchedFactors, setFetchedFactors] = useState<CarbonFactor[]>([]);
  const [carbonFactors, setCarbonFactors] = useState<CarbonFactor[]>([]);

  useEffect(() => {
    const labels: Record<string, string> = {
      overview: "分区总览",
      details: "详细数据",
      stats: "统计报表",
      config: "碳排放因子",
    };
    setSubLabel(labels[activeTab] ?? null);
  }, [activeTab, setSubLabel]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const data = await energyApi.areas();
        setAreas(data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAreas();
  }, []);

  const fetchTreeData = async () => {
    setTreeLoading(true);
    setTreeError(false);
    try {
      const [nodes, factors] = await Promise.all([
        energyApi.carbonFactorTree(),
        energyApi.carbonFactors(),
      ]);
      setTreeNodes(nodes);
      setCarbonFactors(factors);
    } catch (err) {
      console.error(err);
      setTreeError(true);
    } finally {
      setTreeLoading(false);
    }
  };

  const handleRefreshTree = async () => {
    setTreeRefreshing(true);
    try {
      await energyApi.refreshCarbonFactorTree();
      await fetchTreeData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "刷新失败";
      alert(`刷新失败：${message}`);
      setTreeError(true);
    } finally {
      setTreeRefreshing(false);
    }
  };

  const handleToggleExpand = (pkid: string) => {
    setExpandedPkids((prev) => {
      const next = new Set(prev);
      if (next.has(pkid)) {
        next.delete(pkid);
      } else {
        next.add(pkid);
      }
      return next;
    });
  };

  const handleSelectNode = async (pkid: string) => {
    setSelectedPkid(pkid);

    const existing = carbonFactors.filter((f) => f.pkid === pkid);
    if (existing.length > 0) {
      setFetchedFactors(existing);
      return;
    }

    setFetchingPkid(pkid);
    try {
      const result = await energyApi.fetchCarbonFactor(pkid);
      setFetchedFactors(result.data);
      setCarbonFactors((prev) => {
        const withoutOld = prev.filter((f) => f.pkid !== pkid);
        return [...withoutOld, ...result.data];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取失败";
      alert(`获取因子数据失败：${message}`);
      setFetchedFactors([]);
    } finally {
      setFetchingPkid(null);
    }
  };

  useEffect(() => {
    if (activeTab === "config") {
      fetchTreeData();
    }
  }, [activeTab]);

  const tree = useMemo(() => buildTree(treeNodes), [treeNodes]);
  const filteredTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);

  const selectedNode = useMemo(
    () => treeNodes.find((n) => n.pkid === selectedPkid),
    [treeNodes, selectedPkid],
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <TabsList>
        <TabsTrigger value="overview">分区总览</TabsTrigger>
        <TabsTrigger value="details">详细数据</TabsTrigger>
        <TabsTrigger value="stats">统计报表</TabsTrigger>
        <TabsTrigger value="config">碳排放因子</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-sm text-red-400">
            数据加载失败，请稍后重试
          </div>
        ) : areas.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            暂无能耗分区数据
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {areas.map((area) => (
              <Card
                key={area.id}
                className="border-border bg-card group relative overflow-hidden border shadow-sm"
              >
                <CardHeader className="border-border/50 bg-muted/20 border-b px-6 pb-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      {area.title}
                      <ExternalLink
                        size={14}
                        className="text-muted-foreground hover:text-primary shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </CardTitle>
                    {area.current > area.target ? (
                      <Badge variant="destructive" className="h-5 text-[10px]">
                        超标告警
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 border-green-200 bg-green-50/50 text-[10px] text-green-600"
                      >
                        正常
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">能耗负荷监测</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-6 pt-6 pb-6">
                  <div className="mb-1 flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-foreground text-2xl font-bold">
                        {area.current.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal">kWh</span>
                    </div>
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      目标: {area.target.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(area.current / area.target) * 100}
                    className="h-1.5"
                    indicatorClassName={area.color}
                  />
                  <div className="border-border/50 grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Activity className="text-primary" size={14} />
                      <span className="text-muted-foreground text-[11px] font-medium">
                        功率因素: {area.powerFactor}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sliders className="text-orange-500" size={14} />
                      <span className="text-muted-foreground text-[11px] font-medium">
                        负载率: {area.loadRate}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border bg-card overflow-hidden border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">今日分项能耗分布</CardTitle>
            <CardDescription className="text-xs">分系统电耗占比分析</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg bg-muted/50">
            <div className="text-center text-muted-foreground">
              <PieChart className="mx-auto mb-2 opacity-30" size={48} />
              <p className="text-sm">饼图组件加载中...</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="details">
        <Card className="border-border bg-card border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">详细数据</CardTitle>
            <CardDescription className="text-xs">各区域能耗明细与历史记录</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg">
            <p className="text-muted-foreground text-sm">详细数据内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card className="border-border bg-card border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">统计报表</CardTitle>
            <CardDescription className="text-xs">能耗趋势分析与报表导出</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg">
            <p className="text-muted-foreground text-sm">统计报表内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="config" className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tree panel */}
          <Card className="border-border bg-card border shadow-sm lg:col-span-1">
            <CardHeader className="border-border/50 border-b px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">因子分类</CardTitle>
                  <CardDescription className="text-xs">
                    数据来源：国家温室气体排放因子库
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleRefreshTree}
                  disabled={treeRefreshing}
                >
                  <RefreshCw size={14} className={treeRefreshing ? "animate-spin" : ""} />
                  {treeRefreshing ? "刷新中..." : "刷新"}
                </Button>
              </div>
              <div className="relative mt-3">
                <Search
                  size={14}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="搜索分类名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {treeLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  加载中...
                </div>
              ) : treeError ? (
                <div className="flex h-64 items-center justify-center text-sm text-red-400">
                  数据加载失败，请稍后重试
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {treeNodes.length === 0
                    ? "暂无分类数据，请点击右上角刷新获取"
                    : "无匹配的搜索结果"}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto py-1">
                  {filteredTree.map((node) => (
                    <TreeNodeItem
                      key={node.pkid}
                      node={node}
                      level={0}
                      expandedPkids={expandedPkids}
                      selectedPkid={selectedPkid}
                      onToggleExpand={handleToggleExpand}
                      onSelect={handleSelectNode}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail panel */}
          <Card className="border-border bg-card border shadow-sm lg:col-span-2">
            <CardHeader className="border-border/50 border-b px-6">
              <CardTitle className="text-base font-bold">
                {selectedNode ? selectedNode.fullName || selectedNode.name : "因子详情"}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedNode
                  ? "点击左侧分类节点可查看对应的碳排放因子数据"
                  : "请在左侧选择一个分类节点查看详情"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedPkid ? (
                <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
                  请从左侧选择一个节点查看因子数据
                </div>
              ) : fetchingPkid === selectedPkid ? (
                <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  获取因子数据中...
                </div>
              ) : fetchedFactors.length === 0 ? (
                <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
                  该节点暂无因子数据
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-6">名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead className="text-right">因子值</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead className="px-6">来源</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fetchedFactors.map((factor) => (
                      <TableRow key={factor.id}>
                        <TableCell className="px-6 font-medium">{factor.name}</TableCell>
                        <TableCell>{factor.category ?? "-"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {factor.value?.toLocaleString() ?? "-"}
                        </TableCell>
                        <TableCell>{factor.unit ?? "-"}</TableCell>
                        <TableCell className="px-6 text-muted-foreground text-xs">
                          {factor.source ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

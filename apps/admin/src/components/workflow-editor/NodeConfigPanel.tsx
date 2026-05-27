import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Braces, ChevronDown, ChevronRight, Info } from "lucide-react";
import type { Node } from "@xyflow/react";
import { Label } from "@ecoctrl/ui/label";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Textarea } from "@ecoctrl/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@ecoctrl/ui/popover";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@ecoctrl/ui/hover-card";
import type { NodeDefinition } from "@/api/nodes";
import type { EnvVar } from "./types";

// ========================================
// JSON Schema Form Types
// ========================================

interface JsonSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  enum?: (string | number | boolean)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
  placeholder?: string;
}

interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

interface NodeConfigPanelProps {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  currentConfig: Record<string, unknown>;
  schema: Record<string, unknown>;
  skipFields?: string[];
  upstreamNodes?: Node[];
  envVars?: EnvVar[];
  getNodeDef?: (type: string) => NodeDefinition | null;
  onChange: (config: Record<string, unknown>) => void;
}

interface UpstreamNodeInfo {
  id: string;
  label: string;
  outputKeys: string[];
}

// ========================================
// Inline Autocomplete Helpers
// ========================================

interface Candidate {
  label: string;
  value: string;
  category: string;
}

interface AutocompleteState {
  active: boolean;
  startPos: number;
  query: string;
  selectedIndex: number;
  candidates: Candidate[];
}

function buildCandidates(
  upstreamNodes: UpstreamNodeInfo[],
  envVars: Array<{ key: string; type: string }>,
): Candidate[] {
  const candidates: Candidate[] = [];

  candidates.push(
    { label: "now()", value: "{{now()}}", category: "内置函数" },
    { label: "uuid()", value: "{{uuid()}}", category: "内置函数" },
  );

  for (const v of envVars.filter((v) => v.type !== "secret")) {
    candidates.push({ label: `var.${v.key}`, value: `{{var.${v.key}}}`, category: "环境变量" });
  }

  for (const v of envVars.filter((v) => v.type === "secret")) {
    candidates.push({ label: `secret.${v.key}`, value: `{{secret.${v.key}}}`, category: "密钥" });
  }

  for (const node of upstreamNodes) {
    for (const key of node.outputKeys) {
      candidates.push({
        label: `${node.id}.${key}`,
        value: `{{${node.id}.${key}}}`,
        category: `节点: ${node.label}`,
      });
    }
  }

  return candidates;
}

function getAutocompleteContext(
  value: string,
  cursorPos: number,
): { start: number; query: string } | null {
  const beforeCursor = value.slice(0, cursorPos);
  const lastOpen = beforeCursor.lastIndexOf("{{");
  if (lastOpen === -1) return null;

  const between = value.slice(lastOpen + 2, cursorPos);
  // If there's a }} between {{ and cursor, this {{ is closed
  if (between.includes("}}")) return null;

  return { start: lastOpen, query: between.trim() };
}

function getExpressionEnd(value: string, startPos: number): number {
  const searchFrom = startPos + 2;
  const endPos = value.indexOf("}}", searchFrom);
  return endPos === -1 ? value.length : endPos + 2;
}

// ========================================
// Schema Form Field Renderer
// ========================================

function FieldLabel({
  label,
  required,
  inputId,
}: {
  label: string;
  required: boolean;
  inputId: string;
}) {
  return (
    <Label htmlFor={inputId} className="flex items-center gap-2 text-sm text-foreground">
      {required && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />}
      {label}
    </Label>
  );
}

function FieldDescription({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>;
}

// ========================================
// Expression Reference Helper
// ========================================

function ExpressionRefHelper({
  upstreamNodes,
  envVars,
  onSelect,
  triggerClassName,
}: {
  upstreamNodes: UpstreamNodeInfo[];
  envVars: Array<{ key: string; type: string }>;
  onSelect: (expr: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  const nonSecretVars = envVars.filter((v) => v.type !== "secret");
  const secretVars = envVars.filter((v) => v.type === "secret");

  const builtinFns = [
    { key: "now()", desc: "当前时间" },
    { key: "uuid()", desc: "随机UUID" },
  ];

  const renderSection = (title: string, items: Array<{ label: string; expr: string }>) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
        <div className="flex flex-wrap gap-1">
          {items.map(({ label, expr }) => (
            <button
              key={expr}
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                onSelect(expr);
                setOpen(false);
              }}
            >
              <ChevronRight size={9} />
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const isInline = !!triggerClassName;

  return (
    <div
      className={
        isInline
          ? "flex items-center gap-0.5"
          : "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
      }
    >
      {/* Direct click: insert {{}} and trigger autocomplete */}
      <button
        type="button"
        className={
          triggerClassName ??
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover/input:opacity-100"
        }
        onClick={(e) => {
          e.stopPropagation();
          onSelect("{{}}");
        }}
      >
        <Braces size={13} />
      </button>

      {/* Dropdown browse — only in inline mode (Combobox fields without autocomplete) */}
      {isInline && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronDown size={10} />
              </button>
            }
          />
          <PopoverContent align="end" side="bottom" sideOffset={6} className="w-72 p-3">
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                插入引用
              </p>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {renderSection(
                  "内置函数",
                  builtinFns.map((fn) => ({ label: fn.key, expr: `{{${fn.key}}}` })),
                )}
                {renderSection(
                  "环境变量",
                  nonSecretVars.map((v) => ({ label: v.key, expr: `{{var.${v.key}}}` })),
                )}
                {renderSection(
                  "密钥",
                  secretVars.map((v) => ({ label: v.key, expr: `{{secret.${v.key}}}` })),
                )}
                {upstreamNodes.length > 0 &&
                  upstreamNodes.map((node) => (
                    <div key={node.id} className="space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        节点输出
                      </p>
                      <p className="truncate text-xs font-medium text-foreground/70">
                        {node.label}
                      </p>
                      <div className="flex flex-wrap gap-1 pl-2">
                        {node.outputKeys.map((key) => {
                          const expr = `{{${node.id}.${key}}}`;
                          return (
                            <button
                              key={key}
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              onClick={() => {
                                onSelect(expr);
                                setOpen(false);
                              }}
                            >
                              <ChevronRight size={9} />
                              {key}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <HoverCard>
        <HoverCardTrigger>
          <span className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors">
            <Info size={11} />
          </span>
        </HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          align="end"
          sideOffset={6}
          className="flex w-[260px] flex-col items-start gap-2 px-3 py-2.5"
        >
          <p className="font-medium">引用语法</p>
          <div className="grid gap-1.5 text-muted-foreground">
            <div className="flex items-center gap-2">
              <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {"{{var.x}}"}
              </code>
              <span>环境变量</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {"{{secret.x}}"}
              </code>
              <span>密钥</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {"{{nodeId.key}}"}
              </code>
              <span>上游节点输出</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {"{{now()}}"}
              </code>
              <span>/</span>
              <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {"{{uuid()}}"}
              </code>
              <span>内置函数</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {"{{ var.a + var.b }}"}
              </code>
              <span>表达式</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/70">输入 {"{{"} 触发自动补全</p>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

const inputBaseClasses =
  "h-9 rounded-md border-0 bg-zinc-50 px-3 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 " +
  "focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white " +
  "transition-colors dark:bg-zinc-800/60 dark:focus-visible:bg-zinc-800";

const textareaBaseClasses =
  "min-h-[80px] rounded-md border-0 bg-zinc-50 px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 " +
  "focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white " +
  "transition-colors resize-y dark:bg-zinc-800/60 dark:focus-visible:bg-zinc-800";

function SchemaField({
  name,
  prop,
  value,
  required,
  upstreamNodes,
  envVars,
  onChange,
}: {
  name: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  upstreamNodes: UpstreamNodeInfo[];
  envVars: Array<{ key: string; type: string }>;
  onChange: (val: unknown) => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [auto, setAuto] = useState<AutocompleteState>({
    active: false,
    startPos: 0,
    query: "",
    selectedIndex: 0,
    candidates: [],
  });

  const allCandidates = useMemo(
    () => buildCandidates(upstreamNodes, envVars),
    [upstreamNodes, envVars],
  );

  // Click outside to close dropdown
  useEffect(() => {
    if (!auto.active) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (inputRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setAuto((prev) => ({ ...prev, active: false }));
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [auto.active]);

  const insertExpr = useCallback(
    (expr: string) => {
      const el = inputRef.current;
      if (el) {
        const start = el.selectionStart ?? el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(el.selectionEnd ?? start);
        const next = before + expr + after;
        onChange(next);
        requestAnimationFrame(() => {
          el.focus();
          if (expr === "{{}}") {
            // Place cursor between {{ and }} and trigger autocomplete
            el.setSelectionRange(start + 2, start + 2);
            setAuto({
              active: true,
              startPos: start,
              query: "",
              selectedIndex: 0,
              candidates: allCandidates,
            });
          } else {
            el.setSelectionRange(start + expr.length, start + expr.length);
          }
        });
      } else {
        const cur = value === undefined || value === null ? "" : String(value);
        onChange(cur + expr);
      }
    },
    [value, onChange, allCandidates],
  );

  const selectCandidate = useCallback(
    (candidate: Candidate) => {
      const el = inputRef.current;
      if (!el) return;

      const endPos = getExpressionEnd(el.value, auto.startPos);
      const before = el.value.slice(0, auto.startPos);
      const after = el.value.slice(endPos);
      const newValue = before + candidate.value + after;
      onChange(newValue);

      setAuto((prev) => ({ ...prev, active: false }));

      requestAnimationFrame(() => {
        el.focus();
        const newCursorPos = before.length + candidate.value.length;
        el.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [auto.startPos, onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart ?? newValue.length;
      const prevValue = value === undefined || value === null ? "" : String(value);

      // Detect {{ insertion and auto-close with }}
      if (
        cursorPos >= 2 &&
        newValue.slice(cursorPos - 2, cursorPos) === "{{" &&
        newValue.length > prevValue.length &&
        !prevValue.slice(0, cursorPos).endsWith("{{")
      ) {
        const withBraces = newValue.slice(0, cursorPos) + "}}" + newValue.slice(cursorPos);
        onChange(withBraces);

        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (el) {
            el.focus();
            el.setSelectionRange(cursorPos, cursorPos);
          }
        });

        setAuto({
          active: true,
          startPos: cursorPos - 2,
          query: "",
          selectedIndex: 0,
          candidates: allCandidates,
        });
        return;
      }

      onChange(newValue);

      const ctx = getAutocompleteContext(newValue, cursorPos);
      if (ctx) {
        const filtered = allCandidates.filter((c) =>
          c.label.toLowerCase().includes(ctx.query.toLowerCase()),
        );
        setAuto({
          active: true,
          startPos: ctx.start,
          query: ctx.query,
          selectedIndex: 0,
          candidates: filtered,
        });
      } else {
        setAuto((prev) => ({ ...prev, active: false }));
      }
    },
    [value, onChange, allCandidates],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!auto.active) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAuto((prev) => ({
          ...prev,
          selectedIndex:
            prev.candidates.length > 0 ? (prev.selectedIndex + 1) % prev.candidates.length : 0,
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAuto((prev) => ({
          ...prev,
          selectedIndex:
            prev.candidates.length > 0
              ? (prev.selectedIndex - 1 + prev.candidates.length) % prev.candidates.length
              : 0,
        }));
      } else if (e.key === "Enter") {
        if (auto.candidates.length > 0) {
          e.preventDefault();
          selectCandidate(auto.candidates[auto.selectedIndex]!);
        }
      } else if (e.key === "Escape") {
        setAuto((prev) => ({ ...prev, active: false }));
      }
    },
    [auto.active, auto.candidates, auto.selectedIndex, selectCandidate],
  );

  const refHelper = (
    <ExpressionRefHelper upstreamNodes={upstreamNodes} envVars={envVars} onSelect={insertExpr} />
  );

  const renderAutocompleteDropdown = () => {
    if (!auto.active) return null;
    return (
      <div
        ref={dropdownRef}
        className="absolute left-0 top-full z-50 mt-1 max-h-60 w-max min-w-full overflow-y-auto rounded-md border bg-popover shadow-md"
      >
        {auto.candidates.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-muted-foreground">无匹配结果</div>
        ) : (
          auto.candidates.map((candidate, i) => (
            <button
              key={candidate.value}
              type="button"
              className={`flex w-full items-center gap-3 px-2.5 py-1.5 text-xs transition-colors ${
                i === auto.selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              }`}
              onClick={() => selectCandidate(candidate)}
            >
              <span className="truncate font-mono">{candidate.label}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {candidate.category}
              </span>
            </button>
          ))
        )}
      </div>
    );
  };

  const label = prop.title ?? name;
  const description = prop.description;
  const inputId = `field-${name}`;

  // Boolean
  if (prop.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-3 py-1">
        <div className="space-y-1 min-w-0">
          <FieldLabel label={label} required={required} inputId={inputId} />
          <FieldDescription text={description} />
        </div>
        <Switch
          id={inputId}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </div>
    );
  }

  // Enum / select
  if (prop.enum && prop.enum.length > 0) {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={required} inputId={inputId} />
        <FieldDescription text={description} />
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={inputId} className={inputBaseClasses}>
            <SelectValue placeholder={`选择 ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {prop.enum.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Number / integer
  if (prop.type === "number" || prop.type === "integer") {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={required} inputId={inputId} />
        <FieldDescription text={description} />
        <Input
          id={inputId}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={prop.placeholder ?? `请输入 ${label}`}
          min={prop.minimum}
          max={prop.maximum}
          onChange={(e) => {
            const val = e.target.value === "" ? undefined : Number(e.target.value);
            onChange(val);
          }}
          className={inputBaseClasses}
        />
      </div>
    );
  }

  // Textarea for multi-line strings
  if (prop.format === "textarea" || prop.format === "multiline") {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={required} inputId={inputId} />
        <FieldDescription text={description} />
        <div className="group/input relative">
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={inputId}
            value={value === undefined || value === null ? "" : String(value)}
            placeholder={prop.placeholder ?? `请输入 ${label}`}
            rows={4}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={textareaBaseClasses + " pr-8"}
          />
          {refHelper}
          {renderAutocompleteDropdown()}
        </div>
      </div>
    );
  }

  // Default: string input
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} inputId={inputId} />
      <FieldDescription text={description} />
      <div className="group/input relative">
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          id={inputId}
          type={prop.format === "password" ? "password" : "text"}
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={prop.placeholder ?? `请输入 ${label}`}
          minLength={prop.minLength}
          maxLength={prop.maxLength}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={inputBaseClasses + " pr-8"}
        />
        {refHelper}
        {renderAutocompleteDropdown()}
      </div>
    </div>
  );
}

// ========================================
// Main Panel Component
// ========================================

export { ExpressionRefHelper };
export type { UpstreamNodeInfo };

export function NodeConfigPanel({
  currentConfig,
  schema,
  skipFields,
  upstreamNodes,
  envVars,
  getNodeDef,
  onChange,
}: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(currentConfig);

  const typedSchema = schema as JsonSchema;
  const properties = typedSchema.properties ?? {};
  const requiredSet = new Set(typedSchema.required ?? []);

  const envVarsForHelper = (envVars ?? []).map((v) => ({ key: v.key, type: v.type }));

  // Resolve upstream node info for expression references
  const resolvedUpstream: UpstreamNodeInfo[] = (upstreamNodes ?? []).map((node) => {
    const nodeType = (node.data.type as string) || "";
    const nodeLabel = (node.data.label as string) || node.id;
    const def = getNodeDef?.(nodeType);
    const outputSchema = (def?.schema as Record<string, unknown>)?.outputs as
      | { properties?: Record<string, unknown> }
      | undefined;
    const outputKeys = outputSchema?.properties ? Object.keys(outputSchema.properties) : ["value"];
    return { id: node.id, label: nodeLabel, outputKeys };
  });

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      const next = { ...formData, [key]: value };
      if (value === undefined) {
        delete next[key];
      }
      setFormData(next);
      onChange(next);
    },
    [formData, onChange],
  );

  const skip = new Set(skipFields ?? []);
  const propertyEntries = Object.entries(properties).filter(([key]) => !skip.has(key));

  if (propertyEntries.length === 0) {
    return (
      <div className="py-4">
        <p className="text-muted-foreground text-xs leading-relaxed">该节点暂无配置参数。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {typedSchema.title && (
        <div className="border-b border-border/50 pb-2">
          <h4 className="text-sm font-medium text-foreground">{typedSchema.title}</h4>
          {typedSchema.description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {typedSchema.description}
            </p>
          )}
        </div>
      )}

      {propertyEntries.map(([key, prop]) => (
        <SchemaField
          key={key}
          name={key}
          prop={prop}
          value={formData[key] ?? prop.default}
          required={requiredSet.has(key)}
          upstreamNodes={resolvedUpstream}
          envVars={envVarsForHelper}
          onChange={(val) => handleFieldChange(key, val)}
        />
      ))}
    </div>
  );
}

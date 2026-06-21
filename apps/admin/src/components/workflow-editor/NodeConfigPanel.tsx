import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Braces, ChevronRight, Info, Plus, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import { Label } from "@ecoctrl/ui/label";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Textarea } from "@ecoctrl/ui/textarea";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@ecoctrl/ui/hover-card";
import type { NodeDefinition } from "@/api/nodes";
import type { EnvVar } from "./types";
import { JsonEditor } from "./JsonEditor";

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
  additionalProperties?: { type?: string };
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
  outputProperties?: Record<string, unknown>;
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

// Recursively expand output schema properties into nested candidate paths.
// Arrays are sampled with [0] index; objects recurse into their properties.
function expandOutputPaths(
  prefix: string,
  schemaProp: unknown,
  depth: number = 0,
  maxDepth: number = 5,
): Array<{ path: string }> {
  if (depth >= maxDepth) return [];

  const prop = schemaProp as {
    type?: string;
    properties?: Record<string, unknown>;
    items?: unknown;
  };
  if (!prop) return [];

  // Object with properties
  if (prop.properties || prop.type === "object") {
    const props = prop.properties ?? {};
    const results: Array<{ path: string }> = [];
    for (const [key, subProp] of Object.entries(props)) {
      const newPath = `${prefix}.${key}`;
      const subResults = expandOutputPaths(newPath, subProp, depth + 1, maxDepth);
      // Include this path (user may want the object/array itself)
      results.push({ path: newPath });
      results.push(...subResults);
    }
    return results;
  }

  // Array with items
  if (prop.type === "array" && prop.items) {
    const itemPath = `${prefix}[0]`;
    const subResults = expandOutputPaths(itemPath, prop.items, depth + 1, maxDepth);
    const results: Array<{ path: string }> = [{ path: itemPath }];
    results.push(...subResults);
    return results;
  }

  // Primitive - no children to expand
  return [];
}

function buildCandidates(
  upstreamNodes: UpstreamNodeInfo[],
  envVars: Array<{ key: string; type: string }>,
): Candidate[] {
  const candidates: Candidate[] = [];

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

      const propSchema = node.outputProperties?.[key];
      if (propSchema) {
        const nested = expandOutputPaths(`${node.id}.${key}`, propSchema, 0);
        for (const n of nested) {
          candidates.push({
            label: n.path,
            value: `{{${n.path}}}`,
            category: `节点: ${node.label}`,
          });
        }
      }
    }
  }

  // Built-in functions at the end
  candidates.push(
    { label: "now()", value: "{{now()}}", category: "内置函数" },
    { label: 'now("YYYY-MM-DD")', value: '{{now("YYYY-MM-DD")}}', category: "内置函数" },
    { label: 'now("HH:mm:ss")', value: '{{now("HH:mm:ss")}}', category: "内置函数" },
    {
      label: 'now("YYYY-MM-DD HH:mm:ss")',
      value: '{{now("YYYY-MM-DD HH:mm:ss")}}',
      category: "内置函数",
    },
    { label: "timestamp()", value: "{{timestamp()}}", category: "内置函数" },
    { label: "uuid()", value: "{{uuid()}}", category: "内置函数" },
    { label: 'upper("hello")', value: '{{upper("hello")}}', category: "内置函数" },
    { label: 'lower("HELLO")', value: '{{lower("HELLO")}}', category: "内置函数" },
    { label: 'trim(" hello ")', value: '{{trim(" hello ")}}', category: "内置函数" },
    { label: 'length("hello")', value: '{{length("hello")}}', category: "内置函数" },
    {
      label: 'if("true", "yes", "no")',
      value: '{{if("true", "yes", "no")}}',
      category: "内置函数",
    },
    {
      label: 'coalesce("", "default")',
      value: '{{coalesce("", "default")}}',
      category: "内置函数",
    },
  );

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
          triggerClassName
            ? triggerClassName + " opacity-0 group-hover/input:opacity-100 transition-all"
            : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover/input:opacity-100"
        }
        onClick={(e) => {
          e.stopPropagation();
          onSelect("{{}}");
        }}
      >
        <Braces size={13} />
      </button>

      <HoverCard>
        <HoverCardTrigger>
          <span className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover/input:opacity-100">
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

// ========================================
// Expression Input (autocomplete as input variant)
// ========================================

interface ExpressionInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  upstreamNodes: UpstreamNodeInfo[];
  envVars: Array<{ key: string; type: string }>;
  multiline?: boolean;
  id?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
}

function ExpressionInput({
  value,
  onChange,
  placeholder,
  upstreamNodes,
  envVars,
  multiline = false,
  id,
  minLength,
  maxLength,
  rows = 4,
}: ExpressionInputProps) {
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
        onChange(value + expr);
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
      const prevValue = value;

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

  const renderDropdown = () => {
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

  const inputClasses = multiline ? textareaBaseClasses + " pr-8" : inputBaseClasses + " pr-8";

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="group/input relative">
      <InputComponent
        ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
        id={id}
        type={multiline ? undefined : "text"}
        value={value}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        rows={multiline ? rows : undefined}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={inputClasses}
      />

      {/* Right-side helper buttons */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {/* Insert {{}} */}
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover/input:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            insertExpr("{{}}");
          }}
        >
          <Braces size={13} />
        </button>

        {/* Info hover card */}
        <HoverCard>
          <HoverCardTrigger>
            <span className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover/input:opacity-100">
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

      {renderDropdown()}
    </div>
  );
}

// ========================================
// Schema Form Field Renderer
// ========================================

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
  const label = prop.title ?? name;
  const description = prop.description;
  const inputId = `field-${name}`;
  const stringValue = value === undefined || value === null ? "" : String(value);

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

  // Number / integer (also supports expression references like {{var.x}})
  if (prop.type === "number" || prop.type === "integer") {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={required} inputId={inputId} />
        <FieldDescription text={description} />
        <ExpressionInput
          id={inputId}
          value={stringValue}
          onChange={(v) => {
            if (v === "") {
              onChange(undefined);
            } else {
              onChange(v);
            }
          }}
          placeholder={prop.placeholder ?? `请输入 ${label}`}
          upstreamNodes={upstreamNodes}
          envVars={envVars}
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
        <ExpressionInput
          id={inputId}
          value={stringValue}
          onChange={(v) => onChange(v)}
          placeholder={prop.placeholder ?? `请输入 ${label}`}
          upstreamNodes={upstreamNodes}
          envVars={envVars}
          multiline
          rows={4}
        />
      </div>
    );
  }

  // Object with string values (Record<string, string> or single string)
  if (prop.type === "object" && prop.additionalProperties?.type === "string" && !prop.properties) {
    const isSimple = typeof value === "string" || value === undefined || value === null;
    const entries = isSimple ? [] : Object.entries((value as Record<string, string>) ?? {});

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <FieldLabel label={label} required={required} inputId={inputId} />
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              if (isSimple) {
                // Switch to key-value mode
                const str = (value as string) ?? "";
                onChange(str ? { value: str } : {});
              } else {
                // Switch to simple mode
                const firstVal = Object.values((value as Record<string, string>) ?? {})[0];
                onChange(firstVal ?? "");
              }
            }}
          >
            {isSimple ? "多字段模式" : "简单模式"}
          </button>
        </div>
        <FieldDescription text={description} />

        {isSimple ? (
          <ExpressionInput
            id={inputId}
            value={(value as string) ?? ""}
            placeholder={'表达式，如 {{ map(raw.ResultPointObjArr, "pointId", "value") }}'}
            upstreamNodes={upstreamNodes}
            envVars={envVars}
            onChange={(v) => onChange(v)}
          />
        ) : (
          <div className="space-y-2">
            {entries.map(([k, v], i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Input
                  value={k}
                  placeholder="字段名"
                  className={inputBaseClasses + " flex-1"}
                  onChange={(e) => {
                    const next = { ...((value as Record<string, string>) ?? {}) };
                    const val = next[k];
                    delete next[k];
                    next[e.target.value] = val ?? "";
                    onChange(next);
                  }}
                />
                <div className="flex-1">
                  <ExpressionInput
                    value={v ?? ""}
                    placeholder="值（支持 {{ 表达式）"
                    upstreamNodes={upstreamNodes}
                    envVars={envVars}
                    onChange={(val) => {
                      const next = { ...((value as Record<string, string>) ?? {}) };
                      next[k] = val;
                      onChange(next);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  onClick={() => {
                    const next = { ...((value as Record<string, string>) ?? {}) };
                    delete next[k];
                    onChange(next);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="flex h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                const next = { ...((value as Record<string, string>) ?? {}) };
                let newKey = "";
                let idx = 1;
                while (`key${idx}` in next || newKey === "") {
                  newKey = `key${idx}`;
                  idx++;
                }
                next[newKey] = "";
                onChange(next);
              }}
            >
              <Plus size={12} />
              添加字段
            </button>
          </div>
        )}
      </div>
    );
  }

  // Object / Array: JSON editor with fullscreen support
  if (prop.type === "object" || prop.type === "array") {
    const stringified = JSON.stringify(value ?? (prop.type === "array" ? [] : {}), null, 2);
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={required} inputId={inputId} />
        <FieldDescription text={description} />
        <JsonEditor
          value={stringified}
          onChange={(v) => {
            try {
              onChange(JSON.parse(v));
            } catch {
              // keep invalid text as string? node config expects object/array
            }
          }}
          title={`编辑 ${label}`}
          mode="inline"
          editor="textarea"
          showFormat
          showFullscreen
        />
      </div>
    );
  }

  // Default: string input (with built-in autocomplete)
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} inputId={inputId} />
      <FieldDescription text={description} />
      <ExpressionInput
        id={inputId}
        value={stringValue}
        onChange={(v) => onChange(v)}
        placeholder={prop.placeholder ?? `请输入 ${label}`}
        upstreamNodes={upstreamNodes}
        envVars={envVars}
        minLength={prop.minLength}
        maxLength={prop.maxLength}
      />
    </div>
  );
}

// ========================================
// Main Panel Component
// ========================================

export { ExpressionRefHelper };
export type { UpstreamNodeInfo };

export function NodeConfigPanel({
  nodeId,
  currentConfig,
  schema,
  skipFields,
  upstreamNodes,
  envVars,
  getNodeDef,
  onChange,
}: NodeConfigPanelProps) {
  const typedSchema = schema as JsonSchema;
  const properties = typedSchema.properties ?? {};
  const requiredSet = useMemo(() => new Set(typedSchema.required ?? []), [typedSchema.required]);
  const propertyEntries = useMemo(() => {
    const skip = new Set(skipFields ?? []);
    return Object.entries(properties).filter(([key]) => !skip.has(key));
  }, [properties, skipFields]);

  const buildInitialForm = useCallback(
    (base: Record<string, unknown>) => {
      const initial = { ...base };
      for (const [key, prop] of propertyEntries) {
        if (!(key in initial) && prop.default !== undefined) {
          initial[key] = prop.default;
        }
      }
      return initial;
    },
    [propertyEntries],
  );

  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    buildInitialForm(currentConfig),
  );

  useEffect(() => {
    setFormData(buildInitialForm(currentConfig));
  }, [nodeId, buildInitialForm, currentConfig]);

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
    return {
      id: node.id,
      label: nodeLabel,
      outputKeys,
      outputProperties: outputSchema?.properties,
    };
  });

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      const next = { ...formData, [key]: value };
      setFormData(next);
      onChange(next);
    },
    [formData, onChange],
  );

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
          value={formData[key]}
          required={requiredSet.has(key)}
          upstreamNodes={resolvedUpstream}
          envVars={envVarsForHelper}
          onChange={(val) => handleFieldChange(key, val)}
        />
      ))}
    </div>
  );
}

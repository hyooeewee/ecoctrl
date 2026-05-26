import { useState, useCallback, useRef } from "react";
import { Braces, ChevronRight } from "lucide-react";
import type { Node } from "@xyflow/react";
import { Label } from "@ecoctrl/ui/label";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Textarea } from "@ecoctrl/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@ecoctrl/ui/popover";
import type { NodeDefinition } from "@/api/nodes";

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
  getNodeDef?: (type: string) => NodeDefinition | null;
  onChange: (config: Record<string, unknown>) => void;
}

interface UpstreamNodeInfo {
  id: string;
  label: string;
  outputKeys: string[];
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
  onSelect,
}: {
  upstreamNodes: UpstreamNodeInfo[];
  onSelect: (expr: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (upstreamNodes.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover/input:opacity-100 [&[data-popup-open]]:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Braces size={13} />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={6} className="w-64 p-3">
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            插入引用
          </p>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {upstreamNodes.map((node) => (
              <div key={node.id} className="space-y-0.5">
                <p className="truncate text-xs font-medium text-foreground/70">{node.label}</p>
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
  onChange,
}: {
  name: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  upstreamNodes: UpstreamNodeInfo[];
  onChange: (val: unknown) => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

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
          el.setSelectionRange(start + expr.length, start + expr.length);
        });
      } else {
        const cur = value === undefined || value === null ? "" : String(value);
        onChange(cur + expr);
      }
    },
    [value, onChange],
  );

  const refHelper =
    upstreamNodes.length > 0 ? (
      <ExpressionRefHelper upstreamNodes={upstreamNodes} onSelect={insertExpr} />
    ) : null;
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
            onChange={(e) => onChange(e.target.value)}
            className={textareaBaseClasses + " pr-8"}
          />
          {refHelper}
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
          onChange={(e) => onChange(e.target.value)}
          className={inputBaseClasses + " pr-8"}
        />
        {refHelper}
      </div>
    </div>
  );
}

// ========================================
// Main Panel Component
// ========================================

export function NodeConfigPanel({
  currentConfig,
  schema,
  skipFields,
  upstreamNodes,
  getNodeDef,
  onChange,
}: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(currentConfig);

  const typedSchema = schema as JsonSchema;
  const properties = typedSchema.properties ?? {};
  const requiredSet = new Set(typedSchema.required ?? []);

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
          onChange={(val) => handleFieldChange(key, val)}
        />
      ))}
    </div>
  );
}

import { useState, useCallback } from "react";
import { Label } from "@ecoctrl/ui/label";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Textarea } from "@ecoctrl/ui/textarea";

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
  onChange: (config: Record<string, unknown>) => void;
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
  onChange,
}: {
  name: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  onChange: (val: unknown) => void;
}) {
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
        <Textarea
          id={inputId}
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={prop.placeholder ?? `请输入 ${label}`}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          className={textareaBaseClasses}
        />
      </div>
    );
  }

  // Default: string input
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} inputId={inputId} />
      <FieldDescription text={description} />
      <Input
        id={inputId}
        type={prop.format === "password" ? "password" : "text"}
        value={value === undefined || value === null ? "" : String(value)}
        placeholder={prop.placeholder ?? `请输入 ${label}`}
        minLength={prop.minLength}
        maxLength={prop.maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={inputBaseClasses}
      />
    </div>
  );
}

// ========================================
// Main Panel Component
// ========================================

export function NodeConfigPanel({ currentConfig, schema, onChange }: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(currentConfig);

  const typedSchema = schema as JsonSchema;
  const properties = typedSchema.properties ?? {};
  const requiredSet = new Set(typedSchema.required ?? []);

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

  const propertyEntries = Object.entries(properties);

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
          onChange={(val) => handleFieldChange(key, val)}
        />
      ))}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

interface NodeConfigPanelProps {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  currentConfig: Record<string, unknown>;
  schema: Record<string, unknown>;
  availableVersions: string[];
  currentVersion: string;
  onChange: (config: Record<string, unknown>) => void;
  onVersionChange: (version: string) => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  nodeName,
  schema,
  currentConfig,
  availableVersions,
  currentVersion,
  onChange,
  onVersionChange,
}) => {
  const [formData, setFormData] = useState(currentConfig);

  const uiSchema = useMemo(
    () => ({
      "ui:submitButtonOptions": {
        norender: true,
      },
    }),
    [],
  );

  return (
    <div className="w-80 border-l bg-background p-4 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-lg">{nodeName}</h3>
        <p className="text-sm text-muted-foreground">配置节点参数</p>
      </div>

      {availableVersions.length > 1 && (
        <div>
          <label className="text-sm font-medium">版本</label>
          <select
            value={currentVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            className="w-full mt-1 rounded border px-2 py-1 text-sm"
          >
            {availableVersions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <Form
          schema={schema}
          uiSchema={uiSchema}
          validator={validator}
          formData={formData}
          onChange={(e) => {
            setFormData(e.formData);
            onChange(e.formData);
          }}
        />
      </div>
    </div>
  );
};

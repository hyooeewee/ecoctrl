import { describe, it, expect } from "vitest";
import { useWidgetDataStore } from "./widgetData";

describe("widgetData store", () => {
  it("should set widget data", () => {
    useWidgetDataStore.getState().setWidgetData("widget-1", { value: "100" });
    expect(useWidgetDataStore.getState().dataMap["widget-1"]).toEqual({ value: "100" });
  });

  it("should remove widget data", () => {
    useWidgetDataStore.getState().setWidgetData("widget-1", { value: "100" });
    useWidgetDataStore.getState().removeWidgetData("widget-1");
    expect(useWidgetDataStore.getState().dataMap["widget-1"]).toBeUndefined();
  });

  it("should clear all widget data", () => {
    useWidgetDataStore.getState().setWidgetData("widget-1", { value: "100" });
    useWidgetDataStore.getState().clearAll();
    expect(Object.keys(useWidgetDataStore.getState().dataMap)).toHaveLength(0);
  });
});

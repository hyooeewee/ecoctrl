import { describe, it, expect } from "vitest";
import { extractReferencedNodeIds } from "@/engine/upstream-resolver";

describe("extractReferencedNodeIds", () => {
  it("collects simple node references", () => {
    const config = { pointName: "{{nodeA.output}}" };
    expect(extractReferencedNodeIds(config)).toEqual(new Set(["nodeA"]));
  });

  it("collects deep node references", () => {
    const config = { url: "{{nodeA.data.items[0].name}}" };
    expect(extractReferencedNodeIds(config)).toEqual(new Set(["nodeA"]));
  });

  it("ignores reserved namespaces", () => {
    const config = {
      a: "{{var.FOO}}",
      b: "{{vars.bar}}",
      c: "{{secret.TOKEN}}",
      d: "{{trigger.data.id}}",
      e: "{{now()}}",
      f: "{{uuid()}}",
    };
    expect(extractReferencedNodeIds(config)).toEqual(new Set());
  });

  it("recursively scans nested objects and arrays", () => {
    const config = {
      list: ["{{nodeA.x}}", { value: "{{nodeB.y}}" }],
      nested: {
        deep: {
          text: "prefix {{nodeC.z}} suffix",
        },
      },
    };
    expect(extractReferencedNodeIds(config)).toEqual(new Set(["nodeA", "nodeB", "nodeC"]));
  });

  it("collects known node IDs from expressions", () => {
    const config = { condition: "{{nodeA.value > nodeB.value}}" };
    const allNodeIds = new Set(["nodeA", "nodeB", "nodeC"]);
    expect(extractReferencedNodeIds(config, allNodeIds)).toEqual(new Set(["nodeA", "nodeB"]));
  });

  it("does not treat unknown identifiers in expressions as node references", () => {
    const config = { condition: "{{value > 5}}" };
    const allNodeIds = new Set(["nodeA"]);
    expect(extractReferencedNodeIds(config, allNodeIds)).toEqual(new Set());
  });
});

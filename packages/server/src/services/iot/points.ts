import { iotRequest } from "./client";

interface ReadOptions {
  codes: string[];
}

interface WriteOptions {
  codes: string[];
  values: Record<string, unknown>;
}

export async function readPointValues(codes: string[]): Promise<Record<string, unknown>> {
  const res = await iotRequest("/_webtalk/_cur/api/getCodesVal", {
    method: "POST",
    body: JSON.stringify({ codes } satisfies ReadOptions),
  });
  // Exclude metadata fields, keep only code -> value mappings
  const { code, msg, ...values } = res as Record<string, unknown>;
  void code;
  void msg;
  return values;
}

export async function writePointValues(
  codes: string[],
  values: Record<string, unknown>,
): Promise<void> {
  await iotRequest("/_webtalk/_cur/api/setCodesVal", {
    method: "POST",
    body: JSON.stringify({ codes, values } satisfies WriteOptions),
  });
}

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getModelCatalogPath, parseModelCatalog } from "shared";

type CatalogEntry = ReturnType<typeof parseModelCatalog>[number];

function pricePerMillion(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed * 1_000_000 : 0;
}

async function fetchOpenRouter(): Promise<CatalogEntry[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  if (!response.ok)
    throw new Error(`OpenRouter catalog returned ${response.status}`);
  const body = (await response.json()) as { data?: Array<Record<string, any>> };
  return (body.data ?? []).map((model) => ({
    id: `openrouter:${model.id}`,
    provider: "openrouter" as const,
    providerModelId: String(model.id),
    pricing: {
      inputUsdPerMillionTokens: pricePerMillion(model.pricing?.prompt),
      outputUsdPerMillionTokens: pricePerMillion(model.pricing?.completion),
    },
    meta: {
      displayName: String(model.name ?? model.id),
      contextWindow: Number(model.context_length ?? 128_000),
    },
  }));
}

async function fetchOllama(): Promise<CatalogEntry[]> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const response = await fetch(`${baseUrl.replace(/\/v1\/?$/, "")}/api/tags`);
  if (!response.ok)
    throw new Error(`Ollama catalog returned ${response.status}`);
  const body = (await response.json()) as { models?: Array<{ name?: string }> };
  return (body.models ?? []).flatMap((model) => {
    if (!model.name) return [];
    return [
      {
        id: `ollama:${model.name}`,
        provider: "ollama" as const,
        providerModelId: model.name,
        pricing: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 },
        meta: { displayName: `Ollama ${model.name}`, contextWindow: 32_768 },
      },
    ];
  });
}

export async function updateModels(): Promise<{
  path: string;
  count: number;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const results = await Promise.allSettled([fetchOpenRouter(), fetchOllama()]);
  const models = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    warnings.push(`${index === 0 ? "OpenRouter" : "Ollama"}: ${result.reason}`);
    return [];
  });
  if (models.length === 0)
    throw new Error(`No model catalogs could be loaded. ${warnings.join(" ")}`);
  const catalog = parseModelCatalog(models);
  const path = getModelCatalogPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return { path, count: catalog.length, warnings };
}

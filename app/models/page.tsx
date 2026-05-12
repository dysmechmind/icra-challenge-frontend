"use client";

import { useEffect, useMemo, useState } from "react";

type ModelRow = {
  id: string;
  upstream_model: string;
  region: string;
  provider_chain: string[];
  input_price_per_1k: number;
  output_price_per_1k: number;
  is_active: boolean;
};

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function ModelsPage() {
  const apiBase = defaultApiBase.replace(/\/$/, "");
  const [models, setModels] = useState<ModelRow[]>([]);
  const [region, setRegion] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase}/api/v1/models`);
        const data = (await res.json()) as { data?: ModelRow[] };
        setModels(data.data ?? []);
      } catch {
        setModels([]);
      }
    }
    void load();
  }, [apiBase]);

  const regions = useMemo(() => {
    const set = new Set(models.map((m) => m.region));
    return ["all", ...Array.from(set)];
  }, [models]);

  const filtered = useMemo(() => {
    if (region === "all") return models;
    return models.filter((m) => m.region === region);
  }, [models, region]);

  return (
    <div className="orx-page-shell">
      <main className="orx-subpage-shell">
        <section className="orx-subpage-hero">
          <p>Models Marketplace</p>
          <h1>统一模型目录</h1>
          <span>在一个控制面板中比较模型能力、区域和价格。</span>
        </section>

        <section className="orx-sub-toolbar">
          <label htmlFor="region">Region</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span>{filtered.length} models</span>
        </section>

        <section className="orx-sub-grid">
          {filtered.length === 0 ? (
            <article className="orx-sub-card">
              <h2>暂无模型</h2>
              <p>请在控制台管理员页面配置模型目录。</p>
            </article>
          ) : (
            filtered.map((model) => (
              <article className="orx-sub-card" key={model.id}>
                <h2>{model.id}</h2>
                <p>Upstream: {model.upstream_model}</p>
                <p>Region: {model.region}</p>
                <p>Providers: {model.provider_chain.join(", ")}</p>
                <p>Input / 1K: ${model.input_price_per_1k}</p>
                <p>Output / 1K: ${model.output_price_per_1k}</p>
                <p>Status: {model.is_active ? "active" : "inactive"}</p>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

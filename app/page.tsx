"use client";

import { useEffect, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type Lang = "en" | "zh";

const i18n = {
  en: {
    nav: { models: "Models", pricing: "Pricing", playground: "Playground", routing: "Routing", billing: "Billing", docs: "Docs", login: "Sign In", start: "Get Started", dashboard: "Dashboard" },
    hero: {
      kicker: "UNIFIED AI MODEL GATEWAY",
      title: "One API. Every Model.",
      titleHighlight: "Intelligent Routing.",
      subtitle: "Access 100+ LLMs through a single OpenAI-compatible endpoint. Route requests by latency, cost, or quality. Pay only for what you use.",
      copy: "Copy",
      copied: "Copied",
      cta1: "Start Building — Free",
      cta2: "View Documentation",
      metric1Label: "Models Online",
      metric2Label: "Uptime SLA",
      metric3Label: "Avg Latency Overhead",
    },
    features: {
      kicker: "WHY TOKEN ROUTER",
      title: "Infrastructure that scales with you",
      subtitle: "From prototype to production, one gateway handles model access, failover, cost control, and observability.",
      cards: [
        { title: "OpenAI-Compatible API", desc: "Drop-in replacement. Change your base URL, keep your SDK. Works with Python, Node.js, Go, Rust, and any HTTP client." },
        { title: "Smart Routing Engine", desc: "Route by latency, cost, quality, or custom weights. Circuit breaker auto-recovers failed providers within seconds." },
        { title: "Unified Billing", desc: "One bill across all providers. Per-token cost tracking, budget alerts, team-level spend controls, and detailed ledger." },
        { title: "Multi-Provider Failover", desc: "If OpenAI goes down, traffic shifts to Azure or domestic alternatives automatically. Zero downtime for your users." },
        { title: "Real-Time Observability", desc: "Live dashboard showing request volume, latency percentiles, provider health, and circuit breaker states." },
        { title: "Enterprise-Ready Security", desc: "API key management, rate limiting, balance pre-checks, audit logs, and role-based access control." },
      ],
    },
    code: {
      kicker: "INTEGRATION",
      title: "Three lines to switch",
      subtitle: "Keep your existing OpenAI SDK. Just change the base URL and API key.",
    },
    models: {
      kicker: "MODEL CATALOG",
      title: "Access top models from one endpoint",
      subtitle: "GPT-4o, Claude, Gemini, DeepSeek, Qwen, and more — all through the same interface.",
      viewAll: "View All Models →",
    },
    routing: {
      kicker: "ROUTING STRATEGIES",
      title: "From calling models to orchestrating intelligence",
      cards: [
        { title: "Latency-Optimized", desc: "Prioritize response time for real-time applications. Auto-fallback on timeout." },
        { title: "Cost-Optimized", desc: "Minimize spend per request. Route to the cheapest capable model automatically." },
        { title: "Quality-First", desc: "Use the highest-quality model for critical tasks, cheaper alternatives for bulk." },
        { title: "Failover & Recovery", desc: "Circuit breaker pattern with automatic health checks and provider re-enablement." },
      ],
    },
    pricing: {
      kicker: "PRICING",
      title: "Simple, transparent, usage-based",
      subtitle: "No markup on model costs. Pay a flat platform fee plus pass-through token pricing.",
      cards: [
        { name: "Free", price: "$0", period: "", subtitle: "For exploration", features: ["Pay-per-use tokens", "Basic routing", "Community support", "2 models"] },
        { name: "Pro", price: "$49", period: "/mo", subtitle: "For teams", features: ["Priority routing", "Budget alerts", "Team billing", "All models", "Email support"] },
        { name: "Scale", price: "$299", period: "/mo", subtitle: "For production", features: ["Multi-region failover", "Custom routing rules", "Dedicated support", "SLA guarantee", "Audit logs"] },
        { name: "Enterprise", price: "Custom", period: "", subtitle: "For organizations", features: ["Private deployment", "Compliance & audit", "SSO & RBAC", "Custom SLA", "Dedicated engineer"] },
      ],
    },
    cta: {
      title: "Ready to unify your AI infrastructure?",
      subtitle: "Start routing in under 5 minutes. No credit card required.",
      btn1: "Create Free Account",
      btn2: "Talk to Sales",
    },
    footer: {
      product: "Product",
      resources: "Resources",
      company: "Company",
      docs: "Documentation",
      status: "System Status",
      changelog: "Changelog",
      about: "About",
      contact: "Contact",
      terms: "Terms",
      privacy: "Privacy",
      copyright: "© 2024 TokenRouter. All rights reserved.",
    },
  },
  zh: {
    nav: { models: "模型", pricing: "定价", playground: "Playground", routing: "路由监控", billing: "账单", docs: "文档", login: "登录", start: "开始使用", dashboard: "控制台" },
    hero: {
      kicker: "统一 AI 模型网关",
      title: "一个 API，所有模型，",
      titleHighlight: "智能路由。",
      subtitle: "通过单一 OpenAI 兼容端点访问 100+ 大语言模型。按延迟、成本或质量智能路由请求，按量付费。",
      copy: "复制",
      copied: "已复制",
      cta1: "免费开始构建",
      cta2: "查看文档",
      metric1Label: "在线模型",
      metric2Label: "可用性 SLA",
      metric3Label: "平均额外延迟",
    },
    features: {
      kicker: "为什么选择 TOKEN ROUTER",
      title: "随业务规模扩展的基础设施",
      subtitle: "从原型到生产，一个网关解决模型接入、故障转移、成本控制和可观测性。",
      cards: [
        { title: "OpenAI 兼容 API", desc: "即插即用。更换 Base URL 即可，保持现有 SDK。支持 Python、Node.js、Go、Rust 及任何 HTTP 客户端。" },
        { title: "智能路由引擎", desc: "按延迟、成本、质量或自定义权重路由。熔断器在数秒内自动恢复故障供应商。" },
        { title: "统一计费", desc: "跨所有供应商一张账单。按 Token 成本追踪、预算告警、团队级消费管控、详细流水。" },
        { title: "多供应商故障转移", desc: "OpenAI 宕机时，流量自动切换到 Azure 或国内替代方案。用户零感知。" },
        { title: "实时可观测性", desc: "实时仪表板展示请求量、延迟分位数、供应商健康状态和熔断器状态。" },
        { title: "企业级安全", desc: "API Key 管理、速率限制、余额预检、审计日志和基于角色的访问控制。" },
      ],
    },
    code: {
      kicker: "快速集成",
      title: "三行代码完成切换",
      subtitle: "保持现有 OpenAI SDK 不变，只需更换 Base URL 和 API Key。",
    },
    models: {
      kicker: "模型目录",
      title: "通过一个端点访问顶级模型",
      subtitle: "GPT-4o、Claude、Gemini、DeepSeek、Qwen 等——全部通过相同接口。每周新增模型。",
      viewAll: "查看所有模型 →",
    },
    routing: {
      kicker: "路由策略",
      title: "从调用模型升级为编排智能",
      cards: [
        { title: "延迟优先", desc: "为实时应用优先响应速度，超时自动降级。" },
        { title: "成本优先", desc: "最小化每次请求的花费，自动路由到最经济的可用模型。" },
        { title: "质量优先", desc: "关键任务使用最高质量模型，批量任务使用高性价比替代。" },
        { title: "故障恢复", desc: "熔断器模式配合自动健康检查和供应商重新启用。" },
      ],
    },
    pricing: {
      kicker: "定价方案",
      title: "简单、透明、按量计费",
      subtitle: "模型成本零加价。只需支付平台费加上透传的 Token 价格。",
      cards: [
        { name: "免费版", price: "$0", period: "", subtitle: "用于探索", features: ["按用量付费", "基础路由", "社区支持", "2 个模型"] },
        { name: "专业版", price: "$49", period: "/月", subtitle: "适合团队", features: ["优先路由", "预算告警", "团队账单", "全部模型", "邮件支持"] },
        { name: "规模版", price: "$299", period: "/月", subtitle: "适合生产", features: ["多区域容灾", "自定义路由", "专属支持", "SLA 保障", "审计日志"] },
        { name: "企业版", price: "定制", period: "", subtitle: "适合组织", features: ["私有部署", "合规审计", "SSO & RBAC", "定制 SLA", "专属工程师"] },
      ],
    },
    cta: {
      title: "准备好统一你的 AI 基础设施了吗？",
      subtitle: "5 分钟内开始路由。无需信用卡。",
      btn1: "创建免费账户",
      btn2: "联系销售",
    },
    footer: {
      product: "产品",
      resources: "资源",
      company: "公司",
      docs: "文档",
      status: "系统状态",
      changelog: "更新日志",
      about: "关于我们",
      contact: "联系我们",
      terms: "服务条款",
      privacy: "隐私政策",
      copyright: "© 2024 TokenRouter. 保留所有权利。",
    },
  },
};

type ModelRow = {
  id: string;
  upstream_model?: string;
  region: string;
  provider_chain: string[];
  input_price_per_1k: number;
  output_price_per_1k: number;
  is_active?: boolean;
};

export default function Home() {
  const apiBase = defaultApiBase.replace(/\/$/, "");
  const [lang, setLang] = useState<Lang>("en");
  const [sessionToken, setSessionToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelRow[]>([]);

  const t = i18n[lang];

  useEffect(() => {
    void refreshPublicModels();
    const storedSession = window.localStorage.getItem("session_token") ?? "";
    if (storedSession) setSessionToken(storedSession);
  }, []);

  async function refreshPublicModels() {
    try {
      const res = await fetch(`${apiBase}/api/v1/models`);
      const data = (await res.json()) as { data?: ModelRow[] };
      setAvailableModels(data.data ?? []);
    } catch {
      setAvailableModels([]);
    }
  }

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(`${apiBase}/v1`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div className="orx-page-shell">
      <div className="orx-orb orx-orb-left" />
      <div className="orx-orb orx-orb-right" />

      {/* ─── HEADER ─── */}
      <header className="orx-site-nav">
        <div className="orx-brand-lockup">
          <span className="orx-brand-mark" />
          <span className="orx-brand-name">TokenRouter</span>
        </div>
        <nav className="orx-nav-links">
          <a href="/models">{t.nav.models}</a>
          <a href="/pricing">{t.nav.pricing}</a>
          <a href="/playground">{t.nav.playground}</a>
          <a href="/routing">{t.nav.routing}</a>
          <a href="/billing">{t.nav.billing}</a>
          <a href="/docs">{t.nav.docs}</a>
        </nav>
        <div className="orx-nav-actions">
          <button className="orx-lang-toggle" onClick={() => setLang(lang === "en" ? "zh" : "en")} type="button">
            {lang === "en" ? "中文" : "EN"}
          </button>
          <a className="orx-nav-ghost" href="/login">{t.nav.login}</a>
          <a className="orx-nav-primary" href={sessionToken ? "/console" : "/register"}>
            {sessionToken ? t.nav.dashboard : t.nav.start}
          </a>
        </div>
      </header>

      <main className="orx-landing-shell" id="top">
        {/* ─── HERO ─── */}
        <section className="orx-hero-layout">
          <div className="orx-hero-copy">
            <p className="orx-hero-kicker">{t.hero.kicker}</p>
            <h1 className="orx-hero-title">
              {t.hero.title}
              <span className="orx-hero-highlight">{t.hero.titleHighlight}</span>
            </h1>
            <p className="orx-hero-subtitle">{t.hero.subtitle}</p>

            <div className="orx-endpoint-pill">
              <code className="orx-endpoint-value">{apiBase}/v1</code>
              <button className="orx-endpoint-copy" onClick={copyEndpoint} type="button">
                {copied ? t.hero.copied : t.hero.copy}
              </button>
            </div>

            <div className="orx-hero-actions">
              <a className="orx-cta-primary" href={sessionToken ? "/console" : "/register"}>
                {t.hero.cta1}
              </a>
              <a className="orx-cta-secondary" href="/docs">
                {t.hero.cta2}
              </a>
            </div>

            <div className="orx-hero-metrics">
              <div className="orx-metric-chip">
                <strong>{availableModels.length || 2}</strong>
                <span>{t.hero.metric1Label}</span>
              </div>
              <div className="orx-metric-chip">
                <strong>99.95%</strong>
                <span>{t.hero.metric2Label}</span>
              </div>
              <div className="orx-metric-chip">
                <strong>&lt;50ms</strong>
                <span>{t.hero.metric3Label}</span>
              </div>
            </div>
          </div>

          <div className="orx-hero-stack">
            <article className="orx-glass-card orx-glass-card-primary">
              <p className="orx-glass-label">Quick Start</p>
              <pre className="orx-hero-code">{`curl ${apiBase}/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Hello"}]
  }'`}</pre>
            </article>

            <article className="orx-glass-card orx-glass-card-secondary">
              <p className="orx-glass-label">Live Models</p>
              <div className="orx-model-badges">
                {(availableModels.length > 0 ? availableModels : [{ id: "gpt-4o-mini" }, { id: "deepseek-chat" }] as ModelRow[]).slice(0, 6).map((item) => (
                  <span className="orx-model-badge" key={item.id}>{item.id}</span>
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section className="orx-section" id="features">
          <div className="orx-section-heading">
            <p>{t.features.kicker}</p>
            <h2>{t.features.title}</h2>
            <p className="orx-section-subtitle">{t.features.subtitle}</p>
          </div>
          <div className="orx-features-grid">
            {t.features.cards.map((card) => (
              <article className="orx-feature-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── CODE EXAMPLE ─── */}
        <section className="orx-section" id="integration">
          <div className="orx-section-heading">
            <p>{t.code.kicker}</p>
            <h2>{t.code.title}</h2>
            <p className="orx-section-subtitle">{t.code.subtitle}</p>
          </div>
          <div className="orx-code-showcase">
            <div className="orx-code-tabs">
              <span className="active">Python</span>
              <span>Node.js</span>
              <span>cURL</span>
            </div>
            <pre className="orx-code-block">{`from openai import OpenAI

client = OpenAI(
    base_url="${apiBase}/v1",
    api_key="sk_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    extra_body={"route": "latency"}  # optional routing strategy
)

print(response.choices[0].message.content)`}</pre>
          </div>
        </section>

        {/* ─── ROUTING ─── */}
        <section className="orx-section" id="routing-section">
          <div className="orx-section-heading">
            <p>{t.routing.kicker}</p>
            <h2>{t.routing.title}</h2>
          </div>
          <div className="orx-route-grid">
            {t.routing.cards.map((card) => (
              <article className="orx-route-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── MODELS TABLE ─── */}
        <section className="orx-section" id="models-section">
          <div className="orx-section-heading">
            <p>{t.models.kicker}</p>
            <h2>{t.models.title}</h2>
            <p className="orx-section-subtitle">{t.models.subtitle}</p>
          </div>
          <div className="orx-model-table-wrap">
            <table className="orx-model-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Region</th>
                </tr>
              </thead>
              <tbody>
                {(availableModels.length > 0 ? availableModels : [
                  { id: "gpt-4o-mini", provider_chain: ["openai"], input_price_per_1k: 0.001, output_price_per_1k: 0.002, region: "global" },
                  { id: "deepseek-chat", provider_chain: ["domestic"], input_price_per_1k: 0.0004, output_price_per_1k: 0.0008, region: "cn" },
                ] as ModelRow[]).map((m) => (
                  <tr key={m.id}>
                    <td><code>{m.id}</code></td>
                    <td>{m.provider_chain?.[0] || "-"}</td>
                    <td>${m.input_price_per_1k}/1K</td>
                    <td>${m.output_price_per_1k}/1K</td>
                    <td><span className="orx-region-badge">{m.region}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="orx-model-table-footer">
              <a href="/models">{t.models.viewAll}</a>
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="orx-section" id="pricing-section">
          <div className="orx-section-heading">
            <p>{t.pricing.kicker}</p>
            <h2>{t.pricing.title}</h2>
            <p className="orx-section-subtitle">{t.pricing.subtitle}</p>
          </div>
          <div className="orx-pricing-grid">
            {t.pricing.cards.map((card) => (
              <article className="orx-price-card" key={card.name}>
                <p className="orx-price-tier">{card.name}</p>
                <h3>{card.price}<span className="orx-price-period">{card.period}</span></h3>
                <p className="orx-price-subtitle">{card.subtitle}</p>
                <ul>
                  {card.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="orx-section orx-cta-section" id="start">
          <h2>{t.cta.title}</h2>
          <p>{t.cta.subtitle}</p>
          <div className="orx-hero-actions">
            <a className="orx-cta-primary" href={sessionToken ? "/console" : "/register"}>
              {t.cta.btn1}
            </a>
            <a className="orx-cta-secondary" href="/docs">
              {t.cta.btn2}
            </a>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="orx-footer">
        <div className="orx-footer-grid">
          <div className="orx-footer-brand">
            <span className="orx-brand-name">TokenRouter</span>
            <p>{lang === "en" ? "Unified AI Model Gateway" : "统一 AI 模型网关"}</p>
          </div>
          <div className="orx-footer-col">
            <h4>{t.footer.product}</h4>
            <a href="/models">{t.nav.models}</a>
            <a href="/pricing">{t.nav.pricing}</a>
            <a href="/playground">{t.nav.playground}</a>
            <a href="/routing">{t.nav.routing}</a>
          </div>
          <div className="orx-footer-col">
            <h4>{t.footer.resources}</h4>
            <a href="/docs">{t.footer.docs}</a>
            <a href="/routing">{t.footer.status}</a>
            <a href="/docs">{t.footer.changelog}</a>
          </div>
          <div className="orx-footer-col">
            <h4>{t.footer.company}</h4>
            <a href="#">{t.footer.about}</a>
            <a href="#">{t.footer.contact}</a>
            <a href="#">{t.footer.terms}</a>
          </div>
        </div>
        <div className="orx-footer-bottom">
          <p>{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}


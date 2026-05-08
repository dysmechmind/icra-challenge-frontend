"use client";

import { useEffect, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const quickGuides = [
  {
    title: "新手接入指南",
    description: "为首次接入的团队准备的端到端说明，包含获取额度、创建 Key 和切换模型地址。",
    link: "/console",
  },
  {
    title: "Claude Code",
    description: "面向终端开发工作流的接入示例，适合需要稳定海外模型访问的工程场景。",
    link: "/console",
  },
  {
    title: "OpenClaw",
    description: "适合 24/7 自动化代理与任务流，支持多上游切换和更细颗粒度的成本控制。",
    link: "/console",
  },
  {
    title: "Codex CLI",
    description: "为命令行智能编程和代码理解场景预设的网关入口，便于快速替换现有 base URL。",
    link: "/console",
  },
];

const marketHighlights = [
  {
    title: "国内用户",
    description: "稳定访问海外模型，统一鉴权、故障切换、限流和账单管理。",
    points: ["OpenAI 兼容接口", "失败自动回退", "用量与成本实时可见"],
  },
  {
    title: "海外用户",
    description: "用更低价格调用中文与国产模型，保留一致的 API 体验和计费方式。",
    points: ["国内模型池", "区域路由策略", "模型价格在线管理"],
  },
];

type ModelRow = {
  id: string;
  upstream_model: string;
  region: string;
  provider_chain: string[];
  input_price_per_1k: number;
  output_price_per_1k: number;
  is_active: boolean;
};

export default function Home() {
  const apiBase = defaultApiBase.replace(/\/$/, "");
  const [sessionToken, setSessionToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelRow[]>([]);

  useEffect(() => {
    void refreshPublicModels();
    const storedSession = window.localStorage.getItem("token-router-session") ?? "";
    if (storedSession) setSessionToken(storedSession);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await navigator.clipboard.writeText(apiBase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }


  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="site-nav">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <span className="brand-name">token-router</span>
        </div>
        <nav className="nav-links">
          <a href="#top">首页</a>
          <a href="/console">控制台</a>
          <a href="#market">模型广场</a>
          <a href="#guides">文档</a>
          <a href="#about">关于</a>
        </nav>
        <div className="nav-actions">
          <a className="nav-ghost" href="/login">
            登录
          </a>
          <a className="nav-primary" href={sessionToken ? "/console" : "/register"}>
            {sessionToken ? "账户中心" : "注册"}
          </a>
        </div>
      </header>

      <main className="landing-shell" id="top">
        <section className="hero-layout">
          <div className="hero-copy">
            <p className="hero-kicker">专业的</p>
            <h1 className="hero-title">
              全平台 <span>AI 接入网关</span>
            </h1>
            <p className="hero-subtitle">
              更好的价格，更好的稳定性，只需要将模型基础地址替换为统一网关，即可同时服务国内与海外用户。
            </p>

            <div className="endpoint-pill">
              <span className="endpoint-value">{apiBase}</span>
              <button className="endpoint-copy" onClick={copyEndpoint} type="button">
                {copied ? "已复制" : "复制"}
              </button>
            </div>

            <div className="hero-actions">
              <a className="cta-primary" href={sessionToken ? "/console" : "/register"}>
                {sessionToken ? "进入控制台" : "开始使用"}
              </a>
              <button className="cta-secondary" onClick={refreshPublicModels} type="button">
                刷新模型
              </button>
            </div>

            <div className="hero-metrics">
              <div className="metric-chip">
                <strong>{availableModels.length || 2}</strong>
                <span>已激活模型</span>
              </div>
              <div className="metric-chip">
                <strong>20</strong>
                <span>默认 RPM</span>
              </div>
            </div>
          </div>

          <div className="hero-stack">
            <article className="glass-card glass-card-primary">
              <p className="glass-label">Gateway Status</p>
              <h2>统一路由 / 统一计费 / 统一风控</h2>
              <ul>
                <li>支持模型自动切换与故障回退</li>
                <li>订单、流水、Key 与价格统一管理</li>
                <li>适合 CLI、Agent 与 API 平台场景</li>
              </ul>
            </article>

            <article className="glass-card glass-card-secondary">
              <p className="glass-label">当前可用模型</p>
              <div className="model-badges">
                {availableModels.length === 0 ? (
                  <span className="model-badge">gpt-4o-mini</span>
                ) : (
                  availableModels.slice(0, 4).map((item) => (
                    <span className="model-badge" key={item.id}>
                      {item.id}
                    </span>
                  ))
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="guides-shell" id="guides">
          <div className="section-heading">
            <p>快速接入指南</p>
            <h2>从获取额度到接入生产流量，保留统一入口</h2>
          </div>
          <div className="guide-grid">
            {quickGuides.map((guide) => (
              <a className="guide-card" href={guide.link} key={guide.title}>
                <div className="guide-icon">+</div>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <span>查看教程</span>
              </a>
            ))}
          </div>
        </section>

        <section className="market-shell" id="market">
          <div className="section-heading compact">
            <p>双边市场</p>
            <h2>同一个产品，服务两类用户</h2>
          </div>
          <div className="market-grid">
            {marketHighlights.map((entry) => (
              <article className="market-card" key={entry.title}>
                <h3>{entry.title}</h3>
                <p>{entry.description}</p>
                <ul>
                  {entry.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="about-shell" id="about">
          <div className="section-heading compact">
            <p>关于平台</p>
            <h2>目标不是另一个简单转发器，而是可运营的 AI 网关底座</h2>
          </div>
        </section>
      </main>
    </div>
  );
}

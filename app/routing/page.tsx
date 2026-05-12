"use client";

import { useEffect, useState, useCallback } from "react";

const defaultApiBase =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ProviderHealth = {
  name: string;
  circuit_state: "closed" | "open" | "half-open";
  is_available: boolean;
  avg_latency_ms: number;
  recent_latency_ms: number;
  success_rate: number;
  total_requests: number;
  total_successes: number;
  total_failures: number;
  consecutive_failures: number;
  last_success: number;
  last_failure: number;
};

type HealthResponse = {
  providers: ProviderHealth[];
  strategies: string[];
};

const STRATEGY_INFO: Record<string, { label: string; desc: string }> = {
  fallback: { label: "顺序回退", desc: "按配置顺序依次尝试，失败则切换下一个" },
  latency: { label: "延迟优先", desc: "自动选择响应最快的供应商" },
  cost: { label: "成本优先", desc: "优先选择价格最低的上游（按模型定价）" },
  quality: { label: "质量加权", desc: "综合成功率(60%)+延迟(40%)评分排序" },
  random: { label: "负载均衡", desc: "随机分配请求到可用供应商" },
};

export default function RoutingPage() {
  const apiBase = defaultApiBase.replace(/\/$/, "");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/routing/health`);
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth, autoRefresh]);

  function statusColor(state: string): string {
    switch (state) {
      case "closed":
        return "#10b981";
      case "half-open":
        return "#f59e0b";
      case "open":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  }

  function statusLabel(state: string): string {
    switch (state) {
      case "closed":
        return "健康";
      case "half-open":
        return "恢复中";
      case "open":
        return "熔断";
      default:
        return state;
    }
  }

  function formatTime(ts: number): string {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleTimeString();
  }

  return (
    <div className="rt-shell">
      <header className="rt-topbar">
        <a href="/" className="rt-brand">
          <span className="rt-brand-mark" />
          token-router
        </a>
        <span className="rt-topbar-title">Routing Monitor</span>
        <nav className="rt-topbar-nav">
          <a href="/playground">Playground</a>
          <a href="/models">模型</a>
          <a href="/console">控制台</a>
        </nav>
      </header>

      <main className="rt-main">
        {/* ── Header ── */}
        <div className="rt-header">
          <div>
            <h1 className="rt-title">智能路由监控</h1>
            <p className="rt-subtitle">
              实时查看各供应商健康状态、延迟表现与熔断情况
            </p>
          </div>
          <div className="rt-controls">
            <button
              className={`rt-toggle ${autoRefresh ? "rt-toggle-on" : ""}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "⟳ 自动刷新" : "⏸ 已暂停"}
            </button>
            <button className="rt-btn-refresh" onClick={fetchHealth}>
              刷新
            </button>
          </div>
        </div>

        {/* ── Strategy Cards ── */}
        <section className="rt-section">
          <h2 className="rt-section-title">路由策略</h2>
          <p className="rt-section-desc">
            在 API 请求中传入 <code>&quot;route&quot;: &quot;latency&quot;</code>{" "}
            参数即可切换策略
          </p>
          <div className="rt-strategy-grid">
            {Object.entries(STRATEGY_INFO).map(([key, info]) => (
              <div key={key} className="rt-strategy-card">
                <div className="rt-strategy-header">
                  <span className="rt-strategy-badge">{key}</span>
                  <span className="rt-strategy-label">{info.label}</span>
                </div>
                <p className="rt-strategy-desc">{info.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Provider Health ── */}
        <section className="rt-section">
          <h2 className="rt-section-title">供应商状态</h2>
          {loading ? (
            <p className="rt-loading">加载中...</p>
          ) : !health || health.providers.length === 0 ? (
            <div className="rt-empty">
              <p>暂无供应商数据。发送 API 请求后将自动出现。</p>
            </div>
          ) : (
            <div className="rt-provider-grid">
              {health.providers.map((p) => (
                <div
                  key={p.name}
                  className={`rt-provider-card ${p.circuit_state === "open" ? "rt-provider-down" : ""}`}
                >
                  {/* Status indicator */}
                  <div className="rt-provider-status">
                    <span
                      className="rt-status-dot"
                      style={{ background: statusColor(p.circuit_state) }}
                    />
                    <span className="rt-provider-name">{p.name}</span>
                    <span
                      className="rt-status-badge"
                      style={{
                        background: statusColor(p.circuit_state) + "22",
                        color: statusColor(p.circuit_state),
                      }}
                    >
                      {statusLabel(p.circuit_state)}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="rt-metrics-grid">
                    <div className="rt-metric">
                      <span className="rt-metric-label">延迟</span>
                      <span className="rt-metric-value">
                        {p.recent_latency_ms.toFixed(0)}
                        <small>ms</small>
                      </span>
                    </div>
                    <div className="rt-metric">
                      <span className="rt-metric-label">成功率</span>
                      <span className="rt-metric-value">
                        {(p.success_rate * 100).toFixed(1)}
                        <small>%</small>
                      </span>
                    </div>
                    <div className="rt-metric">
                      <span className="rt-metric-label">总请求</span>
                      <span className="rt-metric-value">
                        {p.total_requests}
                      </span>
                    </div>
                    <div className="rt-metric">
                      <span className="rt-metric-label">连续失败</span>
                      <span
                        className="rt-metric-value"
                        style={{
                          color:
                            p.consecutive_failures > 0
                              ? "#ef4444"
                              : "inherit",
                        }}
                      >
                        {p.consecutive_failures}
                      </span>
                    </div>
                  </div>

                  {/* Success rate bar */}
                  <div className="rt-rate-bar-bg">
                    <div
                      className="rt-rate-bar-fill"
                      style={{
                        width: `${p.success_rate * 100}%`,
                        background:
                          p.success_rate > 0.95
                            ? "#10b981"
                            : p.success_rate > 0.8
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="rt-provider-footer">
                    <span>
                      成功: <strong>{p.total_successes}</strong>
                    </span>
                    <span>
                      失败: <strong>{p.total_failures}</strong>
                    </span>
                    <span>最后成功: {formatTime(p.last_success)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Usage example ── */}
        <section className="rt-section">
          <h2 className="rt-section-title">使用示例</h2>
          <pre className="rt-code">{`# Python - 使用延迟优先路由
import openai

client = openai.OpenAI(
    base_url="https://token-router.online/v1",
    api_key="sk_live_your_key"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    extra_body={"route": "latency"}  # 路由策略
)

# 可选策略: fallback, latency, cost, quality, random`}</pre>
        </section>
      </main>
    </div>
  );
}

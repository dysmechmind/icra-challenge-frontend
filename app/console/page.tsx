"use client";

import { FormEvent, useEffect, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────
type MeResponse = {
  user_id?: number;
  email: string;
  balance: number;
  is_admin?: boolean;
  is_super_admin?: boolean;
  auth_method?: string;
  active_key_id?: number | null;
  limits?: { rpm?: number; daily_spend_usd?: number; today_spend_usd?: number };
  billing?: { pending_recharge_usd?: number };
};
type UsageRow = { model: string; total_tokens: number; cost: number; created_at: number };
type KeyRow = { id: number; key_mask: string; label?: string | null; last_used_at?: number | null; is_active: number };
type KeyListResponse = { data: KeyRow[]; active_key_id: number };
type AdminSettingsResponse = { rpm_limit: number; daily_spend_limit: number; detail?: string };
type RechargeOrderRow = { id: number; amount: number; channel: string; status: string; created_at: number; email?: string };
type LedgerRow = { entry_type: string; amount: number; balance_after: number; reference_type?: string | null; reference_id?: number | null; created_at: number };
type ModelRow = { id: string; upstream_model: string; region: string; provider_chain: string[]; input_price_per_1k: number; output_price_per_1k: number; is_active: boolean };

type NavSection = "dashboard" | "keys" | "usage" | "billing" | "orders" | "models" | "settings";
type NavGroup = {
  title: string;
  items: { section: NavSection; label: string; icon: string; adminOnly?: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "聊天",
    items: [
      { section: "dashboard", label: "数据看板", icon: "▦" },
      { section: "usage", label: "使用日志", icon: "≡" },
    ],
  },
  {
    title: "接续场",
    items: [
      { section: "keys", label: "令牌管理", icon: "⚿" },
      { section: "billing", label: "钱包管理", icon: "◎" },
      { section: "orders", label: "充值订单", icon: "✦" },
    ],
  },
  {
    title: "控制台",
    items: [
      { section: "models", label: "模型配置", icon: "⬡", adminOnly: true },
      { section: "settings", label: "风控配置", icon: "⚙", adminOnly: true },
    ],
  },
];

export default function ConsolePage() {
  const apiBase = defaultApiBase.replace(/\/$/, "");

  const [ready, setReady] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [keyRows, setKeyRows] = useState<KeyRow[]>([]);
  const [activeKeyId, setActiveKeyId] = useState<number | null>(null);
  const [orderRows, setOrderRows] = useState<RechargeOrderRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [adminOrderRows, setAdminOrderRows] = useState<RechargeOrderRow[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelRow[]>([]);
  const [adminModels, setAdminModels] = useState<ModelRow[]>([]);

  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("my-key");
  const [rechargeAmount, setRechargeAmount] = useState("100");
  const [rechargeChannel, setRechargeChannel] = useState("manual-review");
  const [rechargeNote, setRechargeNote] = useState("");
  const [adminSecret, setAdminSecret] = useState("dev-admin-secret");
  const [adminRpmLimit, setAdminRpmLimit] = useState("20");
  const [adminDailyLimit, setAdminDailyLimit] = useState("50");
  const [adminModelId, setAdminModelId] = useState("gpt-4o-mini");
  const [adminUpstreamModel, setAdminUpstreamModel] = useState("gpt-4o-mini");
  const [adminRegion, setAdminRegion] = useState("global");
  const [adminProviderChain, setAdminProviderChain] = useState("openai,mock");
  const [adminInputPrice, setAdminInputPrice] = useState("0.001");
  const [adminOutputPrice, setAdminOutputPrice] = useState("0.002");
  const [adminModelActive, setAdminModelActive] = useState(true);

  useEffect(() => {
    const sess = window.localStorage.getItem("token-router-session") ?? "";
    if (!sess) { window.location.href = "/login"; return; }
    const key = window.localStorage.getItem("token-router-api-key") ?? "";
    setSessionToken(sess);
    if (key) setApiKey(key);
    setReady(true);
    void loadAll(sess, key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hdrs(sess?: string, key?: string): Record<string, string> {
    const s = sess ?? sessionToken;
    const k = key ?? apiKey;
    if (s) return { "x-session-token": s };
    if (k) return { Authorization: `Bearer ${k}` };
    return {};
  }

  function msg(text: string) {
    setFlash(text);
    setTimeout(() => setFlash(""), 5000);
  }

  async function loadAll(sess?: string, key?: string) {
    const h = hdrs(sess, key);
    if (!Object.keys(h).length) return;
    setBusy(true);
    try {
      const [meR, usageR, orderR, ledgerR, keysR, modelsR] = await Promise.all([
        fetch(`${apiBase}/api/v1/me`, { headers: h }),
        fetch(`${apiBase}/api/v1/usage`, { headers: h }),
        fetch(`${apiBase}/api/v1/orders`, { headers: h }),
        fetch(`${apiBase}/api/v1/billing/ledger`, { headers: h }),
        fetch(`${apiBase}/api/v1/keys`, { headers: h }),
        fetch(`${apiBase}/api/v1/models`),
      ]);
      const meD = await meR.json() as MeResponse & { detail?: string };
      if (!meR.ok) { msg(meD.detail ?? "会话已过期"); window.location.href = "/login"; return; }
      setMe(meD);
      const usD = await usageR.json() as { data?: UsageRow[] }; setUsageRows(usD.data ?? []);
      const orD = await orderR.json() as { data?: RechargeOrderRow[] }; setOrderRows(orD.data ?? []);
      const ldD = await ledgerR.json() as { data?: LedgerRow[] }; setLedgerRows(ldD.data ?? []);
      const kyD = await keysR.json() as KeyListResponse; setKeyRows(kyD.data ?? []); setActiveKeyId(kyD.active_key_id ?? null);
      const mdD = await modelsR.json() as { data?: ModelRow[] }; setAvailableModels(mdD.data ?? []);
    } catch { msg("加载失败，请刷新重试"); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await fetch(`${apiBase}/api/v1/auth/logout`, { method: "POST", headers: hdrs() }); } catch { /* ignore */ }
    window.localStorage.removeItem("token-router-session");
    window.localStorage.removeItem("token-router-api-key");
    window.location.href = "/login";
  }

  async function createKey(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys`, {
        method: "POST", headers: { "Content-Type": "application/json", ...hdrs() },
        body: JSON.stringify({ label: newKeyLabel }),
      });
      const d = await res.json() as { api_key?: string; key_mask?: string; detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "创建失败");
      msg(`新 Key 已创建: ${d.api_key ?? d.key_mask ?? ""}`);
      await loadAll();
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function deactivateKey(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys/${id}/deactivate`, { method: "POST", headers: hdrs() });
      const d = await res.json() as { detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "停用失败");
      msg(`Key #${id} 已停用`); await loadAll();
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function createOrder(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/orders/recharge`, {
        method: "POST", headers: { "Content-Type": "application/json", ...hdrs() },
        body: JSON.stringify({ amount: Number(rechargeAmount), channel: rechargeChannel, note: rechargeNote }),
      });
      const d = await res.json() as { order_id?: number; status?: string; detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "创建失败");
      msg(`充值单 #${d.order_id} 已创建`); await loadAll();
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function loadAdminOrders() {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/orders`, { headers: { "x-admin-secret": adminSecret } });
      const d = await res.json() as { data?: RechargeOrderRow[]; detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "失败");
      setAdminOrderRows(d.data ?? []);
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function approveOrder(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/orders/${id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ operator_note: "approved", payment_reference: `manual-${id}` }),
      });
      const d = await res.json() as { new_balance?: number; detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "失败");
      msg(`订单 #${id} 已审核`);
      await Promise.all([loadAdminOrders(), loadAll()]);
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function saveAdminSettings(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ rpm_limit: Number(adminRpmLimit), daily_spend_limit: Number(adminDailyLimit) }),
      });
      const d = await res.json() as AdminSettingsResponse;
      if (!res.ok) throw new Error(d.detail ?? "失败");
      msg(`配置已保存: RPM=${d.rpm_limit}`);
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function loadAdminModels() {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/models`, { headers: { "x-admin-secret": adminSecret } });
      const d = await res.json() as { data?: ModelRow[]; detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "失败");
      setAdminModels(d.data ?? []);
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  async function saveAdminModel(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/models`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          model_id: adminModelId, upstream_model: adminUpstreamModel, region: adminRegion,
          provider_chain: adminProviderChain.split(",").map(s => s.trim()).filter(Boolean),
          input_price_per_1k: Number(adminInputPrice), output_price_per_1k: Number(adminOutputPrice),
          is_active: adminModelActive,
        }),
      });
      const d = await res.json() as { model_id?: string; detail?: string };
      if (!res.ok) throw new Error(d.detail ?? "失败");
      msg(`模型 ${d.model_id} 已保存`);
      await Promise.all([loadAdminModels(), loadAll()]);
    } catch (err) { msg(err instanceof Error ? err.message : "失败"); }
    finally { setBusy(false); }
  }

  // ── Loading splash ─────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="dash-loading">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <span className="brand-name">token-router</span>
        </div>
        <p>正在验证登录状态…</p>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const username = me?.email ?? "用户";
  const totalCost = usageRows.reduce((s, r) => s + r.cost, 0);
  const totalTokens = usageRows.reduce((s, r) => s + r.total_tokens, 0);
  const dailyEstimate = [14, 22, 19, 31, 28, 35, 26];

  return (
    <div className="dash-shell" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`dash-sidebar${sidebarOpen ? "" : " collapsed"}`}
        style={{
          width: sidebarOpen ? 240 : 64,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div className="sidebar-brand">
          <span className="brand-mark" />
          {sidebarOpen && <span className="brand-name">token-router</span>}
        </div>

        <nav className="sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !(item.adminOnly && !me?.is_super_admin));
            if (!visibleItems.length) return null;
            return (
              <div className="sidebar-group" key={group.title}>
                {sidebarOpen && <div className="sidebar-group-title">{group.title}</div>}
                {visibleItems.map((item) => (
                  <button
                    key={item.section}
                    className={`sidebar-item${activeSection === item.section ? " active" : ""}`}
                    onClick={() => setActiveSection(item.section)}
                    type="button"
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <button className="sidebar-item sidebar-logout" onClick={logout} type="button">
            <span className="sidebar-icon">⏻</span>
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div className="dash-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <header className="dash-topbar">
          <button className="topbar-toggle" onClick={() => setSidebarOpen(o => !o)} type="button">☰</button>
          <div className="topbar-right">
            {flash && <span className="topbar-flash">{flash}</span>}
            <button className="ghost-btn" disabled={busy} onClick={() => void loadAll()} type="button">
              {busy ? "加载中…" : "↻ 刷新"}
            </button>
            <div className="topbar-user">
              <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
              <span className="user-email">{username}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dash-content" style={{ flex: 1, overflowY: "auto" }}>

          {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
          {activeSection === "dashboard" && (
            <section>
              <div className="welcome-hero">
                <div>
                  <p className="welcome-sub">控制台</p>
                  <h1 className="dash-greeting">{greeting}，{username}</h1>
                  <p className="welcome-desc">统一管理账户、令牌、调用明细和充值订单，数据每次刷新后实时同步。</p>
                </div>
                <div className="welcome-stats">
                  <div className="welcome-chip">
                    <span>当前余额</span>
                    <strong>¥{(me?.balance ?? 0).toFixed(2)}</strong>
                  </div>
                  <div className="welcome-chip">
                    <span>今日消耗</span>
                    <strong>¥{(me?.limits?.today_spend_usd ?? 0).toFixed(4)}</strong>
                  </div>
                  <div className="welcome-chip">
                    <span>RPM 限额</span>
                    <strong>{me?.limits?.rpm ?? 20}</strong>
                  </div>
                </div>
              </div>

              <div className="stat-cards">
                {/* 账户数据 */}
                <div className="stat-card">
                  <p className="stat-card-title">账户数据</p>
                  <div className="stat-rows">
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>¥</span>
                      <div>
                        <p className="stat-label">当前余额</p>
                        <p className="stat-value">¥{(me?.balance ?? 0).toFixed(2)}</p>
                      </div>
                      <button className="badge-action-btn" onClick={() => setActiveSection("billing")} type="button">充值</button>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#f3e8ff", color: "#7c3aed" }}>↓</span>
                      <div>
                        <p className="stat-label">历史消耗</p>
                        <p className="stat-value">¥{totalCost.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 使用统计 */}
                <div className="stat-card">
                  <p className="stat-card-title">使用统计</p>
                  <div className="stat-rows">
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>↑</span>
                      <div><p className="stat-label">请求次数</p><p className="stat-value">{usageRows.length}</p></div>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#ccfbf1", color: "#0d9488" }}>≡</span>
                      <div><p className="stat-label">今日消耗</p><p className="stat-value">¥{(me?.limits?.today_spend_usd ?? 0).toFixed(4)}</p></div>
                    </div>
                  </div>
                </div>

                {/* 资源消耗 */}
                <div className="stat-card">
                  <p className="stat-card-title">资源消耗</p>
                  <div className="stat-rows">
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#fef9c3", color: "#ca8a04" }}>¥</span>
                      <div><p className="stat-label">统计额度</p><p className="stat-value">¥{totalCost.toFixed(4)}</p></div>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>T</span>
                      <div><p className="stat-label">统计 Tokens</p><p className="stat-value">{totalTokens}</p></div>
                    </div>
                  </div>
                </div>

                {/* 性能指标 */}
                <div className="stat-card">
                  <p className="stat-card-title">性能指标</p>
                  <div className="stat-rows">
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>◎</span>
                      <div><p className="stat-label">RPM 限额</p><p className="stat-value">{me?.limits?.rpm ?? 20}</p></div>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon" style={{ background: "#ffedd5", color: "#ea580c" }}>$</span>
                      <div><p className="stat-label">日消费上限</p><p className="stat-value">${me?.limits?.daily_spend_usd ?? "-"}</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent calls */}
              <div className="dash-section-card">
                <div className="dash-card-head">
                  <p className="dash-card-title">最近调用记录</p>
                  <button className="ghost-btn" onClick={() => setActiveSection("usage")} type="button">查看全部 →</button>
                </div>
                {usageRows.length === 0
                  ? <p className="empty-hint">暂无调用记录</p>
                  : (
                    <table className="dash-table">
                      <thead><tr><th>模型</th><th>Tokens</th><th>费用</th><th>时间</th></tr></thead>
                      <tbody>
                        {usageRows.slice(0, 6).map((row, i) => (
                          <tr key={i}>
                            <td><span className="model-tag">{row.model}</span></td>
                            <td>{row.total_tokens}</td>
                            <td>¥{row.cost.toFixed(4)}</td>
                            <td className="text-muted">{new Date(row.created_at * 1000).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>

              {/* Active keys summary */}
              <div className="dash-section-card">
                <div className="dash-card-head">
                  <p className="dash-card-title">API 令牌</p>
                  <button className="ghost-btn" onClick={() => setActiveSection("keys")} type="button">管理令牌 →</button>
                </div>
                <div className="key-chips">
                  {keyRows.filter(k => k.is_active).map(k => (
                    <div className="key-chip" key={k.id}>
                      <code>{k.key_mask}</code>
                      {k.id === activeKeyId && <span className="badge-active-sm">当前</span>}
                      {k.label && <span className="text-muted">{k.label}</span>}
                    </div>
                  ))}
                  {keyRows.filter(k => k.is_active).length === 0 && <p className="empty-hint">暂无活跃令牌</p>}
                </div>
              </div>

              {/* Models */}
              <div className="dash-section-card">
                <p className="dash-card-title">可用模型</p>
                <div className="model-chip-row">
                  {availableModels.length === 0
                    ? <span className="model-chip">gpt-4o-mini</span>
                    : availableModels.map(m => (
                      <span className="model-chip" key={m.id}>
                        {m.id} <em className="text-muted"> ({m.region})</em>
                      </span>
                    ))
                  }
                </div>
              </div>

              <div className="dash-insight-grid">
                <div className="dash-section-card">
                  <div className="dash-card-head">
                    <p className="dash-card-title">最近 7 天请求趋势</p>
                    <span className="text-muted">模拟看板</span>
                  </div>
                  <div className="lucky-chart" aria-label="最近七天请求图表">
                    <div className="lucky-grid" />
                    <div className="lucky-line-wrap">
                      {dailyEstimate.map((value, idx) => (
                        <div key={idx} className="lucky-point-wrap" style={{ left: `${(idx / (dailyEstimate.length - 1)) * 100}%`, bottom: `${value * 1.45}px` }}>
                          <span className="lucky-point" />
                        </div>
                      ))}
                    </div>
                    <div className="lucky-bars">
                      {dailyEstimate.map((value, idx) => (
                        <div key={idx} className="mini-bar-wrap">
                          <div className="mini-bar" style={{ height: `${value * 1.7}px` }} />
                          <span className="mini-bar-label">D{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dash-section-card">
                  <p className="dash-card-title">系统公告</p>
                  <ul className="bullet-list">
                    <li>新增 session 登录态管理，支持控制台独立权限。</li>
                    <li>模型路由支持上游故障自动切换，降低失败率。</li>
                    <li>管理员可在“风控配置”统一调整 RPM 与日限额。</li>
                  </ul>
                  <p className="dash-card-title" style={{ marginTop: 14 }}>FAQ</p>
                  <ul className="bullet-list">
                    <li>看不到数据：点击右上角“刷新”，确认后端 `localhost:8000` 可用。</li>
                    <li>登录后跳回登录页：清理浏览器 localStorage 后重试。</li>
                    <li>充值单一直 pending：请管理员到“充值订单”执行审核入账。</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* ══ KEYS ═══════════════════════════════════════════════════════ */}
          {activeSection === "keys" && (
            <section>
              <h2 className="section-title">令牌管理</h2>
              <div className="dash-section-card">
                <p className="dash-card-title">创建新令牌</p>
                <form className="inline-form" onSubmit={createKey}>
                  <label className="form-label">
                    标签名称
                    <input className="form-input" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                  </label>
                  <button className="primary-btn" disabled={busy} type="submit">{busy ? "创建中…" : "+ 创建 Key"}</button>
                </form>
              </div>
              <div className="dash-section-card">
                <p className="dash-card-title">令牌列表</p>
                <div className="table-wrap">
                  <table className="dash-table">
                    <thead><tr><th>ID</th><th>掩码</th><th>标签</th><th>最后使用</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {keyRows.length === 0 && <tr><td colSpan={6} className="empty-hint">暂无令牌</td></tr>}
                      {keyRows.map(row => (
                        <tr key={row.id}>
                          <td className="text-muted">#{row.id}</td>
                          <td><code className="key-mask">{row.key_mask}</code></td>
                          <td>{row.label ?? "-"}</td>
                          <td className="text-muted">{row.last_used_at ? new Date(row.last_used_at * 1000).toLocaleString() : "未使用"}</td>
                          <td>
                            <span className={`status-badge ${row.is_active ? (row.id === activeKeyId ? "badge-active" : "badge-ok") : "badge-off"}`}>
                              {row.is_active ? (row.id === activeKeyId ? "当前活跃" : "启用") : "停用"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="table-action-btn"
                              disabled={busy || !row.is_active || row.id === activeKeyId}
                              onClick={() => deactivateKey(row.id)}
                              type="button"
                            >停用</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ══ USAGE ══════════════════════════════════════════════════════ */}
          {activeSection === "usage" && (
            <section>
              <h2 className="section-title">使用日志</h2>
              <div className="dash-section-card">
                <div className="table-wrap">
                  <table className="dash-table">
                    <thead><tr><th>模型</th><th>Tokens</th><th>费用</th><th>时间</th></tr></thead>
                    <tbody>
                      {usageRows.length === 0 && <tr><td colSpan={4} className="empty-hint">暂无调用记录</td></tr>}
                      {usageRows.map((row, i) => (
                        <tr key={i}>
                          <td><span className="model-tag">{row.model}</span></td>
                          <td>{row.total_tokens}</td>
                          <td>¥{row.cost.toFixed(4)}</td>
                          <td className="text-muted">{new Date(row.created_at * 1000).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ══ BILLING ════════════════════════════════════════════════════ */}
          {activeSection === "billing" && (
            <section>
              <h2 className="section-title">钱包管理</h2>
              <div className="stat-cards" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                <div className="stat-card">
                  <p className="stat-card-title">账户余额</p>
                  <p className="balance-big">¥{(me?.balance ?? 0).toFixed(2)}</p>
                  <p className="text-muted" style={{ fontSize: "0.9rem" }}>待审核充值: ¥{(me?.billing?.pending_recharge_usd ?? 0).toFixed(2)}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-title">提交充值申请</p>
                  <form className="stack-form" onSubmit={createOrder}>
                    <label className="form-label">金额 (USD)
                      <input className="form-input" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} />
                    </label>
                    <label className="form-label">支付渠道
                      <select className="form-input" value={rechargeChannel} onChange={e => setRechargeChannel(e.target.value)}>
                        <option value="manual-review">人工审核</option>
                        <option value="bank-transfer">银行转账</option>
                        <option value="crypto-usdt">USDT</option>
                      </select>
                    </label>
                    <label className="form-label">备注（可选）
                      <input className="form-input" value={rechargeNote} onChange={e => setRechargeNote(e.target.value)} />
                    </label>
                    <button className="primary-btn" disabled={busy} type="submit">{busy ? "提交中…" : "提交充值单"}</button>
                  </form>
                </div>
              </div>

              <div className="dash-section-card">
                <p className="dash-card-title">余额流水</p>
                <div className="table-wrap">
                  <table className="dash-table">
                    <thead><tr><th>类型</th><th>金额</th><th>余额后</th><th>关联</th></tr></thead>
                    <tbody>
                      {ledgerRows.length === 0 && <tr><td colSpan={4} className="empty-hint">暂无流水记录</td></tr>}
                      {ledgerRows.map((row, i) => (
                        <tr key={i}>
                          <td>{row.entry_type}</td>
                          <td>¥{row.amount}</td>
                          <td>¥{row.balance_after}</td>
                          <td className="text-muted">{row.reference_type ?? "-"}#{row.reference_id ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ══ ORDERS ═════════════════════════════════════════════════════ */}
          {activeSection === "orders" && (
            <section>
              <h2 className="section-title">充值订单</h2>
              <div className="dash-section-card">
                <p className="dash-card-title">我的订单</p>
                <div className="table-wrap">
                  <table className="dash-table">
                    <thead><tr><th>ID</th><th>金额</th><th>渠道</th><th>状态</th></tr></thead>
                    <tbody>
                      {orderRows.length === 0 && <tr><td colSpan={4} className="empty-hint">暂无订单</td></tr>}
                      {orderRows.map(row => (
                        <tr key={row.id}>
                          <td className="text-muted">#{row.id}</td>
                          <td>¥{row.amount}</td>
                          <td>{row.channel}</td>
                          <td><span className={`status-badge ${row.status === "approved" ? "badge-active" : "badge-pending"}`}>{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {me?.is_super_admin && (
                <div className="dash-section-card">
                  <div className="dash-card-head">
                    <p className="dash-card-title">管理员 — 全部订单</p>
                    <button className="ghost-btn" disabled={busy} onClick={loadAdminOrders} type="button">加载订单</button>
                  </div>
                  <div className="table-wrap">
                    <table className="dash-table">
                      <thead><tr><th>ID</th><th>用户</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
                      <tbody>
                        {adminOrderRows.length === 0 && <tr><td colSpan={5} className="empty-hint">点击"加载订单"</td></tr>}
                        {adminOrderRows.map(row => (
                          <tr key={row.id}>
                            <td className="text-muted">#{row.id}</td>
                            <td>{row.email ?? "-"}</td>
                            <td>¥{row.amount}</td>
                            <td><span className={`status-badge ${row.status === "approved" ? "badge-active" : "badge-pending"}`}>{row.status}</span></td>
                            <td>
                              <button
                                className="table-action-btn"
                                disabled={busy || row.status !== "pending"}
                                onClick={() => approveOrder(row.id)}
                                type="button"
                              >审核入账</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ══ MODELS (admin) ══════════════════════════════════════════════ */}
          {activeSection === "models" && me?.is_super_admin && (
            <section>
              <h2 className="section-title">模型与价格配置</h2>
              <div className="dash-section-card">
                <div className="dash-card-head">
                  <p className="dash-card-title">已配置模型</p>
                  <button className="ghost-btn" disabled={busy} onClick={loadAdminModels} type="button">加载模型</button>
                </div>
                <div className="table-wrap">
                  <table className="dash-table">
                    <thead><tr><th>Model ID</th><th>地区</th><th>上游</th><th>输入/1K</th><th>输出/1K</th><th>状态</th><th>编辑</th></tr></thead>
                    <tbody>
                      {adminModels.length === 0 && <tr><td colSpan={7} className="empty-hint">点击"加载模型"</td></tr>}
                      {adminModels.map(m => (
                        <tr key={m.id}>
                          <td>{m.id}</td>
                          <td>{m.region}</td>
                          <td>{m.upstream_model}</td>
                          <td>${m.input_price_per_1k}</td>
                          <td>${m.output_price_per_1k}</td>
                          <td><span className={`status-badge ${m.is_active ? "badge-active" : "badge-off"}`}>{m.is_active ? "启用" : "停用"}</span></td>
                          <td>
                            <button className="table-action-btn" type="button" onClick={() => {
                              setAdminModelId(m.id); setAdminUpstreamModel(m.upstream_model);
                              setAdminRegion(m.region); setAdminProviderChain(m.provider_chain.join(","));
                              setAdminInputPrice(String(m.input_price_per_1k)); setAdminOutputPrice(String(m.output_price_per_1k));
                              setAdminModelActive(m.is_active);
                            }}>填入</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dash-section-card">
                <p className="dash-card-title">新增 / 编辑模型</p>
                <form className="grid-form" onSubmit={saveAdminModel}>
                  <label className="form-label">Model ID<input className="form-input" value={adminModelId} onChange={e => setAdminModelId(e.target.value)} /></label>
                  <label className="form-label">Upstream Model<input className="form-input" value={adminUpstreamModel} onChange={e => setAdminUpstreamModel(e.target.value)} /></label>
                  <label className="form-label">Region<input className="form-input" value={adminRegion} onChange={e => setAdminRegion(e.target.value)} /></label>
                  <label className="form-label">Provider Chain<input className="form-input" value={adminProviderChain} onChange={e => setAdminProviderChain(e.target.value)} /></label>
                  <label className="form-label">输入价格/1K<input className="form-input" value={adminInputPrice} onChange={e => setAdminInputPrice(e.target.value)} /></label>
                  <label className="form-label">输出价格/1K<input className="form-input" value={adminOutputPrice} onChange={e => setAdminOutputPrice(e.target.value)} /></label>
                  <label className="form-label checkbox-row" style={{ gridColumn: "span 2" }}>
                    <input type="checkbox" checked={adminModelActive} onChange={e => setAdminModelActive(e.target.checked)} />
                    <span>启用此模型</span>
                  </label>
                  <div style={{ gridColumn: "span 2" }}>
                    <button className="primary-btn" disabled={busy} type="submit">{busy ? "保存中…" : "保存模型配置"}</button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* ══ SETTINGS (admin) ════════════════════════════════════════════ */}
          {activeSection === "settings" && me?.is_super_admin && (
            <section>
              <h2 className="section-title">风控配置</h2>
              <div className="dash-section-card" style={{ maxWidth: 480 }}>
                <form className="stack-form" onSubmit={saveAdminSettings}>
                  <label className="form-label">Admin Secret
                    <input className="form-input" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} />
                  </label>
                  <label className="form-label">RPM 全局限额
                    <input className="form-input" type="number" value={adminRpmLimit} onChange={e => setAdminRpmLimit(e.target.value)} />
                  </label>
                  <label className="form-label">日消费上限 (USD)
                    <input className="form-input" type="number" value={adminDailyLimit} onChange={e => setAdminDailyLimit(e.target.value)} />
                  </label>
                  <button className="primary-btn" disabled={busy} type="submit">{busy ? "保存中…" : "保存配置"}</button>
                </form>
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}

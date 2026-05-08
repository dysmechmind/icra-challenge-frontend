"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
  gateway?: { cost?: number; remaining_balance?: number; provider_used?: string };
  detail?: string;
};

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

type KeyRow = {
  id: number;
  key_mask: string;
  label?: string | null;
  last_used_at?: number | null;
  is_active: number;
};

type KeyListResponse = { data: KeyRow[]; active_key_id: number };

type AdminSettingsResponse = { rpm_limit: number; daily_spend_limit: number; detail?: string };

type RechargeOrderRow = {
  id: number;
  amount: number;
  channel: string;
  status: string;
  created_at: number;
  email?: string;
};

type LedgerRow = {
  entry_type: string;
  amount: number;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  created_at: number;
};

type ModelRow = {
  id: string;
  upstream_model: string;
  region: string;
  provider_chain: string[];
  input_price_per_1k: number;
  output_price_per_1k: number;
  is_active: boolean;
};

export default function ConsolePage() {
  const router = useRouter();
  const apiBase = defaultApiBase.replace(/\/$/, "");

  const [authChecked, setAuthChecked] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adminSecret, setAdminSecret] = useState("dev-admin-secret");
  const [email, setEmail] = useState("demo@example.com");
  const [model, setModel] = useState("gpt-4o-mini");
  const [message, setMessage] = useState("给我一个跨境 AI 网关的 MVP 迭代计划");
  const [result, setResult] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [keyRows, setKeyRows] = useState<KeyRow[]>([]);
  const [activeKeyId, setActiveKeyId] = useState<number | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState("server-key");
  const [adminRpmLimit, setAdminRpmLimit] = useState("20");
  const [adminDailyLimit, setAdminDailyLimit] = useState("50");
  const [rechargeAmount, setRechargeAmount] = useState("100");
  const [rechargeChannel, setRechargeChannel] = useState("manual-review");
  const [rechargeNote, setRechargeNote] = useState("first top-up");
  const [orderRows, setOrderRows] = useState<RechargeOrderRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [adminOrderRows, setAdminOrderRows] = useState<RechargeOrderRow[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelRow[]>([]);
  const [adminModels, setAdminModels] = useState<ModelRow[]>([]);
  const [adminModelId, setAdminModelId] = useState("gpt-4o-mini");
  const [adminUpstreamModel, setAdminUpstreamModel] = useState("gpt-4o-mini");
  const [adminRegion, setAdminRegion] = useState("global");
  const [adminProviderChain, setAdminProviderChain] = useState("openai,mock");
  const [adminInputPrice, setAdminInputPrice] = useState("0.001");
  const [adminOutputPrice, setAdminOutputPrice] = useState("0.002");
  const [adminModelActive, setAdminModelActive] = useState(true);

  useEffect(() => {
    const storedSession = window.localStorage.getItem("token-router-session") ?? "";
    const storedApiKey = window.localStorage.getItem("token-router-api-key") ?? "";
    if (!storedSession) {
      router.replace("/login");
      return;
    }
    setSessionToken(storedSession);
    if (storedApiKey) setApiKey(storedApiKey);
    setAuthChecked(true);
    void refreshPublicModels();
    void refreshAccount(storedSession, storedApiKey);
    void refreshKeys(storedSession, storedApiKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (apiKey) {
      window.localStorage.setItem("token-router-api-key", apiKey);
      return;
    }
    window.localStorage.removeItem("token-router-api-key");
  }, [apiKey]);

  function buildHeaders(overrideSession?: string, overrideKey?: string) {
    const sess = overrideSession ?? sessionToken;
    const key = overrideKey ?? apiKey;
    const headers: Record<string, string> = {};
    if (sess) headers["x-session-token"] = sess;
    else if (key) headers.Authorization = `Bearer ${key}`;
    return headers;
  }

  function clearState() {
    setSessionToken("");
    setMe(null);
    setUsageRows([]);
    setOrderRows([]);
    setLedgerRows([]);
    setKeyRows([]);
    setActiveKeyId(null);
    window.localStorage.removeItem("token-router-session");
  }

  async function logout() {
    if (sessionToken) {
      try {
        await fetch(`${apiBase}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "x-session-token": sessionToken },
        });
      } catch { /* ignore */ }
    }
    clearState();
    router.replace("/login");
  }

  async function refreshPublicModels() {
    try {
      const res = await fetch(`${apiBase}/api/v1/models`);
      const data = (await res.json()) as { data?: ModelRow[] };
      const models = data.data ?? [];
      setAvailableModels(models);
      if (models.length > 0 && !models.some((m) => m.id === model)) {
        setModel(models[0].id);
      }
    } catch {
      setAvailableModels([]);
    }
  }

  async function runChat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult("");
    setMeta("");
    try {
      const res = await fetch(`${apiBase}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: message }] }),
      });
      const data = (await res.json()) as ChatResponse;
      if (!res.ok) throw new Error(data?.detail ?? "Chat failed");
      setResult(data.choices?.[0]?.message?.content ?? "(empty response)");
      setMeta(
        `provider=${data.gateway?.provider_used ?? "unknown"} | tokens=${data.usage?.total_tokens ?? 0} | cost=$${data.gateway?.cost ?? 0} | balance=$${data.gateway?.remaining_balance ?? 0}`
      );
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  async function createKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult("");
    setMeta("");
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ user_email: email, initial_balance: 50 }),
      });
      const data = await res.json() as { api_key?: string; key_mask?: string; detail?: string };
      if (!res.ok) throw new Error(data?.detail ?? "Create key failed");
      setApiKey(data.api_key ?? "");
      setMeta(`已创建 API Key，掩码: ${data.key_mask}`);
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "Create key failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccount(overrideSession?: string, overrideKey?: string) {
    const headers = buildHeaders(overrideSession, overrideKey);
    if (Object.keys(headers).length === 0) { setMeta("请先登录或输入 API Key"); return; }
    setBusy(true);
    try {
      const [meRes, usageRes, orderRes, ledgerRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/me`, { headers }),
        fetch(`${apiBase}/api/v1/usage`, { headers }),
        fetch(`${apiBase}/api/v1/orders`, { headers }),
        fetch(`${apiBase}/api/v1/billing/ledger`, { headers }),
      ]);
      const meData = (await meRes.json()) as MeResponse & { detail?: string };
      const usageData = (await usageRes.json()) as { data?: UsageRow[]; detail?: string };
      const orderData = (await orderRes.json()) as { data?: RechargeOrderRow[]; detail?: string };
      const ledgerData = (await ledgerRes.json()) as { data?: LedgerRow[]; detail?: string };
      if (!meRes.ok) throw new Error(meData.detail ?? "加载账户信息失败");
      if (!usageRes.ok) throw new Error(usageData.detail ?? "加载用量失败");
      if (!orderRes.ok) throw new Error(orderData.detail ?? "加载订单失败");
      if (!ledgerRes.ok) throw new Error(ledgerData.detail ?? "加载流水失败");
      setMe(meData);
      setUsageRows(usageData.data ?? []);
      setOrderRows(orderData.data ?? []);
      setLedgerRows(ledgerData.data ?? []);
      setMeta("账户与用量已刷新");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "加载失败");
    } finally {
      setBusy(false);
    }
  }

  async function createRechargeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const headers = buildHeaders();
    if (Object.keys(headers).length === 0) { setMeta("请先登录或输入 API Key"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/orders/recharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ amount: Number(rechargeAmount), channel: rechargeChannel, note: rechargeNote }),
      });
      const data = (await res.json()) as { order_id?: number; status?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "创建充值单失败");
      setMeta(`充值单已创建: #${data.order_id} (${data.status})`);
      await refreshAccount();
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "创建充值单失败");
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminOrders() {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/orders`, { headers: { "x-admin-secret": adminSecret } });
      const data = (await res.json()) as { data?: RechargeOrderRow[]; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "加载充值单失败");
      setAdminOrderRows(data.data ?? []);
      setMeta("管理员订单列表已加载");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "加载充值单失败");
    } finally {
      setBusy(false);
    }
  }

  async function approveOrder(orderId: number) {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/orders/${orderId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ operator_note: "approved from console", payment_reference: `manual-${orderId}` }),
      });
      const data = (await res.json()) as { new_balance?: number; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "审核充值单失败");
      setMeta(`订单 #${orderId} 已审核入账，余额=$${data.new_balance ?? 0}`);
      await loadAdminOrders();
      if (sessionToken || apiKey) await refreshAccount();
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "审核充值单失败");
    } finally {
      setBusy(false);
    }
  }

  async function refreshKeys(overrideSession?: string, overrideKey?: string) {
    const headers = buildHeaders(overrideSession, overrideKey);
    if (Object.keys(headers).length === 0) { setMeta("请先登录或输入 API Key"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys`, { headers });
      const data = (await res.json()) as KeyListResponse & { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "加载 Key 列表失败");
      setKeyRows(data.data ?? []);
      setActiveKeyId(data.active_key_id ?? null);
      setMeta("API Key 列表已刷新");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "加载 Key 列表失败");
    } finally {
      setBusy(false);
    }
  }

  async function createAdditionalKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const headers = buildHeaders();
    if (Object.keys(headers).length === 0) { setMeta("请先登录或输入 API Key"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ label: newKeyLabel }),
      });
      const data = (await res.json()) as { api_key?: string; key_mask?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "创建附加 Key 失败");
      setMeta(`已创建新 Key: ${data.key_mask}`);
      if (data.api_key) setResult(`新 API Key\n${data.api_key}`);
      await refreshKeys();
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "创建附加 Key 失败");
    } finally {
      setBusy(false);
    }
  }

  async function deactivateKey(keyId: number) {
    const headers = buildHeaders();
    if (Object.keys(headers).length === 0) { setMeta("请先登录或输入 API Key"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys/${keyId}/deactivate`, { method: "POST", headers });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "停用 Key 失败");
      setMeta(`已停用 Key #${keyId}`);
      await refreshKeys();
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "停用 Key 失败");
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminSettings() {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/settings`, { headers: { "x-admin-secret": adminSecret } });
      const data = (await res.json()) as AdminSettingsResponse;
      if (!res.ok) throw new Error(data.detail ?? "加载管理员设置失败");
      setAdminRpmLimit(String(data.rpm_limit));
      setAdminDailyLimit(String(data.daily_spend_limit));
      setMeta("管理员设置已加载");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "加载管理员设置失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ rpm_limit: Number(adminRpmLimit), daily_spend_limit: Number(adminDailyLimit) }),
      });
      const data = (await res.json()) as AdminSettingsResponse;
      if (!res.ok) throw new Error(data.detail ?? "保存管理员设置失败");
      setMeta(`管理员设置已保存: rpm=${data.rpm_limit}, daily=$${data.daily_spend_limit}`);
      if (sessionToken || apiKey) await refreshAccount();
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "保存管理员设置失败");
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminModels() {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/models`, { headers: { "x-admin-secret": adminSecret } });
      const data = (await res.json()) as { data?: ModelRow[]; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "加载模型配置失败");
      const models = data.data ?? [];
      setAdminModels(models);
      if (models.length > 0) applyModelForm(models[0]);
      setMeta("模型配置已加载");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "加载模型配置失败");
    } finally {
      setBusy(false);
    }
  }

  function applyModelForm(m: ModelRow) {
    setAdminModelId(m.id);
    setAdminUpstreamModel(m.upstream_model);
    setAdminRegion(m.region);
    setAdminProviderChain(m.provider_chain.join(","));
    setAdminInputPrice(String(m.input_price_per_1k));
    setAdminOutputPrice(String(m.output_price_per_1k));
    setAdminModelActive(m.is_active);
  }

  async function saveAdminModel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const providerChain = adminProviderChain.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`${apiBase}/api/v1/admin/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          model_id: adminModelId, upstream_model: adminUpstreamModel, region: adminRegion,
          provider_chain: providerChain, input_price_per_1k: Number(adminInputPrice),
          output_price_per_1k: Number(adminOutputPrice), is_active: adminModelActive,
        }),
      });
      const data = (await res.json()) as { model_id?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "保存模型配置失败");
      setMeta(`模型配置已保存: ${data.model_id}`);
      await Promise.all([loadAdminModels(), refreshPublicModels()]);
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "保存模型配置失败");
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <p className="meta">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="site-nav">
        <Link className="brand-lockup" href="/" style={{ textDecoration: "none" }}>
          <span className="brand-mark" />
          <span className="brand-name">token-router</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">首页</Link>
          <a href="#console">控制台</a>
          <a href="#account">账户</a>
          <a href="#keys">密钥</a>
          <a href="#billing">账单</a>
        </nav>
        <div className="nav-actions">
          <span className="meta" style={{ marginRight: "0.75rem" }}>
            {me?.email ?? ""}
          </span>
          <button className="nav-ghost" onClick={logout} type="button">
            退出登录
          </button>
        </div>
      </header>

      <main style={{ paddingTop: "4rem" }}>
        <section className="console-shell" id="console">
          <div className="console-header">
            <div>
              <p className="section-kicker">控制台</p>
              <h2>运营、接入、计费与风控放在同一个面板里</h2>
            </div>
            <p className="console-status">{meta || `Gateway Base: ${apiBase}`}</p>
          </div>

          <div className="console-grid">
            <form className="panel panel-feature" onSubmit={createKey}>
              <h3>管理员创建测试 API Key</h3>
              <label>
                Admin Secret
                <input onChange={(e) => setAdminSecret(e.target.value)} value={adminSecret} />
              </label>
              <label>
                User Email
                <input onChange={(e) => setEmail(e.target.value)} value={email} />
              </label>
              <button disabled={busy} type="submit">
                {busy ? "处理中..." : "创建 Key"}
              </button>
            </form>

            <form className="panel panel-feature" onSubmit={runChat}>
              <h3>发送 Chat 请求</h3>
              <label>
                API Key
                <input onChange={(e) => setApiKey(e.target.value)} placeholder="sk_live_..." value={apiKey} />
              </label>
              <label>
                Model
                <select onChange={(e) => setModel(e.target.value)} value={model}>
                  {availableModels.length === 0 ? (
                    <option value={model}>{model}</option>
                  ) : (
                    availableModels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} ({item.region})
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label>
                Prompt
                <textarea onChange={(e) => setMessage(e.target.value)} rows={4} value={message} />
              </label>
              <button disabled={busy || !apiKey} type="submit">
                {busy ? "处理中..." : "发送请求"}
              </button>
            </form>

            <div className="panel panel-wide" id="account">
              <div className="panel-head">
                <h3>账户状态与用量</h3>
                <button disabled={busy || (!sessionToken && !apiKey)} onClick={() => void refreshAccount()} type="button">
                  {busy ? "处理中..." : "刷新账户数据"}
                </button>
              </div>
              <div className="stats-grid">
                <p>邮箱: {me?.email ?? "-"}</p>
                <p>余额: ${me?.balance ?? 0}</p>
                <p>当前鉴权: {me?.auth_method ?? (sessionToken ? "session" : apiKey ? "api_key" : "-")}</p>
                <p>每分钟限额: {me?.limits?.rpm ?? "-"}</p>
                <p>日消费上限: ${me?.limits?.daily_spend_usd ?? "-"}</p>
                <p>今日已消费: ${me?.limits?.today_spend_usd ?? 0}</p>
                <p>待审核充值: ${me?.billing?.pending_recharge_usd ?? 0}</p>
              </div>
              <div className="table-wrap">
                {usageRows.length === 0 ? (
                  <p className="meta">暂无调用记录</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Tokens</th>
                        <th>Cost</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageRows.slice(0, 8).map((row, idx) => (
                        <tr key={`${row.created_at}-${idx}`}>
                          <td>{row.model}</td>
                          <td>{row.total_tokens}</td>
                          <td>${row.cost}</td>
                          <td>{new Date(row.created_at * 1000).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <form className="panel panel-feature" onSubmit={createRechargeOrder} id="billing">
              <h3>创建充值订单</h3>
              <label>
                Amount (USD)
                <input onChange={(e) => setRechargeAmount(e.target.value)} value={rechargeAmount} />
              </label>
              <label>
                Channel
                <select onChange={(e) => setRechargeChannel(e.target.value)} value={rechargeChannel}>
                  <option value="manual-review">manual-review</option>
                  <option value="bank-transfer">bank-transfer</option>
                  <option value="crypto-usdt">crypto-usdt</option>
                </select>
              </label>
              <label>
                Note
                <input onChange={(e) => setRechargeNote(e.target.value)} value={rechargeNote} />
              </label>
              <button disabled={busy || (!sessionToken && !apiKey)} type="submit">
                {busy ? "处理中..." : "提交充值单"}
              </button>
            </form>

            <div className="panel panel-wide">
              <h3>订单与余额流水</h3>
              <div className="table-dual">
                <div className="table-wrap">
                  <p className="subheading">充值订单</p>
                  {orderRows.length === 0 ? (
                    <p className="meta">暂无充值订单</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Amount</th>
                          <th>Channel</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderRows.slice(0, 6).map((row) => (
                          <tr key={row.id}>
                            <td>{row.id}</td>
                            <td>${row.amount}</td>
                            <td>{row.channel}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="table-wrap">
                  <p className="subheading">余额流水</p>
                  {ledgerRows.length === 0 ? (
                    <p className="meta">暂无余额流水</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Balance</th>
                          <th>Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.slice(0, 6).map((row, idx) => (
                          <tr key={`${row.created_at}-${idx}`}>
                            <td>{row.entry_type}</td>
                            <td>${row.amount}</td>
                            <td>${row.balance_after}</td>
                            <td>{row.reference_type ?? "-"}#{row.reference_id ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <form className="panel panel-wide" onSubmit={createAdditionalKey} id="keys">
              <div className="panel-head">
                <h3>API Key 管理</h3>
                <button disabled={busy || (!sessionToken && !apiKey)} onClick={() => void refreshKeys()} type="button">
                  {busy ? "处理中..." : "刷新 Key 列表"}
                </button>
              </div>
              <label>
                New Key Label
                <input onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="server-key" value={newKeyLabel} />
              </label>
              <button disabled={busy || (!sessionToken && !apiKey)} type="submit">
                {busy ? "处理中..." : "创建附加 Key"}
              </button>
              <div className="table-wrap">
                {keyRows.length === 0 ? (
                  <p className="meta">暂无 Key 记录</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Mask</th>
                        <th>Label</th>
                        <th>Last Used</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.key_mask}</td>
                          <td>{row.label ?? "-"}</td>
                          <td>{row.last_used_at ? new Date(row.last_used_at * 1000).toLocaleString() : "-"}</td>
                          <td>{row.is_active ? (row.id === activeKeyId ? "active/current" : "active") : "inactive"}</td>
                          <td>
                            <button
                              disabled={busy || !row.is_active || row.id === activeKeyId}
                              onClick={() => deactivateKey(row.id)}
                              type="button"
                            >
                              停用
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </form>

            <form
              className="panel panel-admin"
              onSubmit={saveAdminSettings}
              style={{ display: me?.is_super_admin ? undefined : "none" }}
            >
              <div className="panel-head">
                <h3>管理员风控配置</h3>
                <div className="inline-actions">
                  <button disabled={busy} onClick={loadAdminSettings} type="button">读取配置</button>
                  <button disabled={busy} onClick={loadAdminOrders} type="button">加载订单</button>
                  <button disabled={busy} onClick={loadAdminModels} type="button">加载模型</button>
                </div>
              </div>
              <div className="admin-form-grid">
                <label>
                  RPM Limit
                  <input onChange={(e) => setAdminRpmLimit(e.target.value)} value={adminRpmLimit} />
                </label>
                <label>
                  Daily Spend Limit (USD)
                  <input onChange={(e) => setAdminDailyLimit(e.target.value)} value={adminDailyLimit} />
                </label>
              </div>
              <button disabled={busy} type="submit">
                {busy ? "处理中..." : "保存管理员配置"}
              </button>
              <div className="table-wrap">
                {adminOrderRows.length === 0 ? (
                  <p className="meta">暂无管理员订单视图</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrderRows.slice(0, 10).map((row) => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.email ?? "-"}</td>
                          <td>${row.amount}</td>
                          <td>{row.status}</td>
                          <td>
                            <button
                              disabled={busy || row.status !== "pending"}
                              onClick={() => approveOrder(row.id)}
                              type="button"
                            >
                              审核入账
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </form>

            <form
              className="panel panel-admin"
              onSubmit={saveAdminModel}
              style={{ display: me?.is_super_admin ? undefined : "none" }}
            >
              <h3>模型与价格管理</h3>
              <div className="admin-form-grid">
                <label>
                  Model ID
                  <input onChange={(e) => setAdminModelId(e.target.value)} placeholder="gpt-4o-mini" value={adminModelId} />
                </label>
                <label>
                  Upstream Model
                  <input onChange={(e) => setAdminUpstreamModel(e.target.value)} value={adminUpstreamModel} />
                </label>
                <label>
                  Region
                  <input onChange={(e) => setAdminRegion(e.target.value)} placeholder="global / cn" value={adminRegion} />
                </label>
                <label>
                  Provider Chain
                  <input onChange={(e) => setAdminProviderChain(e.target.value)} placeholder="openai,mock" value={adminProviderChain} />
                </label>
                <label>
                  Input Price / 1K
                  <input onChange={(e) => setAdminInputPrice(e.target.value)} value={adminInputPrice} />
                </label>
                <label>
                  Output Price / 1K
                  <input onChange={(e) => setAdminOutputPrice(e.target.value)} value={adminOutputPrice} />
                </label>
              </div>
              <label className="checkbox-row">
                <input checked={adminModelActive} onChange={(e) => setAdminModelActive(e.target.checked)} type="checkbox" />
                <span>Model Active</span>
              </label>
              <button disabled={busy} type="submit">
                {busy ? "处理中..." : "保存模型配置"}
              </button>
              <div className="table-wrap">
                {adminModels.length === 0 ? (
                  <p className="meta">暂无模型配置</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Region</th>
                        <th>Providers</th>
                        <th>In/1K</th>
                        <th>Out/1K</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminModels.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.region}</td>
                          <td>{item.provider_chain.join(",")}</td>
                          <td>${item.input_price_per_1k}</td>
                          <td>${item.output_price_per_1k}</td>
                          <td>{item.is_active ? "active" : "inactive"}</td>
                          <td>
                            <button disabled={busy} onClick={() => applyModelForm(item)} type="button">
                              编辑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </form>

            <div className="panel panel-output">
              <h3>运行结果</h3>
              <p className="meta">{meta || "等待调用..."}</p>
              <pre>{result || "暂无输出"}</pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

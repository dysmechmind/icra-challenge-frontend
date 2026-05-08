"use client";

import { FormEvent, useMemo, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  gateway?: {
    cost?: number;
    remaining_balance?: number;
    provider_used?: string;
  };
  detail?: string;
};

type MeResponse = {
  email: string;
  balance: number;
  limits?: {
    rpm?: number;
    daily_spend_usd?: number;
    today_spend_usd?: number;
  };
};

type UsageRow = {
  model: string;
  total_tokens: number;
  cost: number;
  created_at: number;
};

type KeyRow = {
  id: number;
  key_mask: string;
  label?: string | null;
  created_at: number;
  last_used_at?: number | null;
  is_active: number;
};

type KeyListResponse = {
  data: KeyRow[];
  active_key_id: number;
};

type AdminSettingsResponse = {
  rpm_limit: number;
  daily_spend_limit: number;
  detail?: string;
};

export default function Home() {
  const [adminSecret, setAdminSecret] = useState("dev-admin-secret");
  const [email, setEmail] = useState("demo@example.com");
  const [apiKey, setApiKey] = useState("");
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

  const apiBase = useMemo(() => defaultApiBase.replace(/\/$/, ""), []);

  async function createKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult("");
    setMeta("");

    try {
      const res = await fetch(`${apiBase}/api/v1/admin/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ user_email: email, initial_balance: 50 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail ?? "Create key failed");
      }

      setApiKey(data.api_key ?? "");
      setMeta(`已创建 API Key，掩码: ${data.key_mask}`);
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "Create key failed");
    } finally {
      setBusy(false);
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
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: message }],
        }),
      });

      const data = (await res.json()) as ChatResponse;
      if (!res.ok) {
        throw new Error(data?.detail ?? "Chat failed");
      }

      setResult(data.choices?.[0]?.message?.content ?? "(empty response)");
      setMeta(
        `provider=${data.gateway?.provider_used ?? "unknown"} | tokens=${
          data.usage?.total_tokens ?? 0
        } | cost=$${data.gateway?.cost ?? 0} | balance=$${data.gateway?.remaining_balance ?? 0
        }`
      );
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccount() {
    if (!apiKey) {
      setMeta("请先创建或输入 API Key");
      return;
    }

    setBusy(true);
    try {
      const [meRes, usageRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/me`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch(`${apiBase}/api/v1/usage`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ]);

      const meData = (await meRes.json()) as MeResponse & { detail?: string };
      const usageData = (await usageRes.json()) as { data?: UsageRow[]; detail?: string };

      if (!meRes.ok) {
        throw new Error(meData.detail ?? "加载账户信息失败");
      }
      if (!usageRes.ok) {
        throw new Error(usageData.detail ?? "加载用量失败");
      }

      setMe(meData);
      setUsageRows(usageData.data ?? []);
      setMeta("账户与用量已刷新");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "加载失败");
    } finally {
      setBusy(false);
    }
  }

  async function refreshKeys() {
    if (!apiKey) {
      setMeta("请先输入 API Key");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await res.json()) as KeyListResponse & { detail?: string };
      if (!res.ok) {
        throw new Error(data.detail ?? "加载 Key 列表失败");
      }

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
    if (!apiKey) {
      setMeta("请先输入 API Key");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ label: newKeyLabel }),
      });
      const data = (await res.json()) as {
        api_key?: string;
        key_mask?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(data.detail ?? "创建附加 Key 失败");
      }

      setMeta(`已创建新 Key: ${data.key_mask}`);
      if (data.api_key) {
        setResult(`新 API Key\n${data.api_key}`);
      }
      await refreshKeys();
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "创建附加 Key 失败");
    } finally {
      setBusy(false);
    }
  }

  async function deactivateKey(keyId: number) {
    if (!apiKey) {
      setMeta("请先输入 API Key");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/keys/${keyId}/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) {
        throw new Error(data.detail ?? "停用 Key 失败");
      }

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
      const res = await fetch(`${apiBase}/api/v1/admin/settings`, {
        headers: { "x-admin-secret": adminSecret },
      });
      const data = (await res.json()) as AdminSettingsResponse;
      if (!res.ok) {
        throw new Error(data.detail ?? "加载管理员设置失败");
      }

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
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          rpm_limit: Number(adminRpmLimit),
          daily_spend_limit: Number(adminDailyLimit),
        }),
      });
      const data = (await res.json()) as AdminSettingsResponse;
      if (!res.ok) {
        throw new Error(data.detail ?? "保存管理员设置失败");
      }

      setMeta(`管理员设置已保存: rpm=${data.rpm_limit}, daily=$${data.daily_spend_limit}`);
      if (apiKey) {
        await refreshAccount();
      }
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "保存管理员设置失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="badge">Cross-Border LLM Gateway</p>
        <h1>一套网关，双边市场</h1>
        <p className="sub">
          为国内用户稳定访问海外模型，为海外用户提供更低价的中文模型推理能力。
        </p>
      </header>

      <section className="grid">
        <article className="card card-cyan">
          <h2>面向国内开发者</h2>
          <p>海外模型统一鉴权、稳定转发、额度与账单可视化。</p>
          <ul>
            <li>OpenAI 兼容接口</li>
            <li>故障切换与限流</li>
            <li>按 token 成本核算</li>
          </ul>
        </article>

        <article className="card card-amber">
          <h2>面向海外开发者</h2>
          <p>更具价格优势的中文模型服务，统一英文 API 文档与计费。</p>
          <ul>
            <li>低价模型池</li>
            <li>中英文支持</li>
            <li>区域化路由策略</li>
          </ul>
        </article>
      </section>

      <section className="console">
        <h2>MVP Console</h2>
        <p className="console-note">API Base: {apiBase}</p>

        <form className="panel" onSubmit={createKey}>
          <h3>1) 创建测试 API Key</h3>
          <label>
            Admin Secret
            <input value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} />
          </label>
          <label>
            User Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button disabled={busy} type="submit">
            {busy ? "处理中..." : "创建 Key"}
          </button>
        </form>

        <form className="panel" onSubmit={runChat}>
          <h3>2) 发送一次 Chat 请求</h3>
          <label>
            API Key
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_live_..." />
          </label>
          <label>
            Model
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gpt-4o-mini">gpt-4o-mini (global)</option>
              <option value="deepseek-chat">deepseek-chat (cn)</option>
            </select>
          </label>
          <label>
            Prompt
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          </label>
          <button disabled={busy || !apiKey} type="submit">
            {busy ? "处理中..." : "发送请求"}
          </button>
        </form>

        <div className="panel">
          <h3>3) 账户状态与用量</h3>
          <button disabled={busy || !apiKey} type="button" onClick={refreshAccount}>
            {busy ? "处理中..." : "刷新账户数据"}
          </button>
          <div className="stats">
            <p>邮箱: {me?.email ?? "-"}</p>
            <p>余额: ${me?.balance ?? 0}</p>
            <p>每分钟限额: {me?.limits?.rpm ?? "-"}</p>
            <p>日消费上限: ${me?.limits?.daily_spend_usd ?? "-"}</p>
            <p>今日已消费: ${me?.limits?.today_spend_usd ?? 0}</p>
          </div>
          <div className="usage">
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

        <form className="panel" onSubmit={createAdditionalKey}>
          <h3>4) API Key 管理</h3>
          <div className="inline-actions">
            <button disabled={busy || !apiKey} type="button" onClick={refreshKeys}>
              {busy ? "处理中..." : "刷新 Key 列表"}
            </button>
          </div>
          <label>
            New Key Label
            <input value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="server-key" />
          </label>
          <button disabled={busy || !apiKey} type="submit">
            {busy ? "处理中..." : "创建附加 Key"}
          </button>
          <div className="usage">
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
                          type="button"
                          onClick={() => deactivateKey(row.id)}
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

        <form className="panel" onSubmit={saveAdminSettings}>
          <h3>5) 管理员风控配置</h3>
          <div className="inline-actions">
            <button disabled={busy} type="button" onClick={loadAdminSettings}>
              {busy ? "处理中..." : "读取当前配置"}
            </button>
          </div>
          <label>
            RPM Limit
            <input value={adminRpmLimit} onChange={(e) => setAdminRpmLimit(e.target.value)} />
          </label>
          <label>
            Daily Spend Limit (USD)
            <input value={adminDailyLimit} onChange={(e) => setAdminDailyLimit(e.target.value)} />
          </label>
          <button disabled={busy} type="submit">
            {busy ? "处理中..." : "保存管理员配置"}
          </button>
        </form>

        <div className="panel output">
          <h3>Result</h3>
          <p className="meta">{meta || "等待调用..."}</p>
          <pre>{result || "暂无输出"}</pre>
        </div>
      </section>
    </div>
  );
}

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

        <div className="panel output">
          <h3>Result</h3>
          <p className="meta">{meta || "等待调用..."}</p>
          <pre>{result || "暂无输出"}</pre>
        </div>
      </section>
    </div>
  );
}

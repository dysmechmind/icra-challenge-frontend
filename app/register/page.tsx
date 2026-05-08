"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type RegisterResponse = {
  session_token?: string;
  bootstrap_api_key?: string;
  bootstrap_key_mask?: string;
  detail?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const apiBase = useMemo(() => defaultApiBase.replace(/\/$/, ""), []);
  const [email, setEmail] = useState("new-user@example.com");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMeta("");
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as RegisterResponse;
      if (!res.ok || !data.session_token) {
        throw new Error(data.detail ?? "注册失败");
      }

      window.localStorage.setItem("token-router-session", data.session_token);
      if (data.bootstrap_api_key) {
        window.localStorage.setItem("token-router-api-key", data.bootstrap_api_key);
      }
      setMeta(
        `注册成功${data.bootstrap_key_mask ? `，默认 Key: ${data.bootstrap_key_mask}` : ""}，正在跳转控制台...`
      );
        router.push("/console");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "注册失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <span className="brand-name">token-router</span>
        </div>
        <h1>注册</h1>
        <p className="meta">注册后会自动创建 session，并为你分配一个默认 API Key。</p>

        <form className="auth-grid" onSubmit={submit}>
          <label>
            Email
            <input onChange={(e) => setEmail(e.target.value)} value={email} />
          </label>
          <label>
            Password
            <input onChange={(e) => setPassword(e.target.value)} type="password" value={password} />
          </label>
          <button disabled={busy} type="submit">
            {busy ? "处理中..." : "注册并进入控制台"}
          </button>
        </form>

        <p className="meta">{meta}</p>
        <div className="inline-actions">
          <Link className="nav-ghost" href="/login">
            已有账号？去登录
          </Link>
          <Link className="nav-ghost" href="/reset-password">
            忘记密码
          </Link>
          <Link className="nav-ghost" href="/">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type AuthResponse = {
  session_token?: string;
  detail?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const apiBase = useMemo(() => defaultApiBase.replace(/\/$/, ""), []);
  const [email, setEmail] = useState("root");
  const [password, setPassword] = useState("12345678");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMeta("");
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as AuthResponse;
      if (!res.ok || !data.session_token) {
        throw new Error(data.detail ?? "登录失败");
      }
      window.localStorage.setItem("token-router-session", data.session_token);
      setMeta("登录成功，正在跳转控制台...");
        router.push("/console");
    } catch (err) {
      setMeta(err instanceof Error ? err.message : "登录失败");
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
        <h1>登录</h1>
        <p className="meta">登录后可直接进入控制台，使用 session 管理账户、订单和密钥。默认超级管理员账号为 root。</p>

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
            {busy ? "处理中..." : "登录并进入控制台"}
          </button>
        </form>

        <p className="meta">{meta}</p>
        <div className="inline-actions">
          <Link className="nav-ghost" href="/register">
            没有账号？去注册
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

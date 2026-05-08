"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const defaultApiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ResetRequestResponse = {
  reset_token?: string | null;
  detail?: string;
};

type ResetConfirmResponse = {
  success?: boolean;
  detail?: string;
};

export default function ResetPasswordPage() {
  const apiBase = useMemo(() => defaultApiBase.replace(/\/$/, ""), []);
  const [email, setEmail] = useState("demo@example.com");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("password1234");
  const [busyRequest, setBusyRequest] = useState(false);
  const [busyConfirm, setBusyConfirm] = useState(false);
  const [metaRequest, setMetaRequest] = useState("");
  const [metaConfirm, setMetaConfirm] = useState("");

  async function requestReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusyRequest(true);
    setMetaRequest("");
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as ResetRequestResponse;
      if (!res.ok) {
        throw new Error(data.detail ?? "发起重置失败");
      }
      if (data.reset_token) {
        setResetToken(data.reset_token);
        setMetaRequest("重置 token 已生成，已自动填入下方表单（MVP 模式）。");
      } else {
        setMetaRequest("请求已提交，如果邮箱存在会收到重置链接。");
      }
    } catch (err) {
      setMetaRequest(err instanceof Error ? err.message : "发起重置失败");
    } finally {
      setBusyRequest(false);
    }
  }

  async function confirmReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusyConfirm(true);
    setMetaConfirm("");
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/password/reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = (await res.json()) as ResetConfirmResponse;
      if (!res.ok) {
        throw new Error(data.detail ?? "重置密码失败");
      }
      setMetaConfirm("密码重置成功，请前往登录页重新登录。");
    } catch (err) {
      setMetaConfirm(err instanceof Error ? err.message : "重置密码失败");
    } finally {
      setBusyConfirm(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card auth-card-wide">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <span className="brand-name">token-router</span>
        </div>
        <h1>重置密码</h1>
        <p className="meta">当前为 MVP 流程：请求后直接返回 reset token，后续可替换成邮件发送。</p>

        <div className="auth-dual-grid">
          <form className="auth-grid" onSubmit={requestReset}>
            <h3>步骤 1：申请重置</h3>
            <label>
              Email
              <input onChange={(e) => setEmail(e.target.value)} value={email} />
            </label>
            <button disabled={busyRequest} type="submit">
              {busyRequest ? "处理中..." : "生成重置 token"}
            </button>
            <p className="meta">{metaRequest}</p>
          </form>

          <form className="auth-grid" onSubmit={confirmReset}>
            <h3>步骤 2：提交新密码</h3>
            <label>
              Reset Token
              <input onChange={(e) => setResetToken(e.target.value)} value={resetToken} />
            </label>
            <label>
              New Password
              <input onChange={(e) => setNewPassword(e.target.value)} type="password" value={newPassword} />
            </label>
            <button disabled={busyConfirm} type="submit">
              {busyConfirm ? "处理中..." : "确认重置密码"}
            </button>
            <p className="meta">{metaConfirm}</p>
          </form>
        </div>

        <div className="inline-actions">
          <Link className="nav-ghost" href="/login">
            去登录
          </Link>
          <Link className="nav-ghost" href="/register">
            去注册
          </Link>
          <Link className="nav-ghost" href="/">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}

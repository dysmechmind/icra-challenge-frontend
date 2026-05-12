'use client';
import { useState, useEffect } from 'react';

interface LedgerEntry {
  entry_type: string;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  metadata: Record<string, unknown>;
  created_at: number;
}

interface UsageRecord {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: number;
}

interface RechargeOrder {
  id: number;
  amount: number;
  channel: string;
  status: string;
  note: string | null;
  operator_note: string | null;
  created_at: number;
  reviewed_at: number | null;
}

interface UserProfile {
  user_id: number;
  email: string;
  balance: number;
  limits: { rpm: number; daily_spend_usd: number; today_spend_usd: number };
  billing: { pending_recharge_usd: number };
}

export default function BillingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'ledger' | 'recharge'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState('10');
  const [rechargeChannel, setRechargeChannel] = useState('alipay');
  const [rechargeNote, setRechargeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API = typeof window !== 'undefined' ? (window.location.origin) : '';

  function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('session_token');
  }

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    if (!token) { setError('请先登录'); return null; }
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { 'x-session-token': token, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (res.status === 401) { setError('会话过期，请重新登录'); return null; }
    return res.json();
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [profileData, usageData, ledgerData, ordersData] = await Promise.all([
        apiFetch('/api/v1/me'),
        apiFetch('/api/v1/usage'),
        apiFetch('/api/v1/billing/ledger'),
        apiFetch('/api/v1/orders'),
      ]);
      if (profileData) setProfile(profileData);
      if (usageData) setUsage(usageData.data || []);
      if (ledgerData) setLedger(ledgerData.data || []);
      if (ordersData) setOrders(ordersData.data || []);
    } catch (e) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function submitRecharge() {
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/v1/orders/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(rechargeAmount), channel: rechargeChannel, note: rechargeNote }),
      });
      if (data && data.order_id) {
        setRechargeNote('');
        loadAll();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(ts: number) {
    return new Date(ts * 1000).toLocaleString('zh-CN');
  }

  function formatUSD(amount: number) {
    return `$${amount.toFixed(4)}`;
  }

  if (loading) return <div className="bill-page"><div className="bill-loading">加载中...</div></div>;
  if (error) return <div className="bill-page"><div className="bill-error">{error} <a href="/login">去登录</a></div></div>;

  return (
    <div className="bill-page">
      <nav className="bill-nav">
        <a href="/" className="bill-logo">TokenRouter</a>
        <div className="bill-nav-links">
          <a href="/console">控制台</a>
          <a href="/billing" className="active">账单</a>
          <a href="/playground">Playground</a>
          <a href="/routing">路由监控</a>
        </div>
      </nav>

      <div className="bill-container">
        <h1 className="bill-title">账单与充值</h1>

        {/* Balance Overview Cards */}
        <div className="bill-cards">
          <div className="bill-card bill-card-balance">
            <div className="bill-card-label">账户余额</div>
            <div className="bill-card-value">{formatUSD(profile?.balance || 0)}</div>
          </div>
          <div className="bill-card">
            <div className="bill-card-label">今日消费</div>
            <div className="bill-card-value">{formatUSD(profile?.limits.today_spend_usd || 0)}</div>
          </div>
          <div className="bill-card">
            <div className="bill-card-label">日限额</div>
            <div className="bill-card-value">{formatUSD(profile?.limits.daily_spend_usd || 0)}</div>
          </div>
          <div className="bill-card">
            <div className="bill-card-label">待审核充值</div>
            <div className="bill-card-value">{formatUSD(profile?.billing.pending_recharge_usd || 0)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bill-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>概览</button>
          <button className={activeTab === 'usage' ? 'active' : ''} onClick={() => setActiveTab('usage')}>使用记录</button>
          <button className={activeTab === 'ledger' ? 'active' : ''} onClick={() => setActiveTab('ledger')}>流水账单</button>
          <button className={activeTab === 'recharge' ? 'active' : ''} onClick={() => setActiveTab('recharge')}>充值</button>
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="bill-section">
            <h2>最近使用</h2>
            <table className="bill-table">
              <thead>
                <tr><th>时间</th><th>模型</th><th>Tokens</th><th>费用</th></tr>
              </thead>
              <tbody>
                {usage.slice(0, 10).map((u, i) => (
                  <tr key={i}>
                    <td>{formatTime(u.created_at)}</td>
                    <td><code>{u.model}</code></td>
                    <td>{u.total_tokens}</td>
                    <td>{formatUSD(u.cost)}</td>
                  </tr>
                ))}
                {usage.length === 0 && <tr><td colSpan={4} className="bill-empty">暂无记录</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Usage */}
        {activeTab === 'usage' && (
          <div className="bill-section">
            <h2>使用记录</h2>
            <table className="bill-table">
              <thead>
                <tr><th>时间</th><th>模型</th><th>输入</th><th>输出</th><th>总计</th><th>费用</th></tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={i}>
                    <td>{formatTime(u.created_at)}</td>
                    <td><code>{u.model}</code></td>
                    <td>{u.prompt_tokens}</td>
                    <td>{u.completion_tokens}</td>
                    <td>{u.total_tokens}</td>
                    <td>{formatUSD(u.cost)}</td>
                  </tr>
                ))}
                {usage.length === 0 && <tr><td colSpan={6} className="bill-empty">暂无使用记录</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Ledger */}
        {activeTab === 'ledger' && (
          <div className="bill-section">
            <h2>余额流水</h2>
            <table className="bill-table">
              <thead>
                <tr><th>时间</th><th>类型</th><th>金额</th><th>余额</th><th>备注</th></tr>
              </thead>
              <tbody>
                {ledger.map((l, i) => (
                  <tr key={i}>
                    <td>{formatTime(l.created_at)}</td>
                    <td><span className={`bill-badge ${l.amount >= 0 ? 'bill-badge-credit' : 'bill-badge-debit'}`}>
                      {l.entry_type === 'usage_debit' ? '使用扣费' : l.entry_type === 'recharge' ? '充值' : l.entry_type === 'initial_credit' ? '初始赠送' : l.entry_type}
                    </span></td>
                    <td className={l.amount >= 0 ? 'bill-amount-pos' : 'bill-amount-neg'}>{l.amount >= 0 ? '+' : ''}{formatUSD(l.amount)}</td>
                    <td>{formatUSD(l.balance_after)}</td>
                    <td className="bill-meta">{l.metadata?.model ? String(l.metadata.model) : '-'}</td>
                  </tr>
                ))}
                {ledger.length === 0 && <tr><td colSpan={5} className="bill-empty">暂无流水</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Recharge */}
        {activeTab === 'recharge' && (
          <div className="bill-section">
            <h2>账户充值</h2>
            <div className="bill-recharge-form">
              <div className="bill-form-group">
                <label>充值金额 (USD)</label>
                <div className="bill-amount-options">
                  {['5', '10', '20', '50', '100'].map(amt => (
                    <button key={amt} className={rechargeAmount === amt ? 'active' : ''} onClick={() => setRechargeAmount(amt)}>${amt}</button>
                  ))}
                </div>
                <input type="number" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} min="1" step="0.01" />
              </div>
              <div className="bill-form-group">
                <label>支付方式</label>
                <div className="bill-channel-options">
                  <button className={rechargeChannel === 'alipay' ? 'active' : ''} onClick={() => setRechargeChannel('alipay')}>支付宝</button>
                  <button className={rechargeChannel === 'wechat' ? 'active' : ''} onClick={() => setRechargeChannel('wechat')}>微信</button>
                  <button className={rechargeChannel === 'bank' ? 'active' : ''} onClick={() => setRechargeChannel('bank')}>银行转账</button>
                </div>
              </div>
              <div className="bill-form-group">
                <label>备注 (可选)</label>
                <input type="text" value={rechargeNote} onChange={e => setRechargeNote(e.target.value)} placeholder="付款参考号或备注" />
              </div>
              <button className="bill-submit-btn" onClick={submitRecharge} disabled={submitting}>
                {submitting ? '提交中...' : `提交充值 $${rechargeAmount}`}
              </button>
              <p className="bill-note">提交充值后，管理员审核通过即到账。</p>
            </div>

            <h3>充值记录</h3>
            <table className="bill-table">
              <thead>
                <tr><th>时间</th><th>金额</th><th>渠道</th><th>状态</th><th>备注</th></tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i}>
                    <td>{formatTime(o.created_at)}</td>
                    <td>{formatUSD(o.amount)}</td>
                    <td>{o.channel}</td>
                    <td><span className={`bill-status bill-status-${o.status}`}>
                      {o.status === 'pending' ? '审核中' : o.status === 'approved' ? '已通过' : o.status === 'rejected' ? '已拒绝' : o.status}
                    </span></td>
                    <td>{o.operator_note || o.note || '-'}</td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={5} className="bill-empty">暂无充值记录</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

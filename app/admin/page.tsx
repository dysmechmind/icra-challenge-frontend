'use client';
import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  balance: number;
  is_admin: number;
  is_super_admin: number;
  created_at: number;
}

interface Order {
  id: number;
  user_id: number;
  email?: string;
  amount: number;
  channel: string;
  status: string;
  note: string | null;
  operator_note: string | null;
  payment_reference: string | null;
  created_at: number;
  reviewed_at: number | null;
}

interface AdminMetrics {
  total_users: number;
  total_requests: number;
  total_revenue: number;
  active_keys: number;
  today_requests: number;
  today_revenue: number;
}

interface ModelConfig {
  id: string;
  model_id: string;
  upstream_model: string;
  region: string;
  provider_chain_json: string;
  input_price_per_1k: number;
  output_price_per_1k: number;
  is_active: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'orders' | 'models' | 'settings'>('metrics');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const API = typeof window !== 'undefined' ? (window.location.origin) : '';

  async function adminFetch(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { 'x-admin-secret': adminSecret, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (res.status === 403) { setError('管理密钥无效'); setAuthenticated(false); return null; }
    return res.json();
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [metricsData, ordersData, modelsData, settingsData] = await Promise.all([
        adminFetch('/api/v1/admin/metrics'),
        adminFetch('/api/v1/admin/orders'),
        adminFetch('/api/v1/admin/models'),
        adminFetch('/api/v1/admin/settings'),
      ]);
      if (metricsData) setMetrics(metricsData);
      if (ordersData) setOrders(ordersData.data || []);
      if (modelsData) setModels(modelsData.data || []);
      if (settingsData) setSettings(settingsData.settings || {});
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    if (!adminSecret.trim()) return;
    setAuthenticated(true);
  }

  useEffect(() => {
    if (authenticated) loadAll();
  }, [authenticated]);

  async function approveOrder(orderId: number, approve: boolean, note: string) {
    await adminFetch(`/api/v1/admin/orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved: approve, operator_note: note }),
    });
    loadAll();
  }

  async function updateSetting(key: string, value: string) {
    await adminFetch('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ [key]: value }),
    });
    loadAll();
  }

  function formatTime(ts: number) {
    return new Date(ts * 1000).toLocaleString('zh-CN');
  }

  if (!authenticated) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <h1>管理后台</h1>
          <p>请输入管理密钥</p>
          <input
            type="password"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Admin Secret"
          />
          <button onClick={handleLogin}>进入</button>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading) return <div className="admin-page"><div className="admin-loading">加载中...</div></div>;

  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <a href="/" className="admin-logo">TokenRouter Admin</a>
        <div className="admin-nav-links">
          <a href="/console">控制台</a>
          <a href="/billing">账单</a>
          <a href="/admin" className="active">管理</a>
        </div>
      </nav>

      <div className="admin-container">
        <div className="admin-tabs">
          <button className={activeTab === 'metrics' ? 'active' : ''} onClick={() => setActiveTab('metrics')}>概览</button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>充值订单</button>
          <button className={activeTab === 'models' ? 'active' : ''} onClick={() => setActiveTab('models')}>模型管理</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>系统设置</button>
        </div>

        {/* Metrics Tab */}
        {activeTab === 'metrics' && metrics && (
          <div className="admin-section">
            <h2>平台概览</h2>
            <div className="admin-metric-grid">
              <div className="admin-metric-card">
                <div className="admin-metric-label">总用户数</div>
                <div className="admin-metric-value">{metrics.total_users}</div>
              </div>
              <div className="admin-metric-card">
                <div className="admin-metric-label">总请求数</div>
                <div className="admin-metric-value">{metrics.total_requests.toLocaleString()}</div>
              </div>
              <div className="admin-metric-card">
                <div className="admin-metric-label">总收入</div>
                <div className="admin-metric-value">${metrics.total_revenue.toFixed(4)}</div>
              </div>
              <div className="admin-metric-card">
                <div className="admin-metric-label">活跃 API Key</div>
                <div className="admin-metric-value">{metrics.active_keys}</div>
              </div>
              <div className="admin-metric-card">
                <div className="admin-metric-label">今日请求</div>
                <div className="admin-metric-value">{metrics.today_requests}</div>
              </div>
              <div className="admin-metric-card">
                <div className="admin-metric-label">今日收入</div>
                <div className="admin-metric-value">${metrics.today_revenue.toFixed(4)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="admin-section">
            <h2>充值订单管理</h2>
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>时间</th><th>用户</th><th>金额</th><th>渠道</th><th>状态</th><th>备注</th><th>操作</th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{formatTime(o.created_at)}</td>
                    <td>{o.email || `UID:${o.user_id}`}</td>
                    <td>${o.amount.toFixed(2)}</td>
                    <td>{o.channel}</td>
                    <td><span className={`admin-status admin-status-${o.status}`}>
                      {o.status === 'pending' ? '待审核' : o.status === 'approved' ? '已通过' : '已拒绝'}
                    </span></td>
                    <td>{o.note || '-'}</td>
                    <td>
                      {o.status === 'pending' && (
                        <div className="admin-actions">
                          <button className="admin-btn-approve" onClick={() => approveOrder(o.id, true, '已确认收款')}>通过</button>
                          <button className="admin-btn-reject" onClick={() => approveOrder(o.id, false, '未收到付款')}>拒绝</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={8} className="admin-empty">暂无订单</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="admin-section">
            <h2>模型配置</h2>
            <table className="admin-table">
              <thead>
                <tr><th>模型ID</th><th>上游模型</th><th>Provider Chain</th><th>输入价格</th><th>输出价格</th><th>状态</th></tr>
              </thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.model_id || m.id}>
                    <td><code>{m.model_id || m.id}</code></td>
                    <td><code>{m.upstream_model}</code></td>
                    <td><code>{m.provider_chain_json}</code></td>
                    <td>${m.input_price_per_1k}/1k</td>
                    <td>${m.output_price_per_1k}/1k</td>
                    <td>{m.is_active ? <span className="admin-status admin-status-approved">启用</span> : <span className="admin-status admin-status-rejected">停用</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="admin-section">
            <h2>系统设置</h2>
            <div className="admin-settings-grid">
              <div className="admin-setting-item">
                <label>RPM 限制 (每分钟请求数)</label>
                <div className="admin-setting-row">
                  <input type="number" defaultValue={settings.rpm_limit || '60'} id="setting-rpm" />
                  <button onClick={() => { const v = (document.getElementById('setting-rpm') as HTMLInputElement).value; updateSetting('rpm_limit', v); }}>保存</button>
                </div>
              </div>
              <div className="admin-setting-item">
                <label>每日消费限额 (USD)</label>
                <div className="admin-setting-row">
                  <input type="number" step="0.01" defaultValue={settings.daily_spend_limit || '5'} id="setting-spend" />
                  <button onClick={() => { const v = (document.getElementById('setting-spend') as HTMLInputElement).value; updateSetting('daily_spend_limit', v); }}>保存</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

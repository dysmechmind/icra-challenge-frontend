const plans = [
  {
    name: "Starter",
    price: "$0",
    desc: "个人开发与原型验证",
    bullets: ["按量付费", "基础模型路由", "社区支持"],
  },
  {
    name: "Pro",
    price: "$49/mo",
    desc: "团队协作与轻量生产",
    bullets: ["团队成员管理", "预算预警", "优先路由"],
  },
  {
    name: "Scale",
    price: "$299/mo",
    desc: "生产业务与增长阶段",
    bullets: ["多区域容灾", "策略路由", "专属技术支持"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "大型组织与合规场景",
    bullets: ["私有部署", "审计日志", "SLA 合同"],
  },
];

const compareRows = [
  ["OpenAI 兼容 API", "Yes", "Yes", "Yes", "Yes"],
  ["路由策略模板", "Basic", "Standard", "Advanced", "Custom"],
  ["团队与角色权限", "-", "Up to 10", "Up to 100", "Unlimited"],
  ["组织级账单", "-", "Yes", "Yes", "Yes"],
  ["审计与合规", "-", "-", "Optional", "Built-in"],
];

export default function PricingPage() {
  return (
    <div className="orx-page-shell">
      <main className="orx-subpage-shell">
        <section className="orx-subpage-hero">
          <p>Pricing</p>
          <h1>按业务阶段定价，按调用规模增长</h1>
          <span>把模型费用、网关费用和治理成本放在同一个预算框架下管理。</span>
        </section>

        <section className="orx-sub-grid">
          {plans.map((plan) => (
            <article className="orx-sub-card" key={plan.name}>
              <h2>{plan.name}</h2>
              <strong>{plan.price}</strong>
              <p>{plan.desc}</p>
              <ul>
                {plan.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="orx-sub-table-wrap">
          <h3>方案对比</h3>
          <table className="orx-sub-table">
            <thead>
              <tr>
                <th>能力项</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Scale</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((col) => (
                    <td key={col}>{col}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

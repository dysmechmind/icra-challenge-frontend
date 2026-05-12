const steps = [
  "创建账号并生成 API Key",
  "将 SDK base_url 指向网关地址",
  "在控制台配置默认路由策略",
  "开启预算阈值与告警",
  "上线并观察调用成功率与成本",
];

export default function DocsPage() {
  return (
    <div className="orx-page-shell">
      <main className="orx-subpage-shell">
        <section className="orx-subpage-hero">
          <p>Docs</p>
          <h1>开发者接入文档</h1>
          <span>保持调用方式简单，把复杂度留给平台路由与治理能力。</span>
        </section>

        <section className="orx-docs-grid">
          <article className="orx-sub-card">
            <h2>快速开始</h2>
            <ol>
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className="orx-sub-card orx-code-card">
            <h2>Python Example</h2>
            <pre>{`from openai import OpenAI

client = OpenAI(
  base_url="https://token-router.online/v1",
  api_key="sk_live_xxx"
)

resp = client.chat.completions.create(
  model="gpt-4o-mini",
  messages=[{"role": "user", "content": "hello"}],
)
print(resp.choices[0].message.content)`}</pre>
          </article>
        </section>

        <section className="orx-docs-grid">
          <article className="orx-sub-card">
            <h2>路由策略建议</h2>
            <ul>
              <li>高优先任务使用 Quality Blend。</li>
              <li>对话场景使用 Latency First。</li>
              <li>批处理任务使用 Cost Guardrail。</li>
            </ul>
          </article>

          <article className="orx-sub-card">
            <h2>上线检查清单</h2>
            <ul>
              <li>确认模型白名单与回退链路。</li>
              <li>确认每项目预算阈值与告警策略。</li>
              <li>确认日志留存和审计策略。</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

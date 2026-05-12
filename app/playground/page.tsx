"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const defaultApiBase =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ModelRow = {
  id: string;
  upstream_model: string;
  region: string;
  input_price_per_1k: number;
  output_price_per_1k: number;
};

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export default function PlaygroundPage() {
  const apiBase = defaultApiBase.replace(/\/$/, "");

  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    prompt: number;
    completion: number;
    cost: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const storedKey =
      window.localStorage.getItem("token-router-api-key") ?? "";
    if (storedKey) setApiKey(storedKey);
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchModels() {
    try {
      const res = await fetch(`${apiBase}/api/v1/models`);
      const data = (await res.json()) as { data?: ModelRow[] };
      const list = data.data ?? [];
      setModels(list);
      if (list.length > 0 && !selectedModel) {
        setSelectedModel(list[0].id);
      }
    } catch {
      /* ignore */
    }
  }

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || !apiKey || !selectedModel) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const allMsgs: Message[] = [...messages, userMsg];

    // Add system prompt if present
    const apiMsgs: Message[] = [];
    if (systemPrompt.trim()) {
      apiMsgs.push({ role: "system", content: systemPrompt.trim() });
    }
    apiMsgs.push(...allMsgs);

    setMessages(allMsgs);
    setInput("");
    setIsGenerating(true);
    setTokenInfo(null);

    const controller = new AbortController();
    abortRef.current = controller;

    if (streaming) {
      // SSE streaming
      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages([...allMsgs, assistantMsg]);

      try {
        const res = await fetch(`${apiBase}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: apiMsgs.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          setMessages([
            ...allMsgs,
            {
              role: "assistant",
              content: `Error ${res.status}: ${errText}`,
            },
          ]);
          setIsGenerating(false);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimLine = line.trim();
            if (!trimLine || !trimLine.startsWith("data:")) continue;
            const dataStr = trimLine.slice(5).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const chunk = JSON.parse(dataStr);
              const delta = chunk.choices?.[0]?.delta;
              if (delta?.content) {
                accumulated += delta.content;
                setMessages([
                  ...allMsgs,
                  { role: "assistant", content: accumulated },
                ]);
              }
            } catch {
              /* skip malformed chunks */
            }
          }
        }

        if (!accumulated) {
          setMessages([
            ...allMsgs,
            { role: "assistant", content: "(Empty response)" },
          ]);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages([
            ...allMsgs,
            {
              role: "assistant",
              content: `Request failed: ${(err as Error).message}`,
            },
          ]);
        }
      }
    } else {
      // Non-streaming
      try {
        const res = await fetch(`${apiBase}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: apiMsgs.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: false,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok) {
          setMessages([
            ...allMsgs,
            {
              role: "assistant",
              content: `Error ${res.status}: ${data.detail || JSON.stringify(data)}`,
            },
          ]);
        } else {
          const text =
            data.choices?.[0]?.message?.content ?? "(Empty response)";
          setMessages([...allMsgs, { role: "assistant", content: text }]);
          if (data.usage) {
            setTokenInfo({
              prompt: data.usage.prompt_tokens,
              completion: data.usage.completion_tokens,
              cost: data.gateway?.cost ?? 0,
            });
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages([
            ...allMsgs,
            {
              role: "assistant",
              content: `Request failed: ${(err as Error).message}`,
            },
          ]);
        }
      }
    }

    setIsGenerating(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([]);
    setTokenInfo(null);
  }

  function saveApiKey() {
    window.localStorage.setItem("token-router-api-key", apiKey);
  }

  const selectedMeta = models.find((m) => m.id === selectedModel);

  return (
    <div className="pg-shell">
      {/* ── Top Nav ── */}
      <header className="pg-topbar">
        <a href="/" className="pg-brand">
          <span className="pg-brand-mark" />
          token-router
        </a>
        <span className="pg-topbar-title">Playground</span>
        <nav className="pg-topbar-nav">
          <a href="/models">模型</a>
          <a href="/docs">文档</a>
          <a href="/console">控制台</a>
        </nav>
      </header>

      <div className="pg-body">
        {/* ── Left Sidebar: Config ── */}
        <aside className="pg-sidebar">
          <div className="pg-sidebar-section">
            <label className="pg-label">API Key</label>
            <div className="pg-key-row">
              <input
                type="password"
                className="pg-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_..."
              />
              <button className="pg-btn-sm" onClick={saveApiKey} title="Save to browser">
                💾
              </button>
            </div>
          </div>

          <div className="pg-sidebar-section">
            <label className="pg-label">Model</label>
            <select
              className="pg-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
            {selectedMeta && (
              <div className="pg-model-info">
                <span>Region: {selectedMeta.region}</span>
                <span>
                  In: ${selectedMeta.input_price_per_1k}/1k &middot; Out: $
                  {selectedMeta.output_price_per_1k}/1k
                </span>
              </div>
            )}
          </div>

          <div className="pg-sidebar-section">
            <label className="pg-label">System Prompt</label>
            <textarea
              className="pg-textarea-sm"
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
            />
          </div>

          <div className="pg-sidebar-section">
            <label className="pg-label">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="pg-range"
            />
          </div>

          <div className="pg-sidebar-section">
            <label className="pg-label">Max Tokens: {maxTokens}</label>
            <input
              type="range"
              min="64"
              max="8192"
              step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="pg-range"
            />
          </div>

          <div className="pg-sidebar-section pg-toggle-row">
            <label className="pg-label">Stream</label>
            <button
              className={`pg-toggle ${streaming ? "pg-toggle-on" : ""}`}
              onClick={() => setStreaming(!streaming)}
            >
              {streaming ? "ON" : "OFF"}
            </button>
          </div>

          {tokenInfo && (
            <div className="pg-sidebar-section pg-stats">
              <div>
                Prompt: <strong>{tokenInfo.prompt}</strong>
              </div>
              <div>
                Completion: <strong>{tokenInfo.completion}</strong>
              </div>
              <div>
                Cost: <strong>${tokenInfo.cost.toFixed(6)}</strong>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Chat Area ── */}
        <main className="pg-chat">
          <div className="pg-messages">
            {messages.length === 0 && (
              <div className="pg-empty">
                <div className="pg-empty-icon">💬</div>
                <h3>Token-Router Playground</h3>
                <p>
                  选择模型、输入 API Key，即可开始对话。
                  <br />
                  支持实时流式输出，兼容 OpenAI API 格式。
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`pg-msg pg-msg-${msg.role}`}
              >
                <div className="pg-msg-role">
                  {msg.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="pg-msg-content">
                  {msg.content || (
                    <span className="pg-typing">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ── */}
          <div className="pg-input-bar">
            <textarea
              className="pg-input-main"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
              disabled={isGenerating}
            />
            <div className="pg-input-actions">
              {isGenerating ? (
                <button className="pg-btn pg-btn-stop" onClick={stopGeneration}>
                  ■ Stop
                </button>
              ) : (
                <button
                  className="pg-btn pg-btn-send"
                  onClick={handleSend}
                  disabled={!input.trim() || !apiKey || !selectedModel}
                >
                  Send →
                </button>
              )}
              <button className="pg-btn pg-btn-clear" onClick={clearChat}>
                Clear
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

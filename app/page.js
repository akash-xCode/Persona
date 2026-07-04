"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState("hitesh");
  const [messagesByPersona, setMessagesByPersona] = useState({});
  const [draftsByPersona, setDraftsByPersona] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPersonas() {
      const response = await fetch("/api/personas");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not load personas.");
        return;
      }

      setPersonas(data.personas);
      if (data.personas.length > 0) {
        setActivePersonaId((current) => current || data.personas[0].id);
      }
    }

    loadPersonas().catch(() => {
      setError("Could not load personas.");
    });
  }, []);

  const activePersona = personas.find((persona) => persona.id === activePersonaId) || personas[0];
  const activeHistory = messagesByPersona[activePersonaId] || [];
  const activeDraft = draftsByPersona[activePersonaId] || "";
  const hasActiveChat = activeHistory.length > 0 || activeDraft.trim().length > 0;

  async function handleUnlock(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode })
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not unlock chat.");
      return;
    }

    setAuthenticated(true);
    setPasscode("");
  }

  async function sendMessage(rawMessage) {
    if (!activePersonaId || !rawMessage.trim() || loading) {
      return;
    }

    const currentMessage = rawMessage.trim();
    const previousHistory = activeHistory;
    const nextHistory = [...previousHistory, { role: "user", content: currentMessage }];
    setMessagesByPersona((prev) => ({
      ...prev,
      [activePersonaId]: nextHistory
    }));
    setLoading(true);
    setError("");
    setDraftsByPersona((prev) => ({
      ...prev,
      [activePersonaId]: ""
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: activePersonaId,
          message: currentMessage,
          history: previousHistory.slice(-6)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessagesByPersona((prev) => ({
          ...prev,
          [activePersonaId]: previousHistory
        }));
        setError(data.error || "Chat request failed.");
        return;
      }

      setMessagesByPersona((prev) => ({
        ...prev,
        [activePersonaId]: [...(prev[activePersonaId] || []), { role: "assistant", content: data.reply }]
      }));
    } catch {
      setMessagesByPersona((prev) => ({
        ...prev,
        [activePersonaId]: previousHistory
      }));
      setError("Network issue. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    await sendMessage(activeDraft);
  }

  function handleResetChat() {
    if (!activePersonaId) {
      return;
    }

    setMessagesByPersona((prev) => ({
      ...prev,
      [activePersonaId]: []
    }));
    setDraftsByPersona((prev) => ({
      ...prev,
      [activePersonaId]: ""
    }));
    setError("");
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Cohort Assignment</p>
        <h1>Persona Chatbot</h1>
        <p className="subtitle">Chat with Hitesh or Piyush in their teaching style.</p>
      </section>

      {!authenticated ? (
        <section className="auth-card">
          <h2>Unlock Demo</h2>
          <p>Use your private passcode so random people cannot hit the chat API directly.</p>
          <form onSubmit={handleUnlock} className="stack">
            <input
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
            />
            <button type="submit">Unlock Chat</button>
          </form>
          {error ? <p className="error-text">{error}</p> : null}
        </section>
      ) : (
        <section className="chat-layout">
          <aside className="contacts-card">
            <div className="contacts-header">
              <p className="contacts-title">Contacts</p>
            </div>
            <div className="contacts-list">
              {personas.map((persona) => {
                const personaHistory = messagesByPersona[persona.id] || [];
                const lastAssistantMessage = [...personaHistory].reverse().find((entry) => entry.role === "assistant");

                return (
                  <button
                    key={persona.id}
                    type="button"
                    className={`contact-item ${persona.id === activePersonaId ? "active" : ""}`}
                    onClick={() => {
                      setActivePersonaId(persona.id);
                      setError("");
                    }}
                  >
                    <span className="contact-avatar">{persona.name.slice(0, 1)}</span>
                    <span className="contact-copy">
                      <strong>{persona.name}</strong>
                      <span>{lastAssistantMessage?.content?.split("\n")[0] || "Fresh chat ready to start"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="chat-card">
            <div className="toolbar">
              <div className="toolbar-copy">
                <p className="eyebrow">Active Chat</p>
                <h2>{activePersona?.name || "Persona"}</h2>
              </div>
              <div className="toolbar-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleResetChat}
                  disabled={!hasActiveChat || loading}
                >
                  Reset Chat
                </button>
              </div>
            </div>

            <div className="messages">
              {activeHistory.length === 0 ? (
                <div className="empty-state">
                  <p>Start with one tap or type your own question.</p>
                  <div className="suggestions">
                    {(activePersona?.starterPrompts || []).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeHistory.map((entry, index) => (
                <article key={`${entry.role}-${index}`} className={`message ${entry.role}`}>
                  <p className="role">{entry.role === "user" ? "You" : activePersona?.name || "Bot"}</p>
                  <pre>{entry.content}</pre>
                </article>
              ))}
            </div>

            <form onSubmit={handleSend} className="composer">
              <textarea
                rows={4}
                placeholder={`Ask ${activePersona?.name || "the persona"} about coding, backlog, projects, careers...`}
                value={activeDraft}
                onChange={(event) =>
                  setDraftsByPersona((prev) => ({
                    ...prev,
                    [activePersonaId]: event.target.value
                  }))
                }
              />
              <div className="composer-actions">
                <div className="suggestions inline">
                  {activeHistory.length === 0
                    ? null
                    : (activePersona?.starterPrompts || []).slice(0, 2).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => sendMessage(prompt)}
                          disabled={loading}
                        >
                          {prompt}
                        </button>
                      ))}
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="ghost-button mobile-only"
                    onClick={handleResetChat}
                    disabled={!hasActiveChat || loading}
                  >
                    Clear
                  </button>
                  <button type="submit" className="primary-button" disabled={loading}>
                    {loading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </div>
            </form>

            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </section>
      )}
    </main>
  );
}

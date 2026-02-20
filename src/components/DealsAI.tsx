'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  "What is India's biggest defence deal ever?",
  "Compare India-Russia vs India-USA defence ties",
  "What is the status of the Rafale deal?",
  "Which country has most trade deals with India?",
];

export default function DealsAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const userText = text || input.trim();
    if (!userText || loading) return;

    const userMsg: Message = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process that. Please try again.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '14px 22px',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,51,102,0.35)',
          zIndex: 998,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🧠 Ask AI
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 999,
          }}
        />
      )}

      {/* Chat Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 420,
        background: 'white',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--primary)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: 36, height: 36,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
            }}>🧠</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Deals Intelligence AI</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Ask anything about India's deals</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Welcome message */}
          {messages.length === 0 && (
            <div>
              <div style={{
                background: '#f8fafc',
                borderRadius: 14,
                padding: '1rem 1.25rem',
                fontSize: '0.9rem',
                color: '#475569',
                lineHeight: 1.6,
                marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '1.2rem' }}>🇮🇳</span> Namaste! I'm your India Deals Intelligence Assistant. Ask me anything about India's defence, trade, or strategic deals — history, analysis, status, or comparisons.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      background: 'white',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: '0.82rem',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 600,
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#f0f4ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user' ? 'var(--primary)' : '#f1f5f9',
                color: msg.role === 'user' ? 'white' : '#1e293b',
                fontSize: '0.875rem',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: '#f1f5f9',
                borderRadius: '14px 14px 14px 4px',
                padding: '12px 16px',
                display: 'flex',
                gap: 5,
                alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 7, height: 7,
                    borderRadius: '50%',
                    background: '#94a3b8',
                    display: 'inline-block',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '0.75rem',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about any India deal..."
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 10,
              fontSize: '0.875rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              width: 40,
              height: 40,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}

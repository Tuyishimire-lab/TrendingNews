'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  "What's trending today?",
  "Any good news today?",
  "Summarize today's tech news",
  "What's happening in politics?",
];

export default function AIChatPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hey! 👋 I\'m NovaPulse AI. Ask me anything about today\'s news — I\'ll answer based on real articles in our database.' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || isTyping) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            citations: data.citations || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I couldn\'t process that right now. Try again in a moment.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.' },
      ]);
    }
    setIsTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <div className="chat-panel__title">
          <span className="chat-panel__icon">💬</span>
          NovaPulse AI
        </div>
        <button className="chat-panel__close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="chat-panel__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
            {msg.role === 'assistant' && <span className="chat-msg__avatar">🤖</span>}
            <div className="chat-msg__bubble">
              <p>{msg.content}</p>
              {msg.citations?.length > 0 && (
                <div className="chat-msg__citations">
                  <span className="chat-msg__citations-label">Sources:</span>
                  {msg.citations.map((c, j) => (
                    <a key={j} href={c.link} target="_blank" rel="noopener noreferrer" className="chat-msg__citation">
                      {c.source} — {c.title?.substring(0, 50)}...
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-msg chat-msg--assistant">
            <span className="chat-msg__avatar">🤖</span>
            <div className="chat-msg__bubble chat-msg__typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="chat-panel__suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="chat-panel__suggestion" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-panel__input-area">
        <input
          ref={inputRef}
          type="text"
          className="chat-panel__input"
          placeholder="Ask about today's news..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
        />
        <button
          className="chat-panel__send"
          onClick={() => sendMessage()}
          disabled={!input.trim() || isTyping}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="m22 2-11 11"/></svg>
        </button>
      </div>
    </div>
  );
}

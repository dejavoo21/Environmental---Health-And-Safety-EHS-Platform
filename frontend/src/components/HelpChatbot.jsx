import { useMemo, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BOT_GREETING = 'Hi, I can help you find things quickly. Ask about incidents, inspections, permits, risks, training, or access requests.';

const getBotResponse = (input) => {
  const text = String(input || '').toLowerCase();

  if (text.includes('incident')) {
    return { message: 'To report an incident, go to Incidents and select "New Incident".', route: '/incidents/new' };
  }
  if (text.includes('inspection')) {
    return { message: 'To run an inspection, go to Inspections and select "New Inspection".', route: '/inspections/new' };
  }
  if (text.includes('permit')) {
    return { message: 'Open Permits to create or review permits.', route: '/permits' };
  }
  if (text.includes('risk')) {
    return { message: 'Risk Register is where you create and track risks.', route: '/risks' };
  }
  if (text.includes('training')) {
    return { message: 'Go to Training for assignments and the course catalog.', route: '/training' };
  }
  if (text.includes('access') || text.includes('user')) {
    return { message: 'Admins can review user requests under Access Requests.', route: '/admin/access-requests' };
  }
  if (text.includes('report') || text.includes('export')) {
    return { message: 'Use Reports to export CSV/PDF and email reports.', route: '/reports' };
  }

  return { message: 'I did not catch that. Try: "new incident", "inspection", "permit", "risk", "training", or "reports".', route: null };
};

const HelpChatbot = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ from: 'bot', text: BOT_GREETING, route: null }]);

  const quickPrompts = useMemo(() => ([
    'New incident',
    'Start inspection',
    'Permits',
    'Risk register',
    'Training',
    'Reports'
  ]), []);

  const sendPrompt = (value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    const response = getBotResponse(clean);
    setMessages((prev) => [
      ...prev,
      { from: 'user', text: clean, route: null },
      { from: 'bot', text: response.message, route: response.route }
    ]);
    setInput('');
  };

  return (
    <div className="help-chatbot">
      {open && (
        <section className="help-chatbot-panel" aria-label="Help assistant">
          <header className="help-chatbot-header">
            <strong>Quick Guide</strong>
            <button type="button" className="icon-only" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={16} />
            </button>
          </header>

          <div className="help-chatbot-body">
            {messages.map((item, idx) => (
              <div key={`${item.from}-${idx}`} className={`help-chatbot-message ${item.from}`}>
                <p>{item.text}</p>
                {item.route && (
                  <button type="button" className="btn link" onClick={() => navigate(item.route)}>
                    Open page
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="help-chatbot-quick">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" className="btn secondary" onClick={() => sendPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="help-chatbot-input"
            onSubmit={(e) => {
              e.preventDefault();
              sendPrompt(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question"
            />
            <button type="submit" className="btn primary">Send</button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="help-chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide help assistant' : 'Show help assistant'}
      >
        <MessageCircle size={18} />
        <span>Help</span>
      </button>
    </div>
  );
};

export default HelpChatbot;

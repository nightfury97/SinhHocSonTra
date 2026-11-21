import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import Icon from './Icon.jsx';

const SUGGESTIONS = [
  'Voọc chà vá chân nâu thuộc họ nào, hạng IUCN là gì?',
  'Có bao nhiêu loài chim đã ghi nhận?',
  'Liệt kê các loài bị đe doạ',
  'So sánh kết quả khảo sát voọc 2021 và 2023',
];

const TOOL_LABEL = {
  search_species: 'Danh mục loài',
  get_species: 'Hồ sơ loài',
  count_species: 'Thống kê loài',
  survey_summary: 'Khảo sát tuyến',
};

/** Trợ lý tra cứu: hỏi đáp về loài, phân loại, hạng IUCN, thống kê và khảo sát. Dùng model chạy nội bộ. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, tools?, error? }
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      // Chỉ gửi lượt hội thoại gần nhất; bỏ các tin báo lỗi.
      const history = next.filter((m) => !m.error).slice(-10).map(({ role, content: c }) => ({ role, content: c }));
      const res = await api('/chat', { method: 'POST', body: { messages: history } });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, tools: res.tools }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: err.message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button ref={launcherRef} type="button" className="chat-launcher" onClick={() => setOpen(true)} aria-label="Mở trợ lý tra cứu" aria-haspopup="dialog">
          <Icon name="chat" size={20} />
          <span>Hỏi trợ lý</span>
        </button>
      )}

      {open && (
        <section className="chat" role="dialog" aria-label="Trợ lý tra cứu đa dạng sinh học">
          <header className="chat__head">
            <div>
              <strong>Trợ lý tra cứu</strong>
              <div className="cell-sub">Trả lời từ dữ liệu của hệ thống</div>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Đóng trợ lý"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          <div className="chat__log" ref={logRef} role="log" aria-live="polite" aria-busy={busy}>
            {messages.length === 0 && (
              <div className="chat__intro">
                <p>Hỏi về loài, phân loại, hạng IUCN, số liệu thống kê hoặc kết quả khảo sát voọc trên bán đảo Sơn Trà.</p>
                <div className="chat__suggest">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="field__hint">Vị trí quan sát cụ thể không được cung cấp qua trợ lý để bảo vệ loài nguy cấp.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat__msg chat__msg--${m.role}${m.error ? ' chat__msg--error' : ''}`}>
                <div className="chat__bubble">{m.content}</div>
                {m.tools?.length > 0 && <div className="chat__src">Nguồn: {m.tools.map((t) => TOOL_LABEL[t] ?? t).join(' · ')}</div>}
              </div>
            ))}
            {busy && (
              <div className="chat__msg chat__msg--assistant">
                <div className="chat__bubble chat__bubble--typing" role="status">
                  Đang tra cứu…
                </div>
              </div>
            )}
          </div>

          <form
            className="chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <label className="sr-only" htmlFor="chat-input">
              Câu hỏi
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              className="input"
              value={draft}
              maxLength={500}
              placeholder="Nhập câu hỏi…"
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !draft.trim()} data-state={busy ? 'loading' : undefined} aria-label="Gửi">
              <Icon name="send" size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}

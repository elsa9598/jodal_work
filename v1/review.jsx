// review.jsx — OCR 검토 screen, 3 layout variants (tabs / split / accordion)

// Render corrections highlight in raw text
function RawText({ raw, corrections }) {
  if (!corrections || corrections.length === 0) {
    return <div className="raw-text">{raw}</div>;
  }
  // Highlight every "from" occurrence; works for short tokens only
  // Build into spans
  const parts = [];
  let remaining = raw;
  const tokens = corrections.map((c) => c.from);
  // simple replace one-pass
  const re = new RegExp(tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  let lastIdx = 0;
  for (const m of raw.matchAll(re)) {
    if (m.index > lastIdx) parts.push(raw.slice(lastIdx, m.index));
    parts.push(<span key={m.index} className="hl-corrected">{m[0]}</span>);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < raw.length) parts.push(raw.slice(lastIdx));
  return <div className="raw-text">{parts}</div>;
}

// Render the editable fields & diff for a single capture
function CaptureFields({ capture, userValues, onChange }) {
  return (
    <div>
      {capture.fields.map((f) => {
        const aiVal = capture.ai[f.key] ?? '';
        const userVal = userValues[f.key] ?? aiVal;
        const modified = userVal !== aiVal;
        const corr = capture.corrections.find((c) => c.field === f.key);
        return (
          <div key={f.key} className="field">
            <label className="field-label">
              <span>{f.label}{f.unit && <span className="muted"> ({f.unit})</span>}</span>
              {corr && <span className="field-label-tag">자동보정</span>}
              {f.critical && !corr && <span className="field-label-tag" style={{
                color: 'var(--navy-700)', background: 'var(--navy-100)',
              }}>계산 필수</span>}
            </label>
            <input className={`field-input ${modified ? 'modified' : ''}`}
                   value={userVal}
                   onChange={(e) => onChange(capture.id, f.key, e.target.value)} />
            {corr && (
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: -2 }}>
                OCR 원문 <span className="danger-text">{corr.from}</span> →
                AI 보정값 <b style={{ color: 'var(--green-600)' }}>{corr.to}</b>
                <span className="muted"> · {corr.reason}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant A — Tabs (compact)
// ─────────────────────────────────────────────────────────────
function ReviewTabs({ activeIdx, setActiveIdx, userVals, onChange, onInspect, captures }) {
  const cap = captures[activeIdx];
  const [tab, setTab] = React.useState('all'); // all | image | raw | ai
  return (
    <>
      <div className="chip-nav">
        {captures.map((c, i) => {
          const hasCorr = c.corrections.length > 0;
          return (
            <button key={c.id}
                    className={`chip ${i === activeIdx ? 'active' : 'complete'} ${hasCorr ? 'has-correction' : ''}`}
                    onClick={() => setActiveIdx(i)}>
              <span className="chip-dot" />
              {c.id}. {c.title}
            </button>
          );
        })}
      </div>

      <div className="tabs">
        {[
          ['all', '전체'],
          ['image', '원본'],
          ['raw', 'OCR 원문'],
          ['ai', 'AI/수정'],
        ].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`}
                  onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {(tab === 'all' || tab === 'image') && (
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">1</span>
            원본 캡처 이미지
            {cap.real && <span className="pill pill-info" style={{ marginLeft: 'auto' }}>실제 업로드</span>}
            {cap.empty && <span className="pill pill-error" style={{ marginLeft: 'auto' }}>미업로드</span>}
          </div>
          {cap.empty ? (
            <div style={{
              padding: 32, textAlign: 'center', color: 'var(--ink-500)',
              fontSize: 13, background: 'var(--ink-50)', borderRadius: 8,
            }}>이 슬롯에 이미지가 업로드되지 않았습니다.</div>
          ) : (
            <div onClick={() => onInspect(activeIdx)} style={{ cursor: 'zoom-in' }}>
              <CaptureImage index={activeIdx} imageUrl={cap.imageUrl} alt={cap.title} />
            </div>
          )}
          {!cap.empty && (
            <button className="btn btn-ghost"
                    onClick={() => onInspect(activeIdx)}
                    style={{ marginTop: 8 }}>
              🔍 핀치줌으로 자세히 보기
            </button>
          )}
        </div>
      )}

      {(tab === 'all' || tab === 'raw') && (
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">2</span>
            OCR 원문 텍스트
            {cap.corrections.length > 0 && (
              <span className="pill pill-warn" style={{ marginLeft: 'auto' }}>
                보정 {cap.corrections.length}건
              </span>
            )}
          </div>
          <RawText raw={cap.raw} corrections={cap.corrections} />
        </div>
      )}

      {(tab === 'all' || tab === 'ai') && (
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">3</span>
            AI 추출값 · 사용자 수정
          </div>
          <CaptureFields capture={cap} userValues={userVals[cap.id] || {}}
                         onChange={onChange} />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant B — Split (image top, OCR+fields stacked below)
// ─────────────────────────────────────────────────────────────
function ReviewSplit({ activeIdx, setActiveIdx, userVals, onChange, onInspect, captures }) {
  const cap = captures[activeIdx];
  return (
    <>
      <div className="chip-nav">
        {captures.map((c, i) => (
          <button key={c.id}
                  className={`chip ${i === activeIdx ? 'active' : 'complete'} ${c.corrections.length > 0 ? 'has-correction' : ''}`}
                  onClick={() => setActiveIdx(i)}>
            <span className="chip-dot" />
            {c.id}. {c.title}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 10 }}>
        {cap.empty ? (
          <div style={{
            padding: 32, textAlign: 'center', color: 'var(--ink-500)',
            fontSize: 13, background: 'var(--ink-50)', borderRadius: 8,
          }}>이미지 없음</div>
        ) : (
          <div onClick={() => onInspect(activeIdx)} style={{ cursor: 'zoom-in', position: 'relative' }}>
            <CaptureImage index={activeIdx} imageUrl={cap.imageUrl} alt={cap.title} />
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(13, 27, 42, 0.85)', color: '#fff',
              fontSize: 11, padding: '4px 8px', borderRadius: 6,
            }}>🔍 탭하여 확대</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span className="card-title-num">{cap.id}</span>
          {cap.title} — OCR 원문
          {cap.corrections.length > 0 && (
            <span className="pill pill-warn" style={{ marginLeft: 'auto' }}>
              보정 {cap.corrections.length}건
            </span>
          )}
        </div>
        <RawText raw={cap.raw} corrections={cap.corrections} />
      </div>

      <div className="card">
        <div className="card-title">AI 추출값 · 직접 수정</div>
        <CaptureFields capture={cap} userValues={userVals[cap.id] || {}}
                       onChange={onChange} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant C — Accordion (all 5 captures, expand one at a time)
// ─────────────────────────────────────────────────────────────
function ReviewAccordion({ openIdx, setOpenIdx, userVals, onChange, onInspect, captures }) {
  return (
    <>
      {captures.map((cap, i) => {
        const open = openIdx === i;
        const hasCorr = cap.corrections.length > 0;
        return (
          <div key={cap.id} className={`acc-item ${open ? 'open' : ''}`}>
            <div className="acc-head" onClick={() => setOpenIdx(open ? -1 : i)}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: open ? 'var(--navy-800)' : 'var(--navy-50)',
                color: open ? '#fff' : 'var(--navy-800)',
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{cap.id}</div>
              <b>{cap.title}</b>
              {hasCorr && (
                <span className="pill pill-warn">보정 {cap.corrections.length}</span>
              )}
              <span className="acc-chevron">›</span>
            </div>
            {open && (
              <div className="acc-body">
                {cap.empty ? (
                  <div style={{
                    padding: 28, textAlign: 'center', color: 'var(--ink-500)',
                    fontSize: 13, background: 'var(--ink-50)', borderRadius: 8,
                    margin: '12px 0',
                  }}>이 슬롯에 이미지가 업로드되지 않았습니다.</div>
                ) : (
                  <>
                    <div style={{ marginTop: 12, marginBottom: 12 }}
                         onClick={() => onInspect(i)}>
                      <CaptureImage index={i} imageUrl={cap.imageUrl} alt={cap.title} />
                    </div>
                    <button className="btn btn-ghost"
                            onClick={() => onInspect(i)}
                            style={{ marginBottom: 12 }}>
                      🔍 핀치줌으로 자세히 보기
                    </button>
                  </>
                )}
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-500)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
                }}>OCR 원문</div>
                <RawText raw={cap.raw} corrections={cap.corrections} />
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-500)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginTop: 14, marginBottom: 8,
                }}>AI 추출 · 직접 수정</div>
                <CaptureFields capture={cap} userValues={userVals[cap.id] || {}}
                               onChange={onChange} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Review screen wrapper — picks layout by tweak
// ─────────────────────────────────────────────────────────────
function ReviewScreen({ layout, captures, userVals, setUserVals, onBack, onConfirm, onInspect }) {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [openAcc, setOpenAcc] = React.useState(0);

  const onChange = React.useCallback((capId, key, val) => {
    setUserVals((prev) => ({
      ...prev,
      [capId]: { ...(prev[capId] || {}), [key]: val },
    }));
  }, [setUserVals]);

  // Aggregate stats
  const totalCorr = captures.reduce((s, c) => s + c.corrections.length, 0);
  const totalEdits = Object.values(userVals).reduce(
    (s, v) => s + Object.keys(v).length, 0,
  );

  return (
    <div className="app" data-screen-label="04 OCR 검토">
      <div className="app-header">
        <button className="app-header-back" onClick={onBack} aria-label="뒤로">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-header-title">OCR 추출 데이터 검토</div>
          <div className="app-header-sub">
            보정 <b style={{ color: '#fff' }}>{totalCorr}</b>건 · 직접 수정 <b style={{ color: '#fff' }}>{totalEdits}</b>건
          </div>
        </div>
      </div>

      <div className="app-body">
        <div style={{
          padding: 12, borderRadius: 10, background: 'var(--navy-50)',
          border: '1px solid var(--navy-100)', fontSize: 12,
          color: 'var(--navy-800)', lineHeight: 1.55,
        }}>
          이미지에서 추출한 <b>원문</b>과 AI가 정리한 <b>추출값</b>을 비교한 뒤,
          잘못 인식된 값은 직접 수정하고 <b>최종 확정</b>해주세요.
        </div>

        {layout === 'tabs' && (
          <ReviewTabs activeIdx={activeIdx} setActiveIdx={setActiveIdx}
                      userVals={userVals} onChange={onChange}
                      onInspect={onInspect} captures={captures} />
        )}
        {layout === 'split' && (
          <ReviewSplit activeIdx={activeIdx} setActiveIdx={setActiveIdx}
                       userVals={userVals} onChange={onChange}
                       onInspect={onInspect} captures={captures} />
        )}
        {layout === 'accordion' && (
          <ReviewAccordion openIdx={openAcc} setOpenIdx={setOpenAcc}
                           userVals={userVals} onChange={onChange}
                           onInspect={onInspect} captures={captures} />
        )}
      </div>

      <div className="app-footer">
        <button className="btn btn-primary" onClick={onConfirm}>
          ✓ 최종 확정 후 계산하기
        </button>
      </div>
    </div>
  );
}

window.ReviewScreen = ReviewScreen;

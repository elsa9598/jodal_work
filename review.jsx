// review.jsx — Single-capture OCR review (v2)
// 4 cards: 원본 이미지 / OCR 원문 / AI 추출 / 사용자 수정
// Layout variants: stacked / tabs / accordion

function RawText({ raw, corrections }) {
  if (!corrections || corrections.length === 0 || !raw) {
    return <div className="raw-text">{raw || '(OCR 원문 없음)'}</div>;
  }
  const tokens = corrections.map((c) => c.from).filter(Boolean);
  if (tokens.length === 0) return <div className="raw-text">{raw}</div>;
  const re = new RegExp(
    tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g',
  );
  const parts = [];
  let lastIdx = 0;
  for (const m of raw.matchAll(re)) {
    if (m.index > lastIdx) parts.push(raw.slice(lastIdx, m.index));
    parts.push(<span key={m.index} className="hl-corrected">{m[0]}</span>);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < raw.length) parts.push(raw.slice(lastIdx));
  return <div className="raw-text">{parts}</div>;
}

// Group fields by their `group` key
function groupFields(fields) {
  const groups = { notice: [], amount: [], rate: [] };
  fields.forEach((f) => {
    const g = f.group || 'notice';
    if (!groups[g]) groups[g] = [];
    groups[g].push(f);
  });
  return groups;
}

const GROUP_LABELS = {
  notice: '공고 정보',
  amount: '금액 정보',
  rate:   '사정률 정보',
};

// Fields editor — one row per field, grouped
function FieldsEditor({ capture, userVals, onChange }) {
  const groups = groupFields(capture.fields);
  return (
    <div>
      {Object.entries(groups).map(([gid, fs]) => {
        if (fs.length === 0) return null;
        return (
          <div key={gid} style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--navy-700)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 8, paddingBottom: 6,
              borderBottom: '1px solid var(--ink-100)',
            }}>{GROUP_LABELS[gid] || gid}</div>
            {fs.map((f) => {
              const aiVal = capture.ai[f.key] ?? '';
              const userVal = userVals[f.key] ?? aiVal;
              const modified = userVal !== aiVal;
              const corr = capture.corrections.find((c) => c.field === f.key);
              return (
                <div key={f.key} className="field">
                  <label className="field-label">
                    <span>{f.label}{f.unit && <span className="muted"> ({f.unit})</span>}</span>
                    {corr && <span className="field-label-tag">자동보정</span>}
                    {f.critical && !corr && (
                      <span className="field-label-tag" style={{
                        color: 'var(--navy-700)', background: 'var(--navy-100)',
                      }}>계산 필수</span>
                    )}
                  </label>
                  <input className={`field-input ${modified ? 'modified' : ''}`}
                         value={userVal}
                         placeholder={f.critical ? '값 입력 필요' : ''}
                         onChange={(e) => onChange(f.key, e.target.value)} />
                  {corr && (
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: -2 }}>
                      OCR 원문 <span className="danger-text">{corr.from}</span> →
                      AI 보정 <b style={{ color: 'var(--green-600)' }}>{corr.to}</b>
                      <span className="muted"> · {corr.reason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Card components (reused across layouts) ─────────────────────────────────
function ImageCard({ capture, onInspect, compact }) {
  return (
    <div className="card" style={compact ? { padding: 10 } : undefined}>
      {!compact && (
        <div className="card-title">
          <span className="card-title-num">1</span>
          원본 캡처 이미지
          {capture.real && (
            <span className="pill pill-info" style={{ marginLeft: 'auto' }}>
              실제 업로드
            </span>
          )}
        </div>
      )}
      <div onClick={onInspect} style={{ cursor: 'zoom-in', position: 'relative' }}>
        <CaptureImage imageUrl={capture.imageUrl} alt={capture.title} />
        {compact && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(13, 27, 42, 0.85)', color: '#fff',
            fontSize: 11, padding: '4px 8px', borderRadius: 6,
          }}>🔍 탭하여 확대</div>
        )}
      </div>
      {!compact && (
        <button className="btn btn-ghost" onClick={onInspect}
                style={{ marginTop: 8 }}>
          🔍 핀치줌으로 자세히 보기
        </button>
      )}
    </div>
  );
}

function RawCard({ capture }) {
  return (
    <div className="card">
      <div className="card-title">
        <span className="card-title-num">2</span>
        OCR 원문 텍스트
        {capture.corrections.length > 0 && (
          <span className="pill pill-warn" style={{ marginLeft: 'auto' }}>
            자동 보정 {capture.corrections.length}건
          </span>
        )}
      </div>
      <RawText raw={capture.raw} corrections={capture.corrections} />
    </div>
  );
}

function ExtractedCard({ capture, userVals, onChange }) {
  return (
    <div className="card">
      <div className="card-title">
        <span className="card-title-num">3</span>
        AI 추출 · 직접 수정
      </div>
      <FieldsEditor capture={capture} userVals={userVals} onChange={onChange} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ReviewScreen — picks layout by tweak
// ─────────────────────────────────────────────────────────────
function ReviewScreen({ layout, capture, userVals, setUserVals,
                        onBack, onConfirm, onInspect }) {
  const onChange = React.useCallback((key, val) => {
    setUserVals((prev) => ({ ...prev, [key]: val }));
  }, [setUserVals]);

  const editCount = Object.keys(userVals).filter((k) => {
    const ai = capture.ai[k] ?? '';
    return (userVals[k] ?? ai) !== ai;
  }).length;
  const corrCount = capture.corrections.length;

  const [tab, setTab] = React.useState('all');     // for tabs layout
  const [openAcc, setOpenAcc] = React.useState(0); // for accordion layout

  return (
    <div className="app" data-screen-label="04 OCR 검토">
      <div className="app-header">
        <button className="app-header-back" onClick={onBack} aria-label="뒤로">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-header-title">OCR 추출 데이터 검토</div>
          <div className="app-header-sub">
            보정 <b style={{ color: '#fff' }}>{corrCount}</b>건 ·
            직접 수정 <b style={{ color: '#fff' }}>{editCount}</b>건
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

        {layout === 'stacked' && (
          <>
            <ImageCard capture={capture} onInspect={onInspect} />
            <RawCard capture={capture} />
            <ExtractedCard capture={capture} userVals={userVals} onChange={onChange} />
          </>
        )}

        {layout === 'tabs' && (
          <>
            <div className="tabs">
              {[['all', '전체'], ['image', '원본'], ['raw', 'OCR 원문'], ['fields', 'AI/수정']].map(([k, l]) => (
                <button key={k} className={`tab ${tab === k ? 'active' : ''}`}
                        onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            {(tab === 'all' || tab === 'image') && <ImageCard capture={capture} onInspect={onInspect} />}
            {(tab === 'all' || tab === 'raw')   && <RawCard capture={capture} />}
            {(tab === 'all' || tab === 'fields') && (
              <ExtractedCard capture={capture} userVals={userVals} onChange={onChange} />
            )}
          </>
        )}

        {layout === 'accordion' && (
          <>
            {[
              { key: 'image', title: '원본 캡처 이미지', n: 1 },
              { key: 'raw',   title: 'OCR 원문 텍스트', n: 2 },
              { key: 'edit',  title: 'AI 추출 · 직접 수정', n: 3 },
            ].map((sec, i) => {
              const open = openAcc === i;
              return (
                <div key={sec.key} className={`acc-item ${open ? 'open' : ''}`}>
                  <div className="acc-head" onClick={() => setOpenAcc(open ? -1 : i)}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: open ? 'var(--navy-800)' : 'var(--navy-50)',
                      color: open ? '#fff' : 'var(--navy-800)',
                      fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}>{sec.n}</div>
                    <b>{sec.title}</b>
                    {sec.key === 'raw' && corrCount > 0 && (
                      <span className="pill pill-warn">보정 {corrCount}</span>
                    )}
                    <span className="acc-chevron">›</span>
                  </div>
                  {open && (
                    <div className="acc-body">
                      {sec.key === 'image' && (
                        <>
                          <div style={{ marginTop: 12, marginBottom: 12 }}
                               onClick={onInspect}>
                            <CaptureImage imageUrl={capture.imageUrl} />
                          </div>
                          <button className="btn btn-ghost" onClick={onInspect}>
                            🔍 핀치줌으로 자세히 보기
                          </button>
                        </>
                      )}
                      {sec.key === 'raw' && (
                        <div style={{ paddingTop: 14 }}>
                          <RawText raw={capture.raw} corrections={capture.corrections} />
                        </div>
                      )}
                      {sec.key === 'edit' && (
                        <div style={{ paddingTop: 14 }}>
                          <FieldsEditor capture={capture} userVals={userVals} onChange={onChange} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="app-footer">
        <button className="btn btn-primary" onClick={onConfirm}>
          ✓ 최종 확정 후 분석 시작
        </button>
      </div>
    </div>
  );
}

window.ReviewScreen = ReviewScreen;

// screens-flow.jsx — Start / Upload / Loading screens (v2 single-capture)

// ─────────────────────────────────────────────────────────────
// Start screen
// ─────────────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  return (
    <div className="app" data-screen-label="01 시작">
      <div className="app-header" style={{
        background: 'linear-gradient(155deg, #0a1f3d 0%, #173b6e 100%)',
        paddingTop: 28, paddingBottom: 28,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8,
          }}>나라장터 보조 도구</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            조달청 낙찰<br />예상 시뮬레이터
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)',
                        marginTop: 10, lineHeight: 1.5 }}>
            비드큐 캡처 1장 → OCR → AI 유사공사 분석 →<br />
            보수형 / 중간형 / 공격형 투찰 전략
          </div>
        </div>
      </div>

      <div className="app-body" style={{ paddingTop: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className="pill pill-info">v 2.0</span>
            <span className="pill pill-ok">Claude vision OCR</span>
            <span className="pill pill-warn">AI 분석</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 6 }}>
            캡처 1장으로 시작
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.55 }}>
            비드큐 모바일 캡처 1장을 업로드하면 AI가 OCR로 핵심 정보를 추출하고,
            <b style={{ color: 'var(--ink-900)' }}> 나라장터 유사 공사 패턴</b>을 비교 분석해
            예상 투찰 전략을 제안합니다.
          </div>
        </div>

        <div className="card">
          <div className="card-title">분석 단계</div>
          {[
            { n: 1, t: '비드큐 캡처 1장 업로드', s: 'JPG / PNG / WEBP · 1080px 이상 권장' },
            { n: 2, t: 'Claude vision OCR', s: '공고·금액·사정률 정보를 자동 추출' },
            { n: 3, t: '원문 ↔ AI 추출값 비교', s: '잘못 인식된 값은 직접 수정' },
            { n: 4, t: '유사 공사 AI 분석', s: '나라장터 패턴으로 사정률 구간 추정' },
            { n: 5, t: '3가지 전략 시뮬레이션', s: '보수형 / 중간형 / 공격형' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12,
                background: 'var(--navy-50)', color: 'var(--navy-800)',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{s.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{s.t}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{s.s}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: 12, borderRadius: 10, background: '#fff7e6',
          border: '1px solid #f5d490', fontSize: 11.5, color: '#92590f',
          lineHeight: 1.5,
        }}>
          본 결과는 OCR + AI 통계 추정 기반 <b>참고용 시뮬레이션</b>입니다.
          유사 공사 분석은 학습된 패턴 기반 추정치이며, 실제 개찰 결과를 보장하지 않습니다.
        </div>
      </div>

      <div className="app-footer">
        <button className="btn btn-primary" onClick={onStart}>
          비드큐 캡처 등록 시작 →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Upload screen — single slot
// ─────────────────────────────────────────────────────────────
function UploadScreen({ upload, onUpload, onClear, onBack, onAnalyze, onUseDemo }) {
  const fileRef = React.useRef(null);
  const canAnalyze = !!upload;

  return (
    <div className="app" data-screen-label="02 이미지 등록">
      <div className="app-header">
        <button className="app-header-back" onClick={onBack} aria-label="뒤로">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-header-title">비드큐 캡처 1장 등록</div>
          <div className="app-header-sub">
            {upload ? '✓ 등록됨' : '캡처 이미지를 업로드해 주세요'}
          </div>
        </div>
      </div>

      <div className="app-body">
        {!upload && (
          <div style={{
            padding: 12, borderRadius: 10, background: 'var(--navy-50)',
            border: '1px solid var(--navy-100)', fontSize: 12,
            color: 'var(--navy-800)', display: 'flex', gap: 10,
          }}>
            <span>📷</span>
            <div style={{ lineHeight: 1.5 }}>
              공고번호·기초금액·낙찰하한율이 모두 보이는 캡처 1장이면 충분합니다.
              Claude vision으로 <b>실시간 OCR</b>이 실행됩니다.
            </div>
          </div>
        )}

        {/* The single upload slot — larger than the v1 row */}
        <div className={`upload-slot upload-hero ${upload ? 'filled' : ''}`}
             onClick={(e) => {
               if (upload || e.target.closest('.upload-slot-action')) return;
               fileRef.current?.click();
             }}>
          {upload ? (
            <>
              {upload.url ? (
                <img src={upload.url} alt=""
                     style={{ width: '100%', borderRadius: 8, display: 'block',
                              maxHeight: 360, objectFit: 'contain',
                              background: '#f5f7fb', border: '1px solid var(--ink-200)' }} />
              ) : (
                <div style={{
                  padding: 32, textAlign: 'center', background: '#f5f7fb',
                  borderRadius: 8, color: 'var(--ink-500)', fontSize: 13,
                }}>📷 데모 이미지</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginTop: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' }}>{upload.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                    {(upload.size / 1024).toFixed(0)} KB
                    {upload.demo && ' · 데모 데이터'}
                  </div>
                </div>
                <div className="upload-slot-actions">
                  <button className="upload-slot-action"
                          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                          aria-label="다시 선택">↻</button>
                  <button className="upload-slot-action"
                          onClick={(e) => { e.stopPropagation(); onClear(); }}
                          aria-label="삭제">✕</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '36px 16px', textAlign: 'center', gap: 12, width: '100%',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--navy-50)', color: 'var(--navy-800)',
                fontSize: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'center',
              }}>+</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)' }}>
                  비드큐 캡처 이미지 선택
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
                  JPG · PNG · WEBP / 최대 10MB
                </div>
              </div>
            </div>
          )}
          <input ref={fileRef}
                 type="file" accept="image/jpeg,image/png,image/webp"
                 style={{ display: 'none' }}
                 onChange={(e) => {
                   const f = e.target.files?.[0];
                   if (f) onUpload(f);
                   e.target.value = '';
                 }} />
        </div>

        <button className="btn btn-ghost" onClick={onUseDemo}
                style={{ marginTop: 4, color: 'var(--ink-500)' }}>
          또는 데모 데이터로 채우기 →
        </button>
      </div>

      <div className="app-footer">
        <button className="btn btn-primary"
                disabled={!canAnalyze} onClick={onAnalyze}>
          🎯 {upload?.file ? 'OCR + AI 분석 시작' : '데모 분석 시작'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Loading screen — 2 phases (OCR + Similar-work analysis)
// ─────────────────────────────────────────────────────────────
function LoadingScreen({ realStage, realError }) {
  // realStage: { phase: 'ocr'|'analysis'|'done', label, percent }
  // realError: string | null
  const phase = realStage?.phase || 'ocr';
  const phaseLabel = {
    ocr: 'Claude vision OCR',
    analysis: 'AI 유사 공사 분석',
    done: '완료',
  }[phase];

  const steps = [
    { id: 'ocr-upload',    phase: 'ocr',      label: '이미지 업로드 & 압축' },
    { id: 'ocr-run',       phase: 'ocr',      label: 'Claude vision OCR' },
    { id: 'ocr-extract',   phase: 'ocr',      label: '공고·금액·사정률 추출' },
    { id: 'analysis-run',  phase: 'analysis', label: '나라장터 유사공사 검색' },
    { id: 'analysis-stat', phase: 'analysis', label: '사정률 패턴 분석' },
    { id: 'strategy',      phase: 'analysis', label: '3가지 전략 생성' },
  ];

  const stepIdx = realStage?.stepIdx ?? 0;

  return (
    <div className="app" data-screen-label="03 OCR + AI 로딩"
         style={{ background: 'var(--bg)' }}>
      <div className="app-header">
        <div style={{ flex: 1 }}>
          <div className="app-header-title">
            {realError ? '분석 중 오류' : 'AI 분석 중'}
          </div>
          <div className="app-header-sub">{realError ? '아래 오류를 확인해 주세요' : phaseLabel}</div>
        </div>
      </div>

      <div className="app-body" style={{ alignItems: 'stretch' }}>
        <div className="loading-stage">
          <div className="loading-orb" style={realError ? {
            background: 'radial-gradient(circle at 30% 30%, #e57373, #c62828)',
            animation: 'none',
          } : {}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              {realError ? (
                <path d="M12 8v5M12 17v.01M5 19h14a1 1 0 00.87-1.5l-7-12a1 1 0 00-1.74 0l-7 12A1 1 0 005 19z"
                      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M3 12h3l2-7 4 14 2-7h7" stroke="#fff" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4 }}>
              {realError ? '오류 발생' : (steps[stepIdx]?.label || '준비 중') + '...'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5,
                          maxWidth: 320, margin: '0 auto' }}>
              {realError ||
               (phase === 'ocr'
                ? '비드큐 캡처에서 텍스트와 항목을 추출하고 있습니다'
                : '나라장터 유사 공사 패턴으로 사정률을 추정하고 있습니다')}
            </div>
          </div>
        </div>

        <div className="card">
          {steps.map((s, i) => {
            const status = i < stepIdx ? 'done' : i === stepIdx ? 'active' : '';
            const phaseTint = s.phase === 'analysis' ? 'analysis' : 'ocr';
            return (
              <div key={s.id} className={`loading-step ${status}`}
                   style={{ padding: '7px 0' }}>
                <div className="loading-check">{i < stepIdx ? '✓' : i + 1}</div>
                <b>{s.label}</b>
                <span style={{
                  marginLeft: 'auto', fontSize: 10,
                  color: 'var(--ink-400)', fontWeight: 500,
                }}>{phaseTint === 'ocr' ? 'OCR' : 'AI 분석'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.StartScreen = StartScreen;
window.UploadScreen = UploadScreen;
window.LoadingScreen = LoadingScreen;

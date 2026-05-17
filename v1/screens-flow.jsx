// screens-flow.jsx — Start, Upload, Loading, Result screens

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
        </div>
      </div>

      <div className="app-body" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <span className="pill pill-info">v 1.0</span>
            <span className="pill pill-ok">OCR 엔진 연결됨</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 6 }}>
            5장 캡처로 한번에 분석
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.55 }}>
            비드큐 모바일 캡처 5장을 업로드하면 AI가 OCR 분석을 통해
            <b style={{ color: 'var(--ink-900)' }}> 조달청 기준 예상 투찰 금액</b>을 계산합니다.
          </div>
        </div>

        <div className="card">
          <div className="card-title">분석 단계</div>
          {[
            { n: 1, t: '비드큐 캡처 5장 업로드', s: 'JPG / PNG / WEBP · 1080px 이상 권장' },
            { n: 2, t: 'OCR 텍스트 추출 & 병합', s: '이미지 5장에서 텍스트를 자동으로 추출합니다' },
            { n: 3, t: '원문 ↔ AI 추출값 비교', s: '잘못 인식된 값은 직접 수정할 수 있습니다' },
            { n: 4, t: '조달청 기준 계산', s: '기초금액 × 사정률 × 낙찰하한율' },
          ].map((s, i, arr) => (
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
          본 결과는 OCR 데이터 기반 <b>참고용 시뮬레이션</b>입니다.
          투찰 전 반드시 조달청 원문과 비드큐 원문을 직접 확인하세요.
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
// Upload screen
// ─────────────────────────────────────────────────────────────
function UploadScreen({ uploads, onUpload, onClear, onBack, onAnalyze, onUseDemo }) {
  const fileRefs = React.useRef({});
  const filledCount = uploads.filter(Boolean).length;
  const realCount = uploads.filter((u) => u && u.file).length;
  const canAnalyze = filledCount >= 1;

  return (
    <div className="app" data-screen-label="02 이미지 등록">
      <div className="app-header">
        <button className="app-header-back" onClick={onBack} aria-label="뒤로">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-header-title">비드큐 캡처 5장 등록</div>
          <div className="app-header-sub">
            <b style={{ color: '#fff', fontWeight: 600 }}>{filledCount}</b> / 5장 등록됨
          </div>
        </div>
      </div>

      <div className="app-body">
        {filledCount === 0 && (
          <div style={{
            padding: 12, borderRadius: 10, background: 'var(--navy-50)',
            border: '1px solid var(--navy-100)', fontSize: 12,
            color: 'var(--navy-800)', display: 'flex', gap: 10,
          }}>
            <span>📷</span>
            <div style={{ lineHeight: 1.5 }}>
              비드큐 캡처를 업로드하면 Claude vision으로 <b>실시간 OCR</b>이 실행됩니다.
              1장만 올려도 분석할 수 있고, 5장 모두 등록하면 더 정확한 결과가 나옵니다.
            </div>
          </div>
        )}
        {filledCount > 0 && filledCount < 5 && (
          <div style={{
            padding: 10, borderRadius: 8, background: '#fff7e6',
            border: '1px solid #f5d490', fontSize: 12, color: '#92590f',
            lineHeight: 1.5,
          }}>
            <b>{filledCount}장</b>으로 분석할 수 있습니다.
            미업로드 슬롯은 검토 화면에서 "이미지 없음"으로 표시됩니다.
          </div>
        )}

        {DEMO_CAPTURES.map((cap, i) => {
          const file = uploads[i];
          return (
            <div key={cap.id} className={`upload-slot ${file ? 'filled' : ''}`}
                 onClick={(e) => {
                   if (file || e.target.closest('.upload-slot-action')) return;
                   fileRefs.current[i]?.click();
                 }}>
              <div className="upload-slot-num">{file ? '✓' : cap.id}</div>
              <div className="upload-slot-meta">
                <div className="upload-slot-title">캡처 {cap.id} — {cap.title}</div>
                <div className="upload-slot-sub">
                  {file
                    ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB`
                    : '탭하여 이미지 선택'}
                </div>
              </div>
              {file && file.url && (
                <img className="upload-slot-thumb" src={file.url} alt="" />
              )}
              <div className="upload-slot-actions">
                {file ? (
                  <>
                    <button className="upload-slot-action"
                            onClick={(e) => { e.stopPropagation(); fileRefs.current[i]?.click(); }}
                            aria-label="다시 선택">↻</button>
                    <button className="upload-slot-action"
                            onClick={(e) => { e.stopPropagation(); onClear(i); }}
                            aria-label="삭제">✕</button>
                  </>
                ) : (
                  <button className="upload-slot-action" aria-label="이미지 선택"
                          onClick={(e) => { e.stopPropagation(); fileRefs.current[i]?.click(); }}>+</button>
                )}
              </div>
              <input ref={(el) => (fileRefs.current[i] = el)}
                     type="file" accept="image/jpeg,image/png,image/webp"
                     style={{ display: 'none' }}
                     onChange={(e) => {
                       const f = e.target.files?.[0];
                       if (f) onUpload(i, f);
                       e.target.value = '';
                     }} />
            </div>
          );
        })}

        <button className="btn btn-ghost" onClick={onUseDemo}
                style={{ marginTop: 4, color: 'var(--ink-500)' }}>
          또는 데모 데이터로 채우기 →
        </button>
      </div>

      <div className="app-footer">
        <button className="btn btn-primary"
                disabled={!canAnalyze} onClick={onAnalyze}>
          🎯 {realCount > 0 ? `${realCount}장 OCR 분석 시작` : `${filledCount}장 분석 시작 (데모)`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Loading screen
// ─────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  '이미지 5장 로드',
  '이미지별 OCR 실행',
  'OCR 텍스트 병합',
  '숫자·날짜·금액 정제',
  '핵심 데이터 추출',
  '검토 화면 준비',
];

function LoadingScreen({ onDone, realProgress, realError }) {
  // realProgress: null = demo mode (fake timer); object = drive from real OCR
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (realProgress !== null) return undefined;
    if (step >= LOADING_STEPS.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 550 + Math.random() * 200);
    return () => clearTimeout(t);
  }, [step, onDone, realProgress]);

  // Real mode: derive label from progress
  const isReal = realProgress !== null;
  const currentLabel = isReal
    ? (realProgress?.label || '준비 중')
    : LOADING_STEPS[step] || '완료';

  return (
    <div className="app" data-screen-label="03 OCR 로딩"
         style={{ background: 'var(--bg)' }}>
      <div className="app-header">
        <div style={{ flex: 1 }}>
          <div className="app-header-title">
            {realError ? 'OCR 오류' : isReal ? 'AI OCR 분석 중' : 'AI 연산 중'}
          </div>
          <div className="app-header-sub">
            {realError ? '아래 오류를 확인해 주세요' :
             isReal ? `이미지 ${(realProgress?.step ?? 0) + 1} / ${realProgress?.total ?? 5}` :
             '캡처에서 텍스트를 추출하고 있습니다'}
          </div>
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
              {realError ? 'OCR 실행 중 오류 발생'
                         : isReal ? currentLabel + ' 분석 중'
                                  : '비드큐 캡처 5장 분석 중'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5,
                          maxWidth: 320, margin: '0 auto' }}>
              {realError ? realError
                         : isReal ? 'Claude vision으로 텍스트와 항목을 추출하고 있습니다'
                                  : 'OCR 텍스트 추출 → 정제 → AI 추출값 생성'}
            </div>
          </div>
        </div>

        {isReal ? (
          <div className="card">
            {Array.from({ length: realProgress?.total ?? 5 }).map((_, i) => {
              const cur = realProgress?.step ?? 0;
              const status = i < cur ? 'done' : i === cur ? 'active' : '';
              return (
                <div key={i} className={`loading-step ${status}`} style={{ padding: '7px 0' }}>
                  <div className="loading-check">{i < cur ? '✓' : i + 1}</div>
                  <b>이미지 {i + 1} OCR 분석</b>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            {LOADING_STEPS.map((label, i) => (
              <div key={i} className={`loading-step ${
                i < step ? 'done' : i === step ? 'active' : ''
              }`} style={{ padding: '7px 0' }}>
                <div className="loading-check">
                  {i < step ? '✓' : i + 1}
                </div>
                <b>{label}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.StartScreen = StartScreen;
window.UploadScreen = UploadScreen;
window.LoadingScreen = LoadingScreen;

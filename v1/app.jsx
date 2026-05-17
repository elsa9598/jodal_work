// app.jsx — routing + real OCR orchestration + Tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "reviewLayout": "split",
  "amountStyle": "red-big"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState('start'); // start | upload | loading | review | result
  const [uploads, setUploads] = React.useState([null, null, null, null, null]);
  const [captures, setCaptures] = React.useState(DEMO_CAPTURES); // active dataset
  const [userVals, setUserVals] = React.useState({});
  const [inspector, setInspector] = React.useState({ open: false, idx: 0 });
  const [ocrProgress, setOcrProgress] = React.useState(null); // null = demo / fake; object = real
  const [ocrError, setOcrError] = React.useState(null);

  // amount-style tweak → css vars
  React.useEffect(() => {
    const root = document.documentElement;
    if (t.amountStyle === 'red-big') {
      root.style.setProperty('--amount-color', 'var(--red-500)');
      root.style.setProperty('--amount-size', '40px');
    } else if (t.amountStyle === 'red-mega') {
      root.style.setProperty('--amount-color', 'var(--red-500)');
      root.style.setProperty('--amount-size', '48px');
    } else {
      root.style.setProperty('--amount-color', '#fff');
      root.style.setProperty('--amount-size', '36px');
    }
  }, [t.amountStyle]);

  // ── Uploads ───────────────────────────────────────────────
  const handleUpload = (i, file) => {
    const url = URL.createObjectURL(file);
    setUploads((prev) => {
      const next = [...prev];
      if (next[i]?.url && !next[i].demo) URL.revokeObjectURL(next[i].url);
      next[i] = { file, name: file.name, size: file.size, url, demo: false };
      return next;
    });
  };

  const handleClear = (i) => {
    setUploads((prev) => {
      const next = [...prev];
      if (next[i]?.url && !next[i].demo) URL.revokeObjectURL(next[i].url);
      next[i] = null;
      return next;
    });
  };

  const useDemo = () => {
    setUploads(DEMO_CAPTURES.map((c) => ({
      name: `bidq_capture_${c.id}.png`,
      size: 380000 + c.id * 12000,
      url: null, file: null, demo: true,
    })));
  };

  // ── Analysis ──────────────────────────────────────────────
  const startAnalysis = async () => {
    const anyReal = uploads.some((u) => u && u.file);
    setUserVals({});  // reset edits when re-analyzing
    setScreen('loading');
    setOcrError(null);

    if (!anyReal) {
      // demo path — keep the canned data + fake-progress loading
      setOcrProgress(null);
      setCaptures(DEMO_CAPTURES);
      // LoadingScreen will call onDone via timer
      return;
    }

    // Real OCR path
    setOcrProgress({ step: 0, total: uploads.length, label: '준비 중', status: 'running' });
    try {
      const results = await window.ocrAll(uploads, DEMO_CAPTURES,
        (p) => setOcrProgress(p));
      setCaptures(results);
      setOcrProgress({ step: uploads.length, total: uploads.length, status: 'done' });
      // small delay so the final tick is visible
      setTimeout(() => setScreen('review'), 400);
    } catch (e) {
      console.error('OCR pipeline error', e);
      setOcrError(e?.message || String(e));
    }
  };

  const onLoadingDone = () => {
    // Only used by demo-mode (fake-timer) loading
    setScreen('review');
  };

  const reanalyze = () => {
    setOcrProgress(null);
    setScreen('upload');
  };

  const openInspector = (idx) => setInspector({ open: true, idx });
  const closeInspector = () => setInspector({ open: false, idx: 0 });

  // Re-run OCR for a single slot (retry button)
  const retryOcr = async (i) => {
    const u = uploads[i];
    if (!u || !u.file) return;
    setOcrProgress({ step: i, total: 5, label: DEMO_CAPTURES[i].title, status: 'running' });
    setScreen('loading');
    try {
      const r = await window.ocrCapture(u.file, DEMO_CAPTURES[i]);
      setCaptures((prev) => {
        const next = [...prev];
        next[i] = {
          ...DEMO_CAPTURES[i],
          raw: r.raw, ai: r.extracted, corrections: r.corrections,
          imageUrl: u.url, real: true,
        };
        return next;
      });
      setOcrProgress({ step: 5, total: 5, status: 'done' });
      setTimeout(() => setScreen('review'), 400);
    } catch (e) {
      setOcrError(e?.message || String(e));
    }
  };

  // ── Render ────────────────────────────────────────────────
  const currentImageUrl = captures[inspector.idx]?.imageUrl || null;

  let content = null;
  if (screen === 'start') {
    content = <StartScreen onStart={() => setScreen('upload')} />;
  } else if (screen === 'upload') {
    content = (
      <UploadScreen
        uploads={uploads}
        onUpload={handleUpload}
        onClear={handleClear}
        onBack={() => setScreen('start')}
        onAnalyze={startAnalysis}
        onUseDemo={useDemo}
      />
    );
  } else if (screen === 'loading') {
    content = (
      <LoadingScreen
        onDone={onLoadingDone}
        realProgress={ocrProgress}
        realError={ocrError}
      />
    );
  } else if (screen === 'review') {
    content = (
      <ReviewScreen
        layout={t.reviewLayout}
        captures={captures}
        userVals={userVals}
        setUserVals={setUserVals}
        onBack={() => setScreen('upload')}
        onConfirm={() => setScreen('result')}
        onInspect={openInspector}
        onRetryOcr={retryOcr}
      />
    );
  } else if (screen === 'result') {
    content = (
      <ResultScreen
        captures={captures}
        userVals={userVals}
        onBack={() => setScreen('review')}
        onReanalyze={reanalyze}
        onInspect={openInspector}
      />
    );
  }

  return (
    <>
      <AndroidDevice width={412} height={892}>
        {content}
      </AndroidDevice>

      <ImageInspector
        open={inspector.open}
        title={`캡처 ${inspector.idx + 1} — ${captures[inspector.idx]?.title || ''}`}
        captureIndex={inspector.idx}
        imageUrl={currentImageUrl}
        onClose={closeInspector}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="OCR 검토 화면 레이아웃">
          <TweakRadio
            label="레이아웃"
            value={t.reviewLayout}
            options={[
              { value: 'tabs', label: '탭' },
              { value: 'split', label: '분할' },
              { value: 'accordion', label: '아코디언' },
            ]}
            onChange={(v) => setTweak('reviewLayout', v)}
          />
        </TweakSection>

        <TweakSection label="화면 이동">
          <TweakSelect
            label="현재 화면"
            value={screen}
            options={[
              { value: 'start', label: '1. 시작' },
              { value: 'upload', label: '2. 업로드' },
              { value: 'loading', label: '3. OCR 로딩' },
              { value: 'review', label: '4. OCR 검토' },
              { value: 'result', label: '5. 최종 결과' },
            ]}
            onChange={(v) => {
              if ((v === 'review' || v === 'result') &&
                  uploads.every((u) => !u)) {
                useDemo();
                setCaptures(DEMO_CAPTURES);
              }
              setScreen(v);
            }}
          />
        </TweakSection>

        <TweakSection label="결과 카드">
          <TweakRadio
            label="금액 강조"
            value={t.amountStyle}
            options={[
              { value: 'red-big', label: '빨강 크게' },
              { value: 'red-mega', label: '매우 크게' },
              { value: 'white', label: '기본' },
            ]}
            onChange={(v) => setTweak('amountStyle', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

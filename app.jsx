// app.jsx — v2 single-capture + AI similar-work analysis

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "reviewLayout": "stacked",
  "amountStyle": "red-big"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [screen, setScreen] = React.useState('start');
  const [upload, setUpload] = React.useState(null); // { file, name, size, url, demo }
  const [capture, setCapture] = React.useState(null); // active OCR result
  const [userVals, setUserVals] = React.useState({});
  const [analysis, setAnalysis] = React.useState(null);
  const [analysisError, setAnalysisError] = React.useState(null);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [realStage, setRealStage] = React.useState({ phase: 'ocr', stepIdx: 0 });
  const [ocrError, setOcrError] = React.useState(null);

  // Apply amount-style tweak
  React.useEffect(() => {
    const root = document.documentElement;
    if (t.amountStyle === 'red-big') {
      root.style.setProperty('--amount-color', 'var(--red-500)');
      root.style.setProperty('--amount-size', '40px');
    } else if (t.amountStyle === 'red-mega') {
      root.style.setProperty('--amount-color', 'var(--red-500)');
      root.style.setProperty('--amount-size', '50px');
    } else {
      root.style.setProperty('--amount-color', '#fff');
      root.style.setProperty('--amount-size', '36px');
    }
  }, [t.amountStyle]);

  // ── Uploads ───────────────────────────────────────────────
  const handleUpload = (file) => {
    if (upload?.url && !upload.demo) URL.revokeObjectURL(upload.url);
    const url = URL.createObjectURL(file);
    setUpload({ file, name: file.name, size: file.size, url, demo: false });
  };

  const handleClear = () => {
    if (upload?.url && !upload.demo) URL.revokeObjectURL(upload.url);
    setUpload(null);
  };

  const useDemo = () => {
    setUpload({
      name: 'bidq_demo_capture.png',
      size: 412800,
      url: null, file: null, demo: true,
    });
  };

  // ── Analysis pipeline ─────────────────────────────────────
  async function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function runFakeProgress(steps, fromIdx = 0) {
    for (let i = fromIdx; i < steps.length; i++) {
      setRealStage(steps[i]);
      await delay(400 + Math.random() * 200);
    }
  }

  async function runPipeline() {
    setUserVals({});
    setCapture(null);
    setAnalysis(null);
    setAnalysisError(null);
    setOcrError(null);
    setRealStage({ phase: 'ocr', stepIdx: 0 });
    setScreen('loading');

    const isReal = upload && upload.file;
    if (!isReal) {
      // Demo path
      await delay(400);
      setRealStage({ phase: 'ocr', stepIdx: 1 });
      await delay(500);
      setRealStage({ phase: 'ocr', stepIdx: 2 });
      await delay(450);
      const demoCap = {
        ...CAPTURE_SCHEMA,
        raw: DEMO_CAPTURE.raw,
        ai: DEMO_CAPTURE.ai,
        corrections: DEMO_CAPTURE.corrections,
        imageUrl: null,
        real: false,
      };
      setCapture(demoCap);
      setRealStage({ phase: 'analysis', stepIdx: 3 });
      await delay(500);
      setRealStage({ phase: 'analysis', stepIdx: 4 });
      await delay(450);
      setRealStage({ phase: 'analysis', stepIdx: 5 });
      setAnalysis(DEMO_ANALYSIS);
      await delay(400);
      setScreen('review');
      return;
    }

    // Real path
    try {
      // Phase 1: OCR
      setRealStage({ phase: 'ocr', stepIdx: 0 });  // compress
      await delay(150);
      setRealStage({ phase: 'ocr', stepIdx: 1 });  // OCR call
      const ocrResult = await window.ocrSingleCapture(upload.file, CAPTURE_SCHEMA);
      setRealStage({ phase: 'ocr', stepIdx: 2 });
      const newCapture = {
        ...CAPTURE_SCHEMA,
        raw: ocrResult.raw,
        ai: ocrResult.extracted,
        corrections: ocrResult.corrections,
        imageUrl: upload.url,
        real: true,
      };
      setCapture(newCapture);
      await delay(200);

      // Phase 2: Similar-work analysis (uses extracted values, before user edits)
      setRealStage({ phase: 'analysis', stepIdx: 3 });
      let analysisResult = null;
      try {
        analysisResult = await window.runSimilarWorkAnalysis(ocrResult.extracted);
        setRealStage({ phase: 'analysis', stepIdx: 4 });
        await delay(200);
        setRealStage({ phase: 'analysis', stepIdx: 5 });
        setAnalysis(analysisResult);
      } catch (ae) {
        console.warn('Similar-work analysis failed:', ae);
        setAnalysisError(ae?.message || String(ae));
      }
      await delay(300);
      setScreen('review');
    } catch (e) {
      console.error('OCR pipeline error', e);
      setOcrError(e?.message || String(e));
    }
  }

  // Re-run only the similar-work analysis (after user edits)
  async function rerunAnalysis() {
    if (!capture) return;
    setAnalysisError(null);
    setRealStage({ phase: 'analysis', stepIdx: 3 });
    setScreen('loading');
    // Use current effective values (AI + user overrides)
    const finalValues = { ...capture.ai, ...userVals };
    try {
      const result = await window.runSimilarWorkAnalysis(finalValues);
      setRealStage({ phase: 'analysis', stepIdx: 4 });
      await delay(200);
      setRealStage({ phase: 'analysis', stepIdx: 5 });
      setAnalysis(result);
      await delay(300);
      setScreen('result');
    } catch (e) {
      setAnalysisError(e?.message || String(e));
      setScreen('result');
    }
  }

  const reanalyze = () => {
    setRealStage({ phase: 'ocr', stepIdx: 0 });
    setScreen('upload');
  };

  // Render
  let content = null;
  if (screen === 'start') {
    content = <StartScreen onStart={() => setScreen('upload')} />;
  } else if (screen === 'upload') {
    content = (
      <UploadScreen
        upload={upload}
        onUpload={handleUpload}
        onClear={handleClear}
        onBack={() => setScreen('start')}
        onAnalyze={runPipeline}
        onUseDemo={useDemo}
      />
    );
  } else if (screen === 'loading') {
    content = <LoadingScreen realStage={realStage} realError={ocrError} />;
  } else if (screen === 'review') {
    content = (
      <ReviewScreen
        layout={t.reviewLayout}
        capture={capture || { ...CAPTURE_SCHEMA, raw: '', ai: {}, corrections: [], imageUrl: null }}
        userVals={userVals}
        setUserVals={setUserVals}
        onBack={() => setScreen('upload')}
        onConfirm={() => {
          // If user edited critical values, re-run analysis. Otherwise just go.
          const aiBase = capture?.ai?.base_price;
          const aiRate = capture?.ai?.lower_bound_rate;
          const userBase = userVals.base_price;
          const userRate = userVals.lower_bound_rate;
          const changed = (userBase !== undefined && userBase !== aiBase) ||
                          (userRate !== undefined && userRate !== aiRate);
          if (changed && capture?.real) {
            rerunAnalysis();
          } else {
            setScreen('result');
          }
        }}
        onInspect={() => setInspectorOpen(true)}
      />
    );
  } else if (screen === 'result') {
    content = (
      <ResultScreen
        capture={capture || { ...CAPTURE_SCHEMA, raw: '', ai: {}, corrections: [], imageUrl: null }}
        userVals={userVals}
        analysis={analysis}
        analysisError={analysisError}
        onBack={() => setScreen('review')}
        onReanalyze={reanalyze}
        onInspect={() => setInspectorOpen(true)}
        onRunAnalysis={rerunAnalysis}
      />
    );
  }

  return (
    <>
      <AndroidDevice width={412} height={892}>
        {content}
      </AndroidDevice>

      <ImageInspector
        open={inspectorOpen}
        title={`${capture?.title || '캡처'} ${capture?.real ? '(실제)' : '(데모)'}`}
        imageUrl={capture?.imageUrl}
        onClose={() => setInspectorOpen(false)}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="OCR 검토 화면 레이아웃">
          <TweakRadio
            label="레이아웃"
            value={t.reviewLayout}
            options={[
              { value: 'stacked', label: '분할' },
              { value: 'tabs', label: '탭' },
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
              { value: 'start',   label: '1. 시작' },
              { value: 'upload',  label: '2. 업로드' },
              { value: 'loading', label: '3. 로딩' },
              { value: 'review',  label: '4. OCR 검토' },
              { value: 'result',  label: '5. 결과' },
            ]}
            onChange={(v) => {
              if ((v === 'review' || v === 'result') && !capture) {
                // Bootstrap demo data so the screens have something
                setCapture({
                  ...CAPTURE_SCHEMA,
                  raw: DEMO_CAPTURE.raw,
                  ai: DEMO_CAPTURE.ai,
                  corrections: DEMO_CAPTURE.corrections,
                  imageUrl: null,
                  real: false,
                });
                setAnalysis(DEMO_ANALYSIS);
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
              { value: 'red-big', label: '빨강' },
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

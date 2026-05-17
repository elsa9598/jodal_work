// app.jsx — main app: routing between screens + Tweaks panel

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "reviewLayout": "split",
  "headerStyle": "navy",
  "showSafetyNotice": true,
  "amountStyle": "red-big"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState('start'); // start | upload | loading | review | result
  const [uploads, setUploads] = React.useState([null, null, null, null, null]);
  const [userVals, setUserVals] = React.useState({}); // { capId: { fieldKey: value } }
  const [inspector, setInspector] = React.useState({ open: false, idx: 0 });

  // Apply amount style tweak to CSS var
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

  const handleUpload = (i, file) => {
    const url = URL.createObjectURL(file);
    setUploads((prev) => {
      const next = [...prev];
      // revoke previous url if any
      if (next[i]?.url) URL.revokeObjectURL(next[i].url);
      next[i] = { name: file.name, size: file.size, url };
      return next;
    });
  };

  const handleClear = (i) => {
    setUploads((prev) => {
      const next = [...prev];
      if (next[i]?.url) URL.revokeObjectURL(next[i].url);
      next[i] = null;
      return next;
    });
  };

  const useDemo = () => {
    // Fill all slots with synthetic file data so the user can proceed.
    setUploads(DEMO_CAPTURES.map((c) => ({
      name: `bidq_capture_${c.id}.png`,
      size: 380000 + c.id * 12000,
      url: null,
      demo: true,
    })));
  };

  const startAnalysis = () => {
    setScreen('loading');
  };

  const onLoadingDone = () => {
    setScreen('review');
  };

  const reanalyze = () => {
    setScreen('upload');
  };

  const openInspector = (idx) => setInspector({ open: true, idx });
  const closeInspector = () => setInspector({ open: false, idx: 0 });

  // pick screen content
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
    content = <LoadingScreen onDone={onLoadingDone} />;
  } else if (screen === 'review') {
    content = (
      <ReviewScreen
        layout={t.reviewLayout}
        captures={DEMO_CAPTURES}
        userVals={userVals}
        setUserVals={setUserVals}
        onBack={() => setScreen('upload')}
        onConfirm={() => setScreen('result')}
        onInspect={openInspector}
      />
    );
  } else if (screen === 'result') {
    content = (
      <ResultScreen
        captures={DEMO_CAPTURES}
        userVals={userVals}
        onBack={() => setScreen('review')}
        onReanalyze={reanalyze}
        onInspect={openInspector}
      />
    );
  }

  // Hint card for first-time users
  const hint = screen === 'upload' && uploads.every((u) => !u);

  return (
    <>
      <AndroidDevice width={412} height={892}>
        {content}
      </AndroidDevice>

      {/* Inspector lives OUTSIDE the device frame so it can fill the viewport
          for true pinch-zoom inspection. */}
      <ImageInspector
        open={inspector.open}
        title={`캡처 ${inspector.idx + 1} — ${DEMO_CAPTURES[inspector.idx]?.title || ''}`}
        captureIndex={inspector.idx}
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
          <TweakButton
            label={screen === 'review' ? '검토 화면 다시 보기' : '검토 화면으로 이동'}
            onClick={() => setScreen('review')}
          />
        </TweakSection>

        <TweakSection label="화면 빠른 이동">
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
              if (v === 'review' || v === 'result') {
                // Ensure uploads are filled so screens have data
                if (uploads.every((u) => !u)) useDemo();
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
              { value: 'red-mega', label: '빨강 매우 크게' },
              { value: 'white', label: '기본' },
            ]}
            onChange={(v) => setTweak('amountStyle', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

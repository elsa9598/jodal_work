/* global React, ReactDOM, window */
// Main app — routing, state, tweaks

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

// Read tweak defaults from inline script
function readTweakDefaults() {
  const el = document.getElementById('TWEAK_DEFAULTS');
  if (!el) return { accent: 'navy' };
  const m = el.textContent.match(/\{[\s\S]*\}/);
  if (!m) return { accent: 'navy' };
  try { return JSON.parse(m[0]); } catch { return { accent: 'navy' }; }
}

const ACCENT_OPTIONS = {
  blue: { name: '파랑', color: '#4f8cff', soft: 'rgba(79,140,255,0.14)', line: 'rgba(79,140,255,0.32)' },
  navy: { name: '네이비', color: '#5b7cfa', soft: 'rgba(91,124,250,0.14)', line: 'rgba(91,124,250,0.32)' },
  green: { name: '그린', color: '#10b981', soft: 'rgba(16,185,129,0.14)', line: 'rgba(16,185,129,0.38)' },
  orange: { name: '오렌지', color: '#f97316', soft: 'rgba(249,115,22,0.14)', line: 'rgba(249,115,22,0.38)' },
};

function applyAccent(name) {
  const a = ACCENT_OPTIONS[name] || ACCENT_OPTIONS.navy;
  const r = document.documentElement.style;
  r.setProperty('--accent', a.color);
  r.setProperty('--accent-soft', a.soft);
  r.setProperty('--accent-line', a.line);
}

function App() {
  const [route, setRoute] = useStateApp('home');
  const [, _bump] = useStateApp(0);
  const [activeNotice, setActiveNotice] = useStateApp(null);

  // 실데이터(live.jsx) 도착 시 재렌더
  useEffectApp(() => {
    const h = () => _bump((x) => x + 1);
    window.addEventListener('jodal:update', h);
    return () => window.removeEventListener('jodal:update', h);
  }, []);
  const [savedIds, setSavedIds] = useStateApp(() => new Set(['N-20260514-0231', 'N-20260513-0188']));
  const [finalChoice, setFinalChoice] = useStateApp(null);

  // Tweaks
  const defaults = useMemoApp(() => readTweakDefaults(), []);
  const [t, setTweak] = (window.useTweaks || (() => [defaults, () => {}]))(defaults);
  useEffectApp(() => { applyAccent(t.accent || 'navy'); }, [t.accent]);

  const openNotice = (n) => { setActiveNotice(n); setRoute('detail'); setFinalChoice(null); };
  const toggleSave = (id) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSavedIds(next);
  };
  const chooseFinal = (c) => setFinalChoice(c);

  // Crumbs
  const crumbs = useMemoApp(() => {
    const base = ['투찰 전략 보조'];
    const map = {
      home: ['홈'],
      list: ['실시간 입찰'],
      detail: ['실시간 입찰', activeNotice ? activeNotice.title : '공고 상세'],
      analysis: ['실시간 입찰', activeNotice ? activeNotice.title : '공고', '유사 공사 분석'],
      simulation: ['실시간 입찰', activeNotice ? activeNotice.title : '공고', '투찰가 시뮬레이션'],
      dashboard: ['실시간 입찰', activeNotice ? activeNotice.title : '공고', '결과 대시보드'],
      history: ['내 투찰 기록'],
    };
    return [...base, ...(map[route] || [])];
  }, [route, activeNotice]);

  const Body = () => {
    switch (route) {
      case 'home':
        return <window.HomeScreen onGo={setRoute} onOpenNotice={openNotice} saved={savedIds} onToggleSave={toggleSave} />;
      case 'list':
        return <window.ListScreen onOpenNotice={openNotice} saved={savedIds} onToggleSave={toggleSave} />;
      case 'detail':
        return <window.DetailScreen notice={activeNotice} onGo={setRoute} saved={savedIds} onToggleSave={toggleSave} />;
      case 'analysis':
        return <window.AnalysisScreen notice={activeNotice} onGo={setRoute} />;
      case 'simulation':
        return <window.SimulationScreen notice={activeNotice} onGo={setRoute} finalChoice={finalChoice} onChooseFinal={chooseFinal} />;
      case 'dashboard':
        return <window.DashboardScreen notice={activeNotice} finalChoice={finalChoice} onGo={setRoute} />;
      case 'history':
        return <window.HistoryScreen onGo={setRoute} />;
      default:
        return null;
    }
  };

  const T = window.TweaksPanel;
  const TS = window.TweakSection;
  const TC = window.TweakColor;

  return (
    <div className="app">
      <window.UI.Sidebar current={route} onGo={(r) => {
        if (r === 'detail' || r === 'analysis' || r === 'simulation' || r === 'dashboard') {
          if (!activeNotice && window.APP_DATA.NOTICES.length) {
            setActiveNotice(window.APP_DATA.NOTICES[0]);
          }
        }
        setRoute(r);
      }} />
      <div>
        <window.UI.Topbar crumbs={crumbs} />
        <main className="main">{Body()}</main>
      </div>

      {T && (
        <T title="Tweaks">
          <TS title="브랜드 컬러">
            <TC
              label="액센트 컬러"
              value={t.accent}
              onChange={(v) => setTweak('accent', v)}
              options={Object.keys(ACCENT_OPTIONS).map(k => ACCENT_OPTIONS[k].color)}
            />
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              파랑 / 네이비 / 그린 / 오렌지 — 차트·버튼·핵심 강조에 적용됩니다.
            </div>
          </TS>
        </T>
      )}
    </div>
  );
}

// — Mount —
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

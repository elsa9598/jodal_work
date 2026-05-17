/* global React, window */
// Shared UI primitives + icons

const { useState, useEffect, useMemo, useRef } = React;

// ---------- Icons ----------
const Icon = ({ name, size = 18, ...rest }) => {
  const paths = {
    home: <path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-8.5z" />,
    list: <><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/></>,
    detail: <><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/></>,
    calc: <><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/></>,
    history: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.4" fill="none"/>,
    starFill: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />,
    bell: <path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM9 21a3 3 0 006 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>,
    search: <><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    check: <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    arrowRight: <path d="M5 12h14m-5-5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    arrowLeft: <path d="M19 12H5m5 5l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    chevron: <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    info: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 8v.01M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    warn: <><path d="M12 3l10 18H2L12 3z" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 10v4M12 17v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    spark: <><path d="M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l2.5 2.5M16.5 16.5L19 19M5 19l2.5-2.5M16.5 7.5L19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    save: <><path d="M5 3h11l3 3v15a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M8 3v6h7V3" stroke="currentColor" strokeWidth="1.6" fill="none"/></>,
    external: <><path d="M14 4h6v6M10 14L20 4M19 13v7H4V5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round"/>,
    clock: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    pin: <><path d="M12 22v-7M8 15h8l-1-5 3-2-7-7-7 7 3 2-1 5z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round"/></>,
    brand: <><path d="M4 18l4-6 4 3 5-8 3 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...rest}>
      {paths[name]}
    </svg>
  );
};

// ---------- Sidebar ----------
function Sidebar({ current, onGo }) {
  const items = [
    { id: 'home', label: '홈', icon: 'home' },
    { id: 'list', label: '실시간 입찰', icon: 'list' },
    { id: 'analysis', label: '유사공사 분석', icon: 'chart' },
    { id: 'simulation', label: '투찰가 시뮬레이션', icon: 'calc' },
    { id: 'dashboard', label: '결과 대시보드', icon: 'grid' },
    { id: 'history', label: '내 투찰 기록', icon: 'history' },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="brand" /></div>
        <div>
          <div className="brand-name">조달청 투찰 전략</div>
          <div className="brand-sub">서울 · 토목·포장 전용</div>
        </div>
      </div>

      <div className="nav-section">메뉴</div>
      {items.map(it => (
        <button
          key={it.id}
          className={'nav-item' + (current === it.id ? ' active' : '')}
          onClick={() => onGo(it.id)}
        >
          <Icon name={it.icon} className="ico" />
          <span className="nav-label">{it.label}</span>
        </button>
      ))}

      <div className="sidebar-footer">
        <strong>참고용 시뮬레이션</strong><br/>
        나라장터 공개데이터 기반.<br/>실제 낙찰을 보장하지 않습니다.
      </div>
    </aside>
  );
}

// ---------- Topbar ----------
function Topbar({ crumbs = [] }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">›</span>}
            <span className={i === crumbs.length - 1 ? 'here' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-spacer"></div>
      <span className="pill"><span className="dot"></span> 나라장터 OpenAPI · 실시간</span>
      <span className="pill">2026.05.17 · KST</span>
      <button className="btn btn-sm btn-ghost" title="알림"><Icon name="bell" size={16}/></button>
    </div>
  );
}

// ---------- Notice card (for list grid + home) ----------
function NoticeCard({ notice, onOpen, compact = false, saved = false, onToggleSave }) {
  const { fmt, statusLabel } = window.APP_DATA;
  const st = statusLabel(notice.status);
  return (
    <div
      className="card"
      style={{ cursor: 'pointer', padding: compact ? 16 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}
      onClick={() => onOpen && onOpen(notice)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className={'badge ' + st.cls}><span className="dot"></span>{st.label}</span>
            <span className="badge">{notice.work}</span>
            {notice.flag && <span className="badge badge-neg">{notice.flag}</span>}
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.35 }}>
            {notice.title}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--ink-low)' }}>
            <span>{notice.agency}</span>
            <span style={{ color: 'var(--ink-dim)' }}>·</span>
            <span>{notice.region}</span>
          </div>
        </div>
        {onToggleSave && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={e => { e.stopPropagation(); onToggleSave(notice.id); }}
            title={saved ? '관심 해제' : '관심 등록'}
            style={{ color: saved ? 'var(--accent)' : 'var(--ink-low)' }}
          >
            <Icon name={saved ? 'starFill' : 'star'} size={16}/>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div className="stat-label">기초금액</div>
          <div className="stat-value tnum" style={{ fontSize: 18 }}>{fmt(notice.base_price)}<span className="muted" style={{ fontSize: 12, marginLeft: 3 }}>원</span></div>
        </div>
        <div>
          <div className="stat-label">낙찰하한율 · 마감</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            <span className="tnum">{notice.lower_rate}%</span>
            <span className="muted" style={{ marginLeft: 8 }}>·</span>
            <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>D-{notice.days_left}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
          <span className="muted" style={{ fontSize: 11.5 }}>공고 {notice.notice_no}</span>
          <span className="lnk" style={{ fontSize: 12.5, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            상세 분석 <Icon name="arrowRight" size={14}/>
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- Bar chart (사정률 분포) ----------
function BucketBars({ buckets, highlight, accent }) {
  const max = Math.max(...buckets.map(b => b.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
      {buckets.map(b => {
        const h = (b.count / max) * 100;
        const isHi = highlight && highlight.includes(b.range);
        return (
          <div key={b.range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-mid)', fontWeight: 600 }} className="tnum">{b.count}</div>
            <div style={{
              width: '100%', height: `${h}%`,
              background: isHi ? 'var(--accent)' : 'var(--surface-3)',
              borderRadius: '6px 6px 2px 2px',
              boxShadow: isHi ? '0 0 24px var(--accent-line)' : 'none',
              transition: 'all .25s ease',
              minHeight: 8,
            }}/>
            <div style={{ fontSize: 9.5, color: 'var(--ink-low)', textAlign: 'center', lineHeight: 1.2 }} className="tnum">{b.range}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Page head ----------
function PageHead({ title, sub, right }) {
  return (
    <div className="page-head">
      <div style={{ flex: 1 }}>
        <div className="page-title">{title}</div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

window.UI = { Icon, Sidebar, Topbar, NoticeCard, BucketBars, PageHead };

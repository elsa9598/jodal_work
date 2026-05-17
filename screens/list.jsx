/* global React, window */
// Screen 2 — 실시간 입찰 목록

const { useState: useStateList, useMemo: useMemoList } = React;

function ListScreen({ onOpenNotice, saved, onToggleSave }) {
  const { NOTICES, fmt, statusLabel } = window.APP_DATA;
  const { Icon } = window.UI;

  const [workFilter, setWorkFilter] = useStateList('전체');
  const [statusFilter, setStatusFilter] = useStateList('전체');
  const [sort, setSort] = useStateList('마감 임박순');
  const [q, setQ] = useStateList('');

  const works = ['전체', '도로포장', '아스콘포장', '보도블록정비', '차도정비', '인도정비', '하수도정비', '상수도정비', '굴착복구', '배수로정비', '토목공사'];
  const statuses = ['전체', '정상 진행', '마감 임박', '마감 완료'];

  const filtered = useMemoList(() => {
    let xs = [...NOTICES];
    if (workFilter !== '전체') xs = xs.filter(x => x.work === workFilter);
    if (statusFilter === '마감 임박') xs = xs.filter(x => x.status === 'urgent');
    if (statusFilter === '정상 진행') xs = xs.filter(x => x.status === 'open');
    if (statusFilter === '마감 완료') xs = xs.filter(x => x.status === 'closed');
    if (q.trim()) {
      const k = q.trim();
      xs = xs.filter(x => x.title.includes(k) || x.agency.includes(k) || x.region.includes(k));
    }
    if (sort === '마감 임박순') xs.sort((a, b) => a.days_left - b.days_left);
    if (sort === '기초금액 높은순') xs.sort((a, b) => b.base_price - a.base_price);
    if (sort === '기초금액 낮은순') xs.sort((a, b) => a.base_price - b.base_price);
    if (sort === '최신 공고순') xs.sort((a, b) => b.notice_no.localeCompare(a.notice_no));
    return xs;
  }, [workFilter, statusFilter, sort, q]);

  return (
    <div className="fade-in">
      <window.UI.PageHead
        title="실시간 입찰 공고"
        sub={`나라장터에서 수집된 서울시 관공서 토목·포장 공사 공고 ${NOTICES.length}건. 마감일·공종·기관별로 필터링하여 분석할 공고를 선택하세요.`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn"><Icon name="save" size={14}/> 내보내기</button>
            <button className="btn btn-primary"><Icon name="filter" size={14}/> 고급 필터</button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-low)' }}/>
            <input
              className="input"
              placeholder="공고명·발주기관·지역으로 검색"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ paddingLeft: 34, width: '100%' }}
            />
          </div>
          <Select value={workFilter} onChange={setWorkFilter} options={works} label="공종" />
          <Select value={statusFilter} onChange={setStatusFilter} options={statuses} label="상태" />
          <Select value={sort} onChange={setSort} options={['마감 임박순', '기초금액 높은순', '기초금액 낮은순', '최신 공고순']} label="정렬" />
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {['오늘 마감', '3일 이내', '7일 이내', '1억 이하', '1~3억', '3억 이상', '구청', '공사·공단', '교육청'].map(t => (
            <button key={t} className="btn btn-sm" style={{ fontSize: 11.5 }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card card-flush">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>공고명</th>
              <th>발주기관 · 지역</th>
              <th>공종</th>
              <th className="right">기초금액</th>
              <th className="right">낙찰하한율</th>
              <th>마감 · 개찰</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(n => {
              const st = statusLabel(n.status);
              const isSaved = saved.has(n.id);
              return (
                <tr key={n.id} className="clickable" onClick={() => onOpenNotice(n)}>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => onToggleSave(n.id)}
                      style={{ color: isSaved ? 'var(--accent)' : 'var(--ink-dim)', padding: 4 }}
                    >
                      <Icon name={isSaved ? 'starFill' : 'star'} size={15}/>
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>{n.title}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>공고 {n.notice_no}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{n.agency}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{n.region}</div>
                  </td>
                  <td><span className="badge">{n.work}</span></td>
                  <td className="right tnum strong">{fmt(n.base_price)}<span className="muted" style={{ fontWeight: 400, fontSize: 11, marginLeft: 3 }}>원</span></td>
                  <td className="right tnum">{n.lower_rate}%</td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{n.deadline.slice(5)}</div>
                    <div className="muted" style={{ fontSize: 11 }}>개찰 {n.opening.slice(5, 10)}</div>
                  </td>
                  <td>
                    <span className={'badge ' + st.cls}><span className="dot"></span>{st.label}</span>
                    {n.status !== 'closed' && (
                      <div className="tnum" style={{ fontSize: 11, marginTop: 4, color: n.status === 'urgent' ? 'var(--warn)' : 'var(--ink-low)' }}>D-{n.days_left}</div>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()} style={{ width: 90 }}>
                    <button className="btn btn-sm" onClick={() => onOpenNotice(n)}>
                      분석 <Icon name="arrowRight" size={12}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ fontSize: 11.5, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>총 {filtered.length}건 표시 · 나라장터 OpenAPI 기준 5분 전 갱신</span>
        <span>※ 본 화면은 참고용 시뮬레이션입니다. 투찰 전 조달청 원문 공고를 반드시 확인하세요.</span>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-low)' }}>
      <span>{label}</span>
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

window.ListScreen = ListScreen;

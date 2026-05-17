// MockCapture — fake BidQ mobile screenshots rendered as SVG
// Each one looks like a phone screenshot of the BidQ app for the
// corresponding capture step.

const BQ_NAVY = '#0e2854';
const BQ_BLUE = '#2962a8';
const BQ_BG   = '#f4f6fa';
const BQ_INK  = '#1a2942';

function CaptureHeader({ subtitle }) {
  return (
    <g>
      <rect x="0" y="0" width="360" height="56" fill={BQ_NAVY} />
      <circle cx="22" cy="28" r="8" fill="#fff" opacity="0.85" />
      <text x="40" y="33" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui">BidQ</text>
      <text x="80" y="33" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">{subtitle}</text>
      <circle cx="340" cy="28" r="3" fill="#fff" opacity="0.6" />
      <circle cx="328" cy="28" r="3" fill="#fff" opacity="0.6" />
      <circle cx="316" cy="28" r="3" fill="#fff" opacity="0.6" />
    </g>
  );
}

function FieldRow({ y, label, value, valueColor = BQ_INK, bold = false }) {
  return (
    <g>
      <text x="18" y={y} fill="#6b7a92" fontSize="11" fontFamily="system-ui">{label}</text>
      <text x="342" y={y} fill={valueColor} fontSize="13" fontWeight={bold ? '700' : '500'}
            fontFamily="system-ui" textAnchor="end">{value}</text>
      <line x1="14" x2="346" y1={y + 12} y2={y + 12} stroke="#e2e7ef" strokeWidth="1" />
    </g>
  );
}

// Cap 1 — notice info
function Cap1() {
  return (
    <svg viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg" className="mock-capture">
      <rect width="360" height="640" fill={BQ_BG} />
      <CaptureHeader subtitle="공고 정보" />
      <rect x="14" y="74" width="332" height="78" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="98" fill={BQ_NAVY} fontSize="11" fontWeight="600" fontFamily="system-ui">[공고번호]</text>
      <text x="26" y="118" fill={BQ_INK} fontSize="15" fontWeight="700" fontFamily="system-ui">20251115-00834-00</text>
      <text x="26" y="138" fill="#6b7a92" fontSize="11" fontFamily="system-ui">2025년 OO시 OO구 도로보수공사</text>

      <rect x="14" y="166" width="332" height="280" rx="10" fill="#fff" stroke="#e2e7ef" />
      <FieldRow y={190} label="발주기관" value="OO시 OO구청" />
      <FieldRow y={222} label="수요기관" value="OO구 도로관리과" />
      <FieldRow y={254} label="업종" value="토목공사업" />
      <FieldRow y={286} label="지역제한" value="OO시 관내" />
      <FieldRow y={318} label="입찰마감" value="2025-11-28 10:00" bold />
      <FieldRow y={350} label="개찰일시" value="2025-11-28 11:00" bold />
      <FieldRow y={382} label="현장설명" value="없음" />
      <FieldRow y={414} label="공동수급" value="가능" />

      <rect x="14" y="462" width="332" height="44" rx="22" fill={BQ_BLUE} />
      <text x="180" y="490" fill="#fff" fontSize="13" fontWeight="600" textAnchor="middle"
            fontFamily="system-ui">금액 정보 보기 →</text>
    </svg>
  );
}

// Cap 2 — pricing
function Cap2() {
  return (
    <svg viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg" className="mock-capture">
      <rect width="360" height="640" fill={BQ_BG} />
      <CaptureHeader subtitle="금액 정보" />
      <rect x="14" y="74" width="332" height="96" rx="10" fill={BQ_NAVY} />
      <text x="26" y="98" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">기초금액</text>
      <text x="26" y="134" fill="#fff" fontSize="26" fontWeight="800" fontFamily="system-ui">123,456,000</text>
      <text x="220" y="134" fill="rgba(255,255,255,0.8)" fontSize="15" fontFamily="system-ui">원</text>
      <text x="26" y="156" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="system-ui">VAT 포함</text>

      <rect x="14" y="184" width="332" height="280" rx="10" fill="#fff" stroke="#e2e7ef" />
      <FieldRow y={208} label="추정가격" value="112,233,000원" bold />
      <FieldRow y={240} label="예정가격 범위" value="-3% ~ +3%" />
      <FieldRow y={272} label="부가세 포함" value="포함" />
      <FieldRow y={304} label="순공사원가" value="98,765,000원" bold />
      <FieldRow y={336} label="A값" value="4,567,000원" bold valueColor="#d97706" />
      <FieldRow y={368} label="이윤" value="9,876,000원" />
      <FieldRow y={400} label="일반관리비" value="3,210,000원" />
      <FieldRow y={432} label="공급가액" value="112,233,000원" />
    </svg>
  );
}

// Cap 3 — lower-bound rate analysis
function Cap3() {
  return (
    <svg viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg" className="mock-capture">
      <rect width="360" height="640" fill={BQ_BG} />
      <CaptureHeader subtitle="낙찰하한율 분석" />

      <rect x="14" y="74" width="332" height="116" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="100" fill="#6b7a92" fontSize="11" fontFamily="system-ui">낙찰하한율</text>
      <text x="26" y="142" fill={BQ_NAVY} fontSize="40" fontWeight="800" fontFamily="system-ui">87.745</text>
      <text x="160" y="142" fill={BQ_BLUE} fontSize="20" fontFamily="system-ui">%</text>
      <rect x="200" y="106" width="130" height="48" rx="8" fill="#e8eef7" />
      <text x="216" y="124" fill={BQ_NAVY} fontSize="10" fontWeight="600" fontFamily="system-ui">투찰률 범위</text>
      <text x="216" y="144" fill={BQ_INK} fontSize="13" fontWeight="700" fontFamily="system-ui">87.5 ~ 88.0%</text>
      <text x="26" y="172" fill="#6b7a92" fontSize="10" fontFamily="system-ui">적격심사 기준 적용</text>

      <rect x="14" y="204" width="332" height="180" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="228" fill={BQ_NAVY} fontSize="12" fontWeight="700" fontFamily="system-ui">예가 분포</text>
      {/* simulated bar chart */}
      {[40, 55, 75, 95, 110, 95, 75, 55, 40].map((h, i) => (
        <rect key={i} x={36 + i * 34} y={350 - h} width="22" height={h}
              fill={i === 4 ? BQ_BLUE : '#cdd6e3'} rx="2" />
      ))}
      <line x1="14" x2="346" y1="355" y2="355" stroke="#cdd6e3" />
      <text x="180" y="372" textAnchor="middle" fill="#6b7a92" fontSize="9" fontFamily="system-ui">사정률 기준값 100.000%</text>

      <rect x="14" y="398" width="332" height="48" rx="8" fill="#fff7e6" stroke="#f5d490" />
      <text x="26" y="420" fill="#d97706" fontSize="11" fontWeight="700" fontFamily="system-ui">⚠ 예가 범위</text>
      <text x="26" y="436" fill="#92590f" fontSize="11" fontFamily="system-ui">-3% ~ +3% 구간</text>
    </svg>
  );
}

// Cap 4 — BidQ recommendation
function Cap4() {
  return (
    <svg viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg" className="mock-capture">
      <rect width="360" height="640" fill={BQ_BG} />
      <CaptureHeader subtitle="AI 추천 분석" />

      <rect x="14" y="74" width="332" height="128" rx="10" fill={BQ_NAVY} />
      <text x="26" y="98" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">BidQ 추천 사정률 구간</text>
      <text x="26" y="138" fill="#fff" fontSize="22" fontWeight="700" fontFamily="system-ui">99.850</text>
      <text x="116" y="138" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="system-ui">~</text>
      <text x="138" y="138" fill="#fff" fontSize="22" fontWeight="700" fontFamily="system-ui">100.150</text>
      <text x="258" y="138" fill="rgba(255,255,255,0.8)" fontSize="14" fontFamily="system-ui">%</text>
      <rect x="26" y="156" width="308" height="6" rx="3" fill="rgba(255,255,255,0.15)" />
      <rect x="120" y="156" width="120" height="6" rx="3" fill="#5b8de8" />
      <circle cx="180" cy="159" r="6" fill="#fff" />
      <text x="26" y="184" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="system-ui">권장 투찰률 87.745%</text>

      <rect x="14" y="216" width="332" height="220" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="240" fill={BQ_NAVY} fontSize="12" fontWeight="700" fontFamily="system-ui">AI 추천 분석</text>
      <FieldRow y={264} label="추천 시작값" value="99.850%" />
      <FieldRow y={296} label="추천 끝값" value="100.150%" />
      <FieldRow y={328} label="추천 투찰률" value="87.745%" bold valueColor={BQ_BLUE} />
      <FieldRow y={360} label="신뢰도" value="높음" valueColor="#2e9d54" bold />
      <FieldRow y={392} label="분석 시점" value="2025-11-26 14:20" />

      <rect x="14" y="450" width="332" height="40" rx="8" fill="#e8eef7" />
      <text x="26" y="475" fill={BQ_NAVY} fontSize="11" fontWeight="600" fontFamily="system-ui">💡 예가 상위구간 추천</text>
    </svg>
  );
}

// Cap 5 — 1st-rank rate / competition — INTENTIONALLY contains OCR-confusable text
function Cap5() {
  return (
    <svg viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg" className="mock-capture">
      <rect width="360" height="640" fill={BQ_BG} />
      <CaptureHeader subtitle="1순위 사정률 / 경쟁" />

      <rect x="14" y="74" width="332" height="120" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="100" fill="#6b7a92" fontSize="11" fontFamily="system-ui">1순위 사정률</text>
      {/* deliberately ambiguous glyphs — looks like 1OO.O32 to OCR */}
      <text x="26" y="146" fill={BQ_NAVY} fontSize="38" fontWeight="800" fontFamily="system-ui"
            style={{ letterSpacing: '0.5px' }}>100.032</text>
      <text x="190" y="146" fill={BQ_BLUE} fontSize="20" fontFamily="system-ui">%</text>
      <text x="26" y="176" fill="#6b7a92" fontSize="10" fontFamily="system-ui">예측 적중률 기반 산정값</text>

      <rect x="14" y="208" width="332" height="148" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="232" fill={BQ_NAVY} fontSize="12" fontWeight="700" fontFamily="system-ui">경쟁 분석</text>
      <FieldRow y={258} label="참여 예상" value="12개사" bold />
      <FieldRow y={290} label="평균 투찰률" value="87.6%" />
      <FieldRow y={322} label="개찰 예측" value="상위 추정구간" valueColor={BQ_BLUE} bold />

      <rect x="14" y="370" width="332" height="76" rx="10" fill={BQ_NAVY} />
      <text x="26" y="394" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">최종 추천값</text>
      <text x="26" y="426" fill="#fff" fontSize="22" fontWeight="800" fontFamily="system-ui">100.032</text>
      <text x="130" y="426" fill="rgba(255,255,255,0.85)" fontSize="14" fontFamily="system-ui">%</text>
      <text x="180" y="426" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">→ 1순위 사정률</text>

      <rect x="14" y="462" width="332" height="36" rx="8" fill="#fdecea" />
      <text x="26" y="484" fill="#d32f2f" fontSize="11" fontWeight="600" fontFamily="system-ui">⚠ 본 데이터는 참고용입니다.</text>
    </svg>
  );
}

const MOCK_CAPTURES = [Cap1, Cap2, Cap3, Cap4, Cap5];

function MockCapture({ index }) {
  const Cap = MOCK_CAPTURES[index] || Cap1;
  return <Cap />;
}

// CaptureImage — shows the real uploaded image if available,
// otherwise falls back to the mock SVG for that capture.
function CaptureImage({ index, imageUrl, alt }) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={alt || `캡처 ${index + 1}`}
           className="mock-capture"
           style={{ display: 'block', width: '100%',
                    objectFit: 'contain', maxHeight: 480, background: '#f5f7fb' }} />
    );
  }
  return <MockCapture index={index} />;
}

window.MockCapture = MockCapture;
window.CaptureImage = CaptureImage;

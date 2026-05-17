// mock-capture.jsx — Single combined BidQ screen mock (v2)
// Shows notice + pricing + rate info in one screenshot.

const BQ_NAVY = '#0e2854';
const BQ_BLUE = '#2962a8';
const BQ_BG   = '#f4f6fa';
const BQ_INK  = '#1a2942';

function _Row({ y, label, value, valueColor = BQ_INK, bold = false }) {
  return (
    <g>
      <text x="18" y={y} fill="#6b7a92" fontSize="11" fontFamily="system-ui">{label}</text>
      <text x="342" y={y} fill={valueColor} fontSize="13" fontWeight={bold ? '700' : '500'}
            fontFamily="system-ui" textAnchor="end">{value}</text>
      <line x1="14" x2="346" y1={y + 12} y2={y + 12} stroke="#e2e7ef" strokeWidth="1" />
    </g>
  );
}

function MockCapture() {
  return (
    <svg viewBox="0 0 360 1080" xmlns="http://www.w3.org/2000/svg" className="mock-capture"
         style={{ width: '100%', height: 'auto' }}>
      <rect width="360" height="1080" fill={BQ_BG} />

      {/* Header */}
      <rect x="0" y="0" width="360" height="56" fill={BQ_NAVY} />
      <circle cx="22" cy="28" r="8" fill="#fff" opacity="0.85" />
      <text x="40" y="33" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui">BidQ</text>
      <text x="80" y="33" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">공고 분석</text>

      {/* Notice info card */}
      <rect x="14" y="74" width="332" height="84" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="98" fill={BQ_NAVY} fontSize="11" fontWeight="600" fontFamily="system-ui">[공고번호]</text>
      <text x="26" y="118" fill={BQ_INK} fontSize="15" fontWeight="700" fontFamily="system-ui">20251115-00834-00</text>
      <text x="26" y="138" fill="#6b7a92" fontSize="11" fontFamily="system-ui">2025년 OO시 OO구 도로보수공사</text>

      <rect x="14" y="172" width="332" height="232" rx="10" fill="#fff" stroke="#e2e7ef" />
      <_Row y={196} label="발주기관"  value="OO시 OO구청" />
      <_Row y={228} label="수요기관"  value="OO구 도로관리과" />
      <_Row y={260} label="업종"      value="토목공사업" />
      <_Row y={292} label="지역제한"  value="OO시 관내" />
      <_Row y={324} label="입찰마감"  value="2025-11-28 10:00" bold />
      <_Row y={356} label="개찰일시"  value="2025-11-28 11:00" bold />
      <_Row y={388} label="공동수급"  value="가능" />

      {/* Amount card */}
      <rect x="14" y="420" width="332" height="96" rx="10" fill={BQ_NAVY} />
      <text x="26" y="444" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">기초금액</text>
      <text x="26" y="480" fill="#fff" fontSize="26" fontWeight="800" fontFamily="system-ui">123,456,000</text>
      <text x="220" y="480" fill="rgba(255,255,255,0.8)" fontSize="15" fontFamily="system-ui">원</text>
      <text x="26" y="502" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="system-ui">VAT 포함</text>

      <rect x="14" y="530" width="332" height="148" rx="10" fill="#fff" stroke="#e2e7ef" />
      <_Row y={554} label="추정가격"     value="112,233,000원" bold />
      <_Row y={586} label="예정가격 범위" value="-3% ~ +3%" />
      <_Row y={618} label="순공사원가"   value="98,765,000원" bold />
      <_Row y={650} label="A값"          value="4,567,000원" bold valueColor="#d97706" />

      {/* Rate card */}
      <rect x="14" y="694" width="332" height="120" rx="10" fill="#fff" stroke="#e2e7ef" />
      <text x="26" y="720" fill="#6b7a92" fontSize="11" fontFamily="system-ui">낙찰하한율</text>
      <text x="26" y="764" fill={BQ_NAVY} fontSize="38" fontWeight="800" fontFamily="system-ui">87.74S</text>
      <text x="190" y="764" fill={BQ_BLUE} fontSize="20" fontFamily="system-ui">%</text>
      <text x="26" y="794" fill="#6b7a92" fontSize="10" fontFamily="system-ui">적격심사 기준 적용</text>

      <rect x="14" y="830" width="332" height="40" rx="8" fill="#e8eef7" />
      <text x="26" y="855" fill={BQ_NAVY} fontSize="11" fontWeight="600" fontFamily="system-ui">투찰률 범위 87.5 ~ 88.0%</text>

      <rect x="14" y="884" width="332" height="40" rx="8" fill="#fff7e6" stroke="#f5d490" />
      <text x="26" y="909" fill="#d97706" fontSize="11" fontWeight="600" fontFamily="system-ui">⚠ 예가 범위 ±3%</text>

      <rect x="14" y="938" width="332" height="44" rx="22" fill={BQ_BLUE} />
      <text x="180" y="966" fill="#fff" fontSize="13" fontWeight="600" textAnchor="middle"
            fontFamily="system-ui">분석 시작 →</text>
    </svg>
  );
}

function CaptureImage({ imageUrl, alt }) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={alt || '캡처'}
           className="mock-capture"
           style={{ display: 'block', width: '100%',
                    objectFit: 'contain', maxHeight: 480, background: '#f5f7fb' }} />
    );
  }
  return <MockCapture />;
}

window.MockCapture = MockCapture;
window.CaptureImage = CaptureImage;

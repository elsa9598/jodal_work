// config.js — judal 런타임 설정
//
// PROXY_URL: Cloudflare Worker 프록시 주소.
//   - 비워두면("") 프록시 미사용 → 로컬 통계 추정으로 동작 (서버 0)
//   - 배포 후 wrangler가 출력하는 주소를 넣으면 조달청 실데이터 분석 활성화
//     예) "https://judal-proxy.your-account.workers.dev"
//
// 공개 repo이므로 여기엔 절대 API 키를 넣지 말 것 (키는 Worker secret 에만).
window.JUDAL_PROXY_URL = "";

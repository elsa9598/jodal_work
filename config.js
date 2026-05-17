/* config.js — 런타임 설정 (공개 파일: API 키 절대 금지)
 *
 * PROXY_URL: 배포한 Cloudflare Worker 프록시 주소.
 *   - 빈 문자열 ""  → 데모 데이터로 동작 (키·서버 불필요, 월 0원)
 *   - 배포 후 "https://judal-proxy.<계정>.workers.dev" 넣으면
 *     조달청 실데이터(서울 토목·포장 공고 + 낙찰 투찰률 실분포) 자동 전환
 *
 * 키(JODAL_API_KEY)는 여기 절대 넣지 말 것 — Worker secret 에만 존재.
 */
window.PROXY_URL = "https://judal-proxy.3dleader0128.workers.dev";

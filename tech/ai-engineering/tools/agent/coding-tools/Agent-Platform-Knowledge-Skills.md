---
tags: [ai, agent, agent-skill, coding-agent, web, frontend, baseline, evaluation]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Platform Knowledge Skills", "플랫폼 지식 스킬", "Modern Web Guidance", "Baseline 목표", "코딩 에이전트의 웹 플랫폼 지식"]
---

# 플랫폼 지식 스킬 — 학습 뒤에 바뀐 플랫폼 기능을 지침과 호환성 목표로 넣는다

코딩 에이전트는 학습 데이터에 많이 남은 옛 코드를 따라, 지금은 플랫폼이 직접 제공하는 기능을 라이브러리나 긴 스크립트로 다시 만드는 경향이 있다. 모델이 API 이름을 알아도 실제 구현 예가 적으면 잘못 쓴다. 플랫폼 지식 스킬은 전문가가 검토한 기능별 지침을 필요할 때만 문맥에 넣고, 프로젝트가 지원할 브라우저 범위에 맞춰 권고를 고르게 하는 방식이다. 이 문서는 Chrome 팀이 2026-11-10 1.0으로 낸 Modern Web Guidance를 공식 블로그, 공식 문서와 저장소 README로 2026-11-18에 대조해 정리했다. 설치하거나 평가를 재현하지는 않았다. 상위: [[Agent-Coding-Tools|코딩 에이전트 작업 도구]].

## 상시 규칙, 문서 색인과 무엇이 다른가

| 방식 | 넣는 내용 | 넣는 시점 |
|---|---|---|
| 상시 규칙(AGENTS.md, 과잉설계 방지 스킬) | 판단 순서, 금지 사항, 프로젝트 제약 | 매 턴 |
| 플랫폼 지식 스킬 | 기능별 구현 지침, 브라우저 호환성 데이터, 대체 경로 | 관련 작업에서 검색한 지침만 |
| 문서 색인(llms.txt, 공식 문서 조회) | 문서 위치와 원문 | 에이전트가 찾아 읽을 때 |

[[Agent-Overengineering-Guard|과잉설계 방지 사다리]]의 네이티브 플랫폼 기능 칸은 그런 기능이 있다는 것을 에이전트가 알아야 작동한다. 플랫폼 지식 스킬은 그 칸에 들어갈 지식을 공급하는 층이다(이 문서의 해석). 공급사가 자기 플랫폼의 최신 지식을 스킬로 배포하는 예는 웹 밖에도 있어, OpenAI의 GPT-6.2 마이그레이션 가이드는 코딩 에이전트로 API 애플리케이션을 옮길 때 OpenAI Docs 스킬을 쓰라고 안내한다(2026-11-18 확인).

## 동작 — 검색해서 필요한 지침만 꺼낸다

- **검색과 조회**: 스킬은 에이전트에게 CLI 호출법을 지시한다. `search <질문>`은 지침 ID, 설명, 범주, 쓰는 기능, 토큰 수와 유사도를 JSON으로 돌려주고, 에이전트는 설명을 보고 고른 지침을 `retrieve <id>`로 Markdown으로 받는다. 토큰 수가 함께 오므로 문맥 비용을 보고 고를 수 있다.
- **이미 아는 내용은 뺀다**: README는 평가로 모델이 이미 아는 일반 내용을 잘라 지침의 토큰을 줄였다고 적는다. 2026-11-18 README 기준 범위는 262개 웹 기능(CSS와 레이아웃 140개, HTML과 DOM 37개 등)이고, 1.0은 검증한 AI 지식 공백 수백 곳을 겨냥해 지침을 늘렸다.
- **현대화 흐름**: 1.0에서 생긴 `legacy-scan`은 기존 HTML, CSS, JavaScript와 `package.json`을 정적으로 분석해 안전하게 바꿀 곳을 찾는다. 첫 판은 제한된 패턴만 보는 정적 분석이고, 에이전트가 코드를 직접 따지는 감사는 이후 계획이다.
- **검토 절차**: 지침마다 전문가 검토와 해당 분야 책임자의 승인을 거치고, 사용자가 보는 화면에 관한 지침은 접근성 전문가가 실제 보조 기술로 시험한다. Chrome, Edge, Firefox와 MDN 팀이 함께 관리하며 저장소는 Apache-2.0이다.

## 호환성 목표를 저장소 지침에 적는다

- **기준은 Baseline이다**: 주요 브라우저 일부에서만 되는 기능은 Limited availability, 모두에서 쓸 수 있게 된 지 30개월이 안 되면 Newly available, 30개월이 지나면 Widely available로 나눈다.
- **목표를 적지 않으면 가장 보수적인 값이 기본이다**: 목표는 AGENTS.md나 CLAUDE.md에 `This project's Baseline target is Baseline 2024.`처럼 적는다. 적지 않으면 Widely available이 기본값이라 프로젝트가 허용하는 것보다 오래된 방식이 권고될 수 있다(이 문서의 해석).
- **대체 경로**: Widely available이 아닌 기능에는 대체 경로를 함께 안내하고 상당수는 점진적 향상이다. 폴리필이 필요하면 지원하지 않는 브라우저에서만 조건부로 불러오게 한다. 한 엔진에만 구현된 기능(volatile)과 origin trial 기능은 `set-allow-volatile-features`, `set-allow-origin-trials`로 따로 켠다.

## 지침의 효과는 보정된 검사와 대조군으로 잰다

- **검사부터 보정한다**: 지침마다 그 구현 세부를 지켰는지 보는 Playwright 검사(예: `prefers-reduced-motion` 처리)를 둔다. 검사는 기준 구현에서 100%, 일부러 틀린 구현에서 0%가 나오도록 맞추고, 맞을 때까지 검사 생성을 다시 시도한다. 틀린 구현을 거절하지 못하는 검사로는 통과율이 의미를 갖지 못한다는 [[Agentic-Verification|에이전트 기반 검증]]의 판정식 원칙과 같다.
- **대조군을 둔다**: 같은 과제를 지침 없는 대조군과 지침을 쓴 실험군으로 돌리는 end-to-end 평가를 현재 모델과 에이전트로 주 여러 번 실행하고 공개 대시보드에 올린다. 공식 문서는 초기 결과로 현대 권장 사항의 준수율이 평균 37%p 올랐다고 적고, 결과는 프로젝트, 모델과 프롬프트에 따라 다르다고 밝힌다. 공급사가 직접 잰 값이다.
- **고객 사례는 증언이다**: 1.0 블로그의 사례(한 회사의 180회 평가에서 현대 웹 점검 통과율 61%에서 94% 등)는 공급사 발표에 실린 파트너 보고다. 자기 저장소에서 같은 과제를 지침 유무로 비교해 채택을 정한다(적용 제안).

## 작성 뒤에는 실행으로 확인한다

Chrome은 이 스킬을 Chrome DevTools for agents와 함께 쓰라고 권한다. 코드를 쓰는 것은 흐름의 일부이고, 저사양 CPU를 흉내 낸 성능 추적으로 메인 스레드 작업이 50ms 아래인지, 애니메이션과 `prefers-reduced-motion`, 캐시된 화면의 메모리 누수를 실행 중에 확인하는 예를 든다. 메인 스레드 예산은 [[Browser-Main-Thread-Scheduling|메인 스레드 작업 스케줄링]]을 본다.

## 도입 체크포인트

- 저장소 지침에 호환성 목표를 적었는가. 적지 않았다면 기본값(Widely available)이 의도와 맞는가
- 에이전트가 지침을 실제로 검색하고 읽었는지 세션 기록으로 확인하는가. 설치만으로 매번 쓴다고 가정하지 않는다
- 정적 스캔이 제안한 변경을 실행 검사와 화면 확인으로 검증하는가
- 지침 묶음의 갱신 경로를 아는가. CLI로 설치하면 자동 갱신이 켜지지만 다른 설치 경로 상당수는 자동 갱신을 지원하지 않는다
- 외부 스킬이므로 설치 전 내용과 출처를 검토하는가([[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|외부 스킬 신뢰]])

## 출처

- [Modern Web Guidance 1.0: The web platform expertise your coding agent is missing — Chrome for Developers, Philip Walton](https://developer.chrome.com/blog/modern-web-guidance-v1) — 2026-11-10, 2026-11-18 1.0의 현대화 흐름, 검토 절차, 공동 관리, DevTools 연계와 고객 사례 대조
- [Chrome for Developers, Get started with Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started) — 2026-11-18 CLI 명령, Baseline 목표와 기본값, 대체 경로, 평가 방법과 37%p 결과, 갱신 지원 범위 대조
- [modern-web-guidance — GitHub, GoogleChrome](https://github.com/GoogleChrome/modern-web-guidance) — 2026-11-18 README의 목적, 기능 범위, 토큰 절감 방식, `legacy-scan` 명령, 공동 관리와 라이선스 대조
- [OpenAI API, Using GPT-6.2](https://developers.openai.com/api/docs/guides/latest-model) — 2026-11-18 OpenAI Docs 스킬을 쓰는 마이그레이션 안내 확인
- 사용자 제공 GeekNews 알림(2026-11-17): Modern Web Guidance 1.0. 학습 계기이며 게시물 번호는 확인하지 못했다

## 관련 문서

- [[Agent-Skills|에이전트 스킬]] — 스킬 구조와 점진적 공개, 외부 스킬 신뢰
- [[Agent-Overengineering-Guard|에이전트 과잉설계 방지]] — 네이티브 플랫폼 기능을 먼저 고르는 사다리
- [[Agent-Repository-Instructions|AGENTS.md]] — 호환성 목표를 적는 저장소 지침
- [[LLMs-Txt|llms.txt]] — 문서 위치 안내와의 차이
- [[Agentic-Verification|에이전트 기반 검증]] — 틀린 구현을 거절하는 판정식
- [[Browser-Main-Thread-Scheduling|메인 스레드 작업 스케줄링]] — 실행 확인의 성능 예산

---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Interview Checklist", "윤회 1차 면접 준비 체크리스트"]
---

# 윤회 1차 본 미팅 — 면접 준비 체크리스트와 prep 정렬 체크

> 상위: [[Interview-Prep-Yunhoe-1st-Lead-Questions|리드, 컬처핏, 역질문, 체크 TOC]]

## 면접 준비 체크리스트

### 보강할 기술 영역

> 회사 문서 자기완결 — 실제 답변 내용은 본 폴더 Tech.md, Tech-Extra.md 본문에 흡수됨.

| 영역 | 흡수 위치 | 복습 |
|---|---|---|
| 멀티테넌트 SaaS 패턴 (Prisma middleware, RLS, 전환 임계) | Tech Q5 본문 (정량 흡수 완료) | [x] |
| 생애주기 상태 머신, 이벤트 소싱 (스토어 스키마, read model, Saga) | Tech Q8 본문 (정량 흡수 완료) | [x] |
| 분산 ID (UUIDv7, ULID, ed25519 서명, QR 페이로드) | Tech Q6 본문 (정량 흡수 완료) | [x] |
| PostgreSQL 차이점 (EXPLAIN ANALYZE, RLS, BRIN/GIN) | Tech-Extra 6 RDBMS 심화 | [ ] |
| 복원성 패턴 (타임아웃, 재시도, Circuit Breaker opossum, DLQ) | Tech Q7 본문 | [ ] |
| DPP 도메인 키워드 (ESPR, EPR, CBAM, CEN/CENELEC) | 본 폴더 [[Interview-Prep-Yunhoe-Domain]] | [x] |
| 마스터 기술 카드 8개 정량 (DB Lock, EventBridge+SQS, 슬로우쿼리, 관측, Docker/ECS) | Tech Q1~Q3 + Tech-Extra 6, 8, 9 | [ ] |
| 범용 백엔드 안전망 (Node, NestJS, TS, HTTP, 인증, RDBMS, 캐시, 테스트, 관측) | Tech-Extra (자기완결) | [ ] |

### 답변 다듬을 항목 (5/15 회고)

- [ ] **시솔지주 이직 사유** — 본 파일 `Interview-Prep-Yunhoe-1st-FIT.md` "다듬은 버전" 1회 소리 내어 리허설
- [ ] **AI 파이프라인 도입 제안** — 6개월 마일스톤 (계층형 CLAUDE.md / Subagent / Stop Hook 자가 리뷰 / 실 DB 통합테스트) 한 문장씩 외우기
- [ ] **이직 잦음 꼬리** — "각 자리에서 부족한 한 축을 채워온 궤적" 한 줄로 정리

### 강하게 어필할 포인트

1. 보안 (FIDO, 보안학과) + DPP의 진위, 위변조 본질
2. VMI 도메인 (식품→제약, 부자재) + DPP 생애주기 추적의 동형성
3. EventBridge+SQS 이벤트 아키텍처 + DPP 상태 변화 fan-out
4. Claude 하네스, AI 파이프라인 → **입사 후 6개월 책임 영역으로 직접 제안**
5. 보너스: 슬로우 쿼리 99.3% 개선 (운영 자동화, 관측 사고방식의 증거)

### 주의사항

- **외부 귀책 톤 금지** — 시솔 이직 사유, 트라이포드랩 이직 사유 모두 자기 귀책 + 학습으로
- **재무 질문은 자연스럽게** — 도전적/검사하는 톤이 아니라 "장기적으로 함께 가려면 알아둬야 한다"는 결로
- **합격이 결정이 아님** — 본 미팅 통과 시 처우 협의에서 시장가, 사이닝, 옵션 비중 협상. [[Salary-Negotiation-Guide|연봉 협상 가이드]] 재독
- **대면 매너** — 14:00 도착 기준 13:50 현장. 명함 1장 준비. 백엔드 리드 페르소나 → 답변 톤은 단정하고 결정적, 자랑보다 책임 중심
- **노트 휴대 가능 여부 확인**: 역질문 핵심 3개(매출/런웨이/연봉)는 외워가고, 노트는 백업

### 면접 직후 작업

- [ ] 24시간 안에 본 미팅 회고 작성 (`Interview-Prep-Yunhoe-1st-Retro.md` — 5/15 회고와 같은 패턴)
- [ ] 트래커 갱신 — 결과/다음 단계/일정
- [ ] 추가 자료 요청 받았다면 48시간 안에 송부

## prep/ 가이드 정렬 체크 (Lead, 컬처핏 답변 다듬을 때)

> 회사별 fork시 prep 정렬 체크 누락 위험 → 본 섹션으로 구조화. Q1~Q5는 [[Interview-Prep-Yunhoe-1st-Lead-Questions-Persona|페르소나 문서]], 워라밸과 AI 도구는 [[Interview-Prep-Yunhoe-1st-Lead-Questions-CultureFit|컬처핏 문서]] 기준.

| prep/ 가이드 | 적용 위치 |
|---|---|
| [[Self-Analysis\|WHY 시드]] (욕구 3: 주도성, 성장, 가치) | Q1 3/6/12개월 계획 (주도성, CARE ID 6개월 책임 영역 = 자기 욕구 정렬), Q4 거버넌스 (성장) |
| [[Developer-Interview-13-Questions\|13Q 의도]] | Q1 #4, #11 의도 (왜 이 자리, 동기 지속가능성), Q5 #5 (성과 객관화) |
| [[Developer-Interview-Signals\|시그널]] | Q3 혼자/같이 — 약점 솔직 + "팀/개인 기여 분리" 신호 / AI 도구 — Q1 워크플로 + 개선 이력 신호 |
| [[Sensitive-Question-Answers\|민감 질문 치환]] | 워라밸 답변 (#7), 잦은 이직, 공백기 꼬리 (#1, #2) — 부정 단어 본인이 먼저 X, 4단계 구조 |
| [[FIT-Framework\|메타 가이드]] | 대표 직접 면접 톤, 역질문 마이크 넘기기, "장기적 함께"의 결 |

---
tags: [ai, agent, email, durable-objects, hitl, trust-boundary]
status: done
verified_at: 2026-10-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Email Interface", "이메일 에이전트 인터페이스", "Email for Agents", "Agentic Inbox"]
---

# 이메일을 에이전트 인터페이스로 — 엔티티 격리, HITL 게이트, 신뢰 경계

이메일 주소를 AI 에이전트의 입력과 응답 창구로 사용할 수 있다. 기존 메일 클라이언트를 이용하므로 사용자가 별도 앱이나 SDK를 설치하지 않아도 문의, 알림과 송장 처리 흐름에 연결할 수 있다. 이메일은 비동기 작업에 적합하지만 허용되는 응답 시간은 업무마다 다르다. 긴 작업에는 접수 알림과 예상 처리 시간을 별도로 안내하는 설계를 고려한다.

## 수신 구조 — 주소가 곧 라우팅 키

- Cloudflare Agents SDK의 수신 예제는 Worker에서 `routeAgentEmail`을 호출해 에이전트의 `onEmail`로 전달한다. 이후 파싱, 상태 저장, 비동기 작업과 `sendEmail` 응답을 연결한다.
- **주소 기반 인스턴스 라우팅**: 주소의 로컬 부분과 서브주소를 에이전트 인스턴스 선택에 사용한다. 이는 라우팅 방법이며 사용자별 접근 권한이나 테넌트 격리를 자동으로 보장하지 않는다.
- **회신 라우팅 보안**: Cloudflare Agents SDK에서 회신 라우팅 헤더에 HMAC-SHA256 서명을 적용하면 헤더 위조로 임의 인스턴스를 지정하는 공격을 막는 데 사용한다. Cloudflare Email Service는 도메인 추가 시 SPF, DKIM, DMARC를 자동 설정한다. 이 설정만으로 모든 메일의 받은편지함 도착을 보장하지는 않는다.

### Gmail 이벤트는 메일 본문이 아니라 동기화 신호다

이 절은 2026-10-09 Google 공식 문서 기준이다. Gmail `watch`는 Cloud Pub/Sub로 메일함 변경을 알린다. 알림 payload의 `emailAddress`와 `historyId`를 받아 마지막으로 처리한 위치 이후의 `history.list`를 조회하고, 필요한 메시지를 별도로 읽는다. Pub/Sub의 `messageId`는 Gmail 메시지 ID가 아니다. [푸시 알림 가이드](https://developers.google.com/workspace/gmail/api/guides/push)

- `watch`는 적어도 7일마다 갱신해야 하며 Google은 매일 갱신을 권장한다. 응답의 `expiration`도 확인한다.
- 사용자당 초당 1건을 넘는 알림은 누락된다. 이는 메일 삭제가 아니라 변경 알림의 누락이며, 한도 이내에서도 지연이나 누락이 가능하다. 일정 시간 알림이 없으면 `history.list`로 변경을 확인하는 복구 경로를 둔다.
- `startHistoryId`가 보존 범위를 벗어나 `404`가 나면 전체 동기화로 복구한다. 이력 보존 기간을 고정된 7일로 보장하지 않는다. [동기화 가이드](https://developers.google.com/workspace/gmail/api/guides/sync)

업무 설계에서는 알림 수와 새 메일 수를 동일시하지 않는다. 변경 내역을 확인한 뒤 대상 발신자와 업무 조건을 적용하고, 동일 메일로 같은 작업을 중복 생성하지 않도록 처리 기록을 둔다. 이는 API 특성에서 도출한 설계 제안이며 특정 에이전트 제품의 구현을 확인한 결과는 아니다. 자동 시작 조건이 충족돼도 외부 발송의 승인 경계는 별도로 유지한다.

### 예약 요약과 새 메일 이벤트를 구분한다

2026-10-09 확인한 Gemini Apps 공식 도움말은 메일, 일정과 할 일의 정기 요약을 예약 작업의 예로 제시한다. `Keep Activity`가 켜져 있어야 하며, Google Workspace처럼 다른 앱의 데이터를 쓰려면 해당 앱을 연결해야 한다. 개인 계정에는 순차 제공 중이므로 구독 이름만으로 계정의 기능 활성화를 판단하지 않는다.

예약 응답은 전달 시각 전에 준비된다. 따라서 오전 10시에 전달된 메일 요약이 오전 10시까지 도착한 모든 메일을 반영한다고 보장할 수 없다. 예약 요약은 정기 점검에 활용하고, 수신 직후 처리가 필요한 업무는 앞 절의 변경 알림과 동기화 흐름을 검토한다. 이는 공식 동작에서 도출한 설계 기준이다.

예약 등록, 실제 실행, Gmail 초안 저장과 외부 발송은 별도 결과로 확인한다. 예약 도움말의 정기 요약 지원만으로 초안 자동 저장이나 발송 지원까지 추정하지 않는다. 초안과 발송을 연결하는 업무에는 아래의 승인 경계를 별도로 적용한다.

## 아키텍처 — 엔티티별 액터 격리

2026-10-09 확인한 Agentic Inbox의 공개 README는 메일박스와 에이전트를 별도 Durable Object로 나누는 구조를 설명한다. 아래는 공개된 설계 설명이며 배포 환경의 격리 동작을 시험한 결과는 아니다.

- 메일박스마다 Durable Object 하나가 뜨고 각자 자체 SQLite를 가진다. 대형 공유 DB에 tenant_id 컬럼을 두는 대신, 격리 단위를 인프라 레벨로 내린 멀티테넌시
- 에이전트도 별도 Durable Object(채팅 이력 영속, WebSocket 스트리밍, 메일박스별 커스텀 시스템 프롬프트). 첨부는 오브젝트 스토리지(R2)로 분리
- 에이전트에게 주는 도구는 9개로 한정(읽기, 검색, 초안, 발신) — 도구 표면을 좁게 유지하는 [[Agent-Spec-Writing|경계 설계]]

## HITL — 읽기와 발신의 비대칭

Agentic Inbox의 공개 README는 수신 메일의 자동 초안 생성과 발송 전 명시적 확인을 기능으로 설명한다. 자동 초안 작성과 외부 발송을 분리하는 [[Harness-Engineering|HITL]] 설계 사례다. 메일 열람도 개인정보 처리나 읽음 상태 변경을 수반할 수 있으므로 허용된 범위를 정한다. 실제 배포에서 승인 우회가 불가능한지는 도구 실행 경로를 별도로 검증해야 한다.

### Gmail 초안 저장과 발송 승인을 분리한다

이 절의 API 동작은 2026-10-09 Google 공식 문서 기준이다. Gmail API는 MIME 메시지를 base64URL로 인코딩한 `message.raw`로 `drafts.create`를 호출해 초안을 저장한다. `drafts.send`는 별도 발송 작업이다. 초안을 수정하면 내부 메시지가 교체되므로 `draft.id`는 유지돼도 `message.id`는 바뀐다. 발송하면 초안이 삭제되고 `SENT` 메시지가 새 ID로 생성된다. [초안 API 가이드](https://developers.google.com/workspace/gmail/api/guides/drafts)

**`gmail.compose`는 초안 관리와 발송을 모두 허용한다.** 이 scope를 받았다고 초안만 쓸 수 있는 권한 경계가 생기는 것은 아니다. 승인 전 발송을 막으려면 애플리케이션의 도구 실행 경로에서 통제해야 한다. [Gmail OAuth scope](https://developers.google.com/workspace/gmail/api/auth/scopes)

광고 문의처럼 소개서와 답변 초안을 함께 준비하는 업무에는 다음 설계를 적용할 수 있다.

1. 문의 내용과 사전에 승인된 소개 자료를 구분해 초안을 만든다. 수신 메일 안의 지시를 발송 권한으로 취급하지 않는다.
2. 검토 화면에 To, Cc, Bcc, 제목, 본문과 첨부파일을 함께 보여준다.
3. 승인은 초안 ID만이 아니라 검토한 내용에 연결한다. 승인 뒤 수신자, 본문이나 첨부가 바뀌면 다시 검토한다.
4. 승인된 내용과 발송 직전 내용을 대조한 뒤 발송한다. `drafts.send`는 발송 요청에서 MIME 내용을 갱신할 수도 있으므로 저장된 초안뿐 아니라 실제 발송 요청의 내용도 대조한다. API 자체가 사람의 승인을 보장한다고 가정하지 않는다.

이는 API 특성에서 도출한 설계 제안이다. 초안 생성 성공, 발송 API 성공과 상대방의 실제 수신은 각각 구분해 기록한다.

## 신뢰 경계 — 단순하게 긋고 명시적으로 문서화

- 2026-10-09 확인한 공개 README는 Cloudflare Access를 **단일 신뢰 경계**로 명시하며 메일박스별 인가가 없다고 설명한다. 공유 Access 정책을 통과한 사용자와 MCP 연결 도구는 `mailboxId`로 모든 메일박스에 접근할 수 있다. 이는 공개된 접근 모델 설명이며 실제 배포의 인증 설정을 확인한 결과는 아니다.
- 이것을 숨기지 않고 by design으로 README에 명시한 점이 배울 지점이다: 신뢰 경계가 어디 하나뿐인지, 무엇이 그 경계 안에서 전부 허용되는지를 문서화해야 사용자가 배포 판단을 할 수 있다. 다중 사용자로 가려면 경계 안쪽에 인가 계층이 추가로 필요하다는 것도 자연히 드러난다

## 에이전트가 도구를 잡는 세 표면

같은 이메일 발신 기능도 에이전트에게 노출하는 방식마다 컨텍스트에 들어오는 정보가 다르다. 다음은 비용을 점검하는 기준이며 특정 표면의 고정 토큰 수나 우열을 보장하지 않는다.

| 표면 | 특징 | 컨텍스트 비용 |
|---|---|---|
| MCP 서버 | 표준 프로토콜로 도구 노출 | 로드한 도구 정의와 호출 결과를 확인 |
| CLI (`wrangler email send`) | `--help`로 명령 사용법 조회 | 도움말, 실행 명령과 출력도 컨텍스트를 사용 |
| 스킬 (설정, 모범 사례 문서) | 작업에 필요한 절차 지식 제공 | 기본 메타데이터와 실제 읽은 본문을 구분 |

출력량은 [[Tool-Output-Filtering]]처럼 실제 작업에서 측정하고 줄인다. 공급자가 MCP, CLI와 스킬을 함께 제공하는 것은 소비자가 실행 환경에 맞는 방식을 고르게 하는 [[Agent-Ready-API-Design|에이전트 친화 API 설계]]의 사례다.

## 체크포인트

- 이메일이 에이전트 인터페이스로 적합한 세 근거 (보편성, 기존 플로우 통합, 비동기 궁합)
- 주소와 서브주소가 멀티테넌트 라우팅 키가 되는 구조
- 엔티티별 Durable Object 격리와 공유 DB + tenant_id의 트레이드오프
- 허용된 열람과 초안 작성 범위, 최종 발송 내용에 연결된 승인과 변경 시 재검토
- 단일 신뢰 경계 설계를 문서에 명시하는 것의 가치와 멀티유저 확장 시 부족한 것
- MCP, CLI, 스킬 세 표면의 컨텍스트 비용 차이

## 출처

- [Google, Schedule actions in Gemini Apps](https://support.google.com/gemini/answer/16316416?hl=en)
- [Google, Configure push notifications with the Gmail API](https://developers.google.com/workspace/gmail/api/guides/push)
- [Google, Synchronize clients with Gmail](https://developers.google.com/workspace/gmail/api/guides/sync)
- [Google, Create and send draft emails](https://developers.google.com/workspace/gmail/api/guides/drafts)
- [Google, Choose Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Agentic Inbox — Cloudflare (GitHub)](https://github.com/cloudflare/agentic-inbox)
- [Email for Agents — Cloudflare Blog](https://blog.cloudflare.com/email-for-agents/)

## 관련 문서

- [[Harness-Engineering|하네스 엔지니어링 (HITL 배치)]]
- [[AI-Native-Org|AI 네이티브 조직 (상태머신 + HITL, 워커 격리)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Defense in Depth)]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계 (공급 측 표면 설계)]]
- [[MCP|MCP (도구 정의의 컨텍스트 비용)]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (신뢰 경계)]]

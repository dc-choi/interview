---
tags: [senior, ai, agent, email, durable-objects, hitl, trust-boundary]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Agent Email Interface", "이메일 에이전트 인터페이스", "Email for Agents", "Agentic Inbox"]
---

# 이메일을 에이전트 인터페이스로 — 엔티티 격리, HITL 게이트, 신뢰 경계

AI 에이전트에 채팅 UI만 붙이는 대신 **이메일 주소를 부여**하는 접근. 이메일은 세계에서 가장 보편적인 인터페이스라 사용자에게 앱이나 SDK 설치를 요구하지 않고, 가입, 알림, 송장 같은 업무 플로우가 이미 이메일에 의존하고 있어 에이전트가 기존 흐름에 끼어들 수 있다. 결정적으로 **이메일은 원래 비동기 매체**다 — 에이전트가 한 시간 걸려 여러 시스템을 확인하고 답장해도 사용자 기대를 깨지 않는다. 채팅의 즉답 압박과 달리 에이전트 작업 시간과 궁합이 맞는다.

## 수신 구조 — 주소가 곧 라우팅 키

- 도메인의 수신 메일을 Worker로 포워딩하면 에이전트의 onEmail 훅이 트리거된다: 파싱 → 상태 저장 → 비동기 작업(큐, 백그라운드) → sendEmail 응답
- **주소 기반 인스턴스 라우팅**: support@도메인은 support 에이전트로, sales@는 sales 인스턴스로. 서브주소(agent+user123@)로 사용자별 인스턴스까지 분기 — 주소 체계가 무료로 얻는 멀티테넌트 라우팅 계층
- **회신 라우팅 보안**: 에이전트 발신 메일에 HMAC-SHA256 서명을 실어, 답장 헤더를 위조해 임의 인스턴스로 라우팅시키는 공격을 차단. SPF, DKIM, DMARC는 도메인 추가 시 자동 설정 — 발신자 인증 실패가 스팸함행의 주범이라 인프라가 흡수해야 할 몫

## 아키텍처 — 엔티티별 액터 격리

레퍼런스 구현(Agentic Inbox)의 골격은 **엔티티 하나 = 상태 가진 액터 하나**다.

- 메일박스마다 Durable Object 하나가 뜨고 각자 자체 SQLite를 가진다. 대형 공유 DB에 tenant_id 컬럼을 두는 대신, 격리 단위를 인프라 레벨로 내린 멀티테넌시
- 에이전트도 별도 Durable Object(채팅 이력 영속, WebSocket 스트리밍, 메일박스별 커스텀 시스템 프롬프트). 첨부는 오브젝트 스토리지(R2)로 분리
- 에이전트에게 주는 도구는 9개로 한정(읽기, 검색, 초안, 발신) — 도구 표면을 좁게 유지하는 [[Agent-Spec-Writing|경계 설계]]

## HITL — 읽기와 발신의 비대칭

새 메일이 오면 에이전트가 자동으로 읽고 답장 초안까지 만들지만, **발신은 반드시 명시적 확인을 거친다**. 읽기(내부, 되돌릴 수 있음)와 발신(외부 부작용, 회수 불가)의 위험 비대칭을 워크플로우에 박은 것 — 자동화의 이득(초안 생성)은 취하되 비가역 액션만 사람 게이트를 남기는 [[Harness-Engineering|HITL]] 배치의 전형이다.

## 신뢰 경계 — 단순하게 긋고 명시적으로 문서화

- 레퍼런스 구현은 앞단 인증(Cloudflare Access)이 **단일 신뢰 경계**이고 메일박스별 인가는 없다 — 경계를 통과한 사용자나 MCP로 붙은 외부 도구는 mailboxId만 바꾸면 모든 메일박스를 조작할 수 있다
- 이것을 숨기지 않고 by design으로 README에 명시한 점이 배울 지점이다: 신뢰 경계가 어디 하나뿐인지, 무엇이 그 경계 안에서 전부 허용되는지를 문서화해야 사용자가 배포 판단을 할 수 있다. 다중 사용자로 가려면 경계 안쪽에 인가 계층이 추가로 필요하다는 것도 자연히 드러난다

## 에이전트가 도구를 잡는 세 표면

같은 이메일 발신 기능도 에이전트에게 노출하는 방식마다 컨텍스트 비용이 다르다.

| 표면 | 특징 | 컨텍스트 비용 |
|---|---|---|
| MCP 서버 | 자연어로 호출, 표준 프로토콜 | 도구 정의가 수만 토큰까지 커질 수 있음 |
| CLI (wrangler email send) | --help로 기능을 동적 발견 | 거의 0 (필요할 때만 조회) |
| 스킬 (설정, 모범 사례 문서) | 절차 지식을 온디맨드 주입 | 호출 시에만 |

무거운 MCP 대신 CLI를 쓰는 절감 패턴([[Tool-Output-Filtering]], Claude Code 운영 가이드의 공통 처방)과 같은 축이고, 공급자가 세 표면을 모두 제공해 소비자가 고르게 하는 것은 [[Agent-Ready-API-Design|에이전트 친화 API 설계]]의 실례다.

## 체크포인트

- 이메일이 에이전트 인터페이스로 적합한 세 근거 (보편성, 기존 플로우 통합, 비동기 궁합)
- 주소와 서브주소가 멀티테넌트 라우팅 키가 되는 구조
- 엔티티별 Durable Object 격리와 공유 DB + tenant_id의 트레이드오프
- 자동 초안은 허용하고 발신만 확인받는 이유 (가역과 비가역의 비대칭)
- 단일 신뢰 경계 설계를 문서에 명시하는 것의 가치와 멀티유저 확장 시 부족한 것
- MCP, CLI, 스킬 세 표면의 컨텍스트 비용 차이

## 출처

- [Agentic Inbox — Cloudflare (GitHub)](https://github.com/cloudflare/agentic-inbox)
- [Email for Agents — Cloudflare Blog](https://blog.cloudflare.com/email-for-agents/)

## 관련 문서

- [[Harness-Engineering|하네스 엔지니어링 (HITL 배치)]]
- [[AI-Native-Org|AI 네이티브 조직 (상태머신 + HITL, 워커 격리)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Defense in Depth)]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계 (공급 측 표면 설계)]]
- [[MCP|MCP (도구 정의의 컨텍스트 비용)]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (신뢰 경계)]]

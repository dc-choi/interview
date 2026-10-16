---
tags: [ai, agent, architecture, guardrails]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Guardrails", "에이전트 4겹 안전망과 루프 가드레일"]
---

# 프로덕션 에이전트 아키텍처: 다층 안전망과 루프 가드레일

LLM의 비결정성을 단계별로 차단하는 4겹 안전망과, 운영 도구에 넣은 에이전트의 프롬프트 계층과 루프를 코드로 통제하는 장치를 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## Defense in Depth (4겹 안전망)

LLM의 비결정성은 단일 가드로 막을 수 없다. 단계별 차단을 쌓는다.

| 레이어 | 위치 | 차단 대상 |
|---|---|---|
| **Role** | 워커 선언 단계 | 권한 외 도구 호출 (분석 워커가 Confluence 쓰기 불가) |
| **Gate** | 요청 처리 진입 | 컨텍스트 부족 → 재확인으로 분기 |
| **Rule** | 워커 내부 정책(자연어) | 읽기 전용 쿼리, 스캔 한도, 취소분 처리 규칙 |
| **Hook** | 실행 직전(코드) | 쓰기 명령, 스캔 비용 초과, PII 컬럼, 파티션 누락 차단 |

**Hook는 마지막 방어선**이다. 자연어 Rule이 무시되더라도 코드 레벨에서 SQL을 가로채 거절한다. 자연어 정책에만 의존하면 LLM이 "잠깐, 이번엔 예외야"로 빠져나갈 수 있다.

## 프롬프트 계층화와 루프 가드레일

운영 도구에 에이전트를 넣을 때는 자연어 질의 자체보다 **에이전트의 행동을 운영 환경에 맞게 통제할 수 있는 제어권**이 중요하다.

- **시스템 프롬프트 3계층 분리** — (1) 전역 행동 정책: 도구 호출 순서, 위험 작업 안전 규칙, 결과가 비거나 잘렸을 때의 폴백 전략. 관리자만 수정한다. (2) 환경 메타데이터: 어떤 데이터소스를 우선 쓰고 어떤 라벨 후보를 시도할지 — 숙련자의 머릿속에만 있던 운영 지식을 LLM이 쓸 수 있는 형태로 명문화한 계층. 이 계층이 없으면 에이전트가 매번 라벨 탐색부터 시작해 호출 라운드를 낭비하고, 올바른 데이터소스를 골라도 결과가 0건으로 돌아온다. (3) 사용자 개인화: 담당 서비스, 응답 선호. 개인화는 공통 정책 위에 덧붙을 뿐 덮어쓰지 못하게 해 계층별 책임 주체를 분리한다.
- **프롬프트 합성은 백엔드 단일 책임** — 프런트엔드가 시스템 프롬프트를 조립하면 사용자가 정책을 우회할 여지가 생긴다.
- **에이전트 루프의 코드 레벨 가드레일** — 도구 호출 라운드 상한, 같은 도구를 같은 인자로 반복 호출하는 것의 차단(호출 해시), 도구별 재시도 제한, 개별 도구 결과 크기 제한(잘렸다는 사실을 명시), 누적 히스토리 절단(툴 호출과 결과의 짝이 깨지지 않게 호출 식별자는 유지), 결과가 비었을 때 라벨과 시간 범위와 데이터소스를 바꿔 재시도하도록 유도하는 노 데이터 힌트. 모두 LLM이 잘 판단해 주겠지에 기대지 않기 위한 장치로, 위 Defense in Depth의 Hook과 같은 축이다.
- **사용량 제한은 사후 반영(post-accounting)** — 요청 전에는 현재 사용량이 한도를 넘었는지 검사하고, 응답 후 모델이 반환한 실제 토큰 사용량을 사용자별 버킷에 누적한다(초과 시 429). 추정치가 아니라 실측 기반으로 비용을 관리한다. 부가 저장소(대화 기록, 개인화) 장애가 전체 장애가 되지 않게 해당 기능만 제한하고 단일 요청 처리는 유지한다.

## 출처
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)
- [Grafana에서 자연어로 장애 원인을 분석하기: LLM 에이전트 기반 SRELens 개발기 — LY Corporation 기술블로그](https://techblog.lycorp.co.jp/ko/analyzing-incident-root-causes-in-grafana-using-natural-language-with-llm-agent)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain/Inform/Verify/Correct/HITL)]]
- [[Harness-Anatomy|하네스 구성도 (루프 가드레일이 앉는 블록 지도)]]
- [[Agent-Swarm-Containment|에이전트 군집 격리 (AI로 AI를 감독하는 구조와 한계)]]

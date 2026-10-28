---
tags: [ai, harness, agent, architecture, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Harness Production", "프로덕션 에이전트 운영과 격리"]
---

# 프로덕션 에이전트 운영과 격리

에이전트에게 일을 위임해 프로덕션에서 돌릴 때의 아키텍처, 관리형 런타임의 책임 경계와 여러 에이전트의 격리. 상위: [[Harness-Systems|하네스 시스템]].

## 목차

- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]: 분업, Lazy Load, Defense in Depth, 프롬프트 3계층과 루프 가드레일, Metric Registry, Eval, 고가용성, Closure-loop 위임 경계
  - [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]: 컴포넌트 분업, 환경을 넘는 위임, 핵심 엔진, Lazy Load
  - [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]: Defense in Depth, 프롬프트 3계층, 루프 가드레일, 사용량 제한
  - [[Production-Agent-Architecture-Knowledge|지식 체계]]: Metric Registry, 조회 우선순위, Auto Memory 비활성화
  - [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]: 검증 4축, 운영 루프, 처리 시간 계측, 워커 풀
  - [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]: 승인과 실행 권한, 감사 기록, 자율권의 확대와 축소, 위임 결정의 사고 도구(성공 작업당 원가, 오류 누적, 자율성 다이얼과 문 유형)
  - [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]: Meta Muse, 마이리얼트립 데이터 에이전트, LY SRELens, Salesforce 에이전트 스택(Agentforce, Data 360, Headless 360)
- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]]: 세션 격리와 사용자 매핑, 상태 영속화, 도구 인증과 인가, 관측과 업무 성공의 구분
- [[Agent-Swarm-Containment|에이전트 군집 격리]]: 공유 자원과 비인가 통신, 평가 환경의 권한 경계, 기록 무결성과 사고 조사 한계

## 함께 볼 문서

- [[Harness-Systems|하네스 시스템]]

---
tags: [ai, harness, architecture, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Harness Systems", "하네스 시스템"]
---

# 하네스 시스템

에이전트를 감싸는 제어 계층 — 이 vault의 하네스 5대 점검 축, 런타임 구성도와 게이트 배치, 도입 계단, 레포와 조직 단위의 결정론적 강제, 프로덕션 에이전트 아키텍처. 상위: [[tools|AI 엔지니어링 실천 도구]].

- [[Harness-Engineering|하네스 엔지니어링]]: 이 vault의 Constrain→Inform→Verify→Correct→HITL 점검 축, 프롬프트→컨텍스트→하네스→루프 실무 프레임, 조건부 멀티 에이전트 오케스트레이션과 적용 점검
- [[Harness-Anatomy|하네스 구성도]]: 에이전트 = 모델 + 하네스, 다섯 손잡이(Tools, Knowledge, Observation, Action, Permissions), 런타임 블록 지도와 횡단 계층, 하네스 경계 밖 세 상자, 네 입구 하나의 코어, 세 기둥
- [[Harness-Gate-Placement|게이트 배치]]: 게이트는 비용이라는 전제, 요청 층과 강제 층의 판별 질문, 걸 곳 셋과 걸지 않을 곳 둘, 위험 명령 A/B 실증, 여섯 방어 시점과 각 층이 놓치는 것
- [[Harness-Adoption-Ladder|하네스 도입 계단]]: Lv.0에서 Lv.5까지의 성숙도와 얹는 순서, 다섯 단계 파이프라인과 네 게이트, 대조 가능한 계획 파일, 한 사람의 도입 6단계 사례
- [[AI-Native-System|AI 네이티브 시스템]]: 부탁 vs 강제, 결정론적 제어 4계층, AST 아키텍처 테스트로 위반 0, 실수→시스템 흡수 루프, 시스템+사람+문화
- [[AI-Native-Org|AI 네이티브 조직]]: 팀챗 위 전사 AI 실행 플랫폼, 상태머신+HITL, K8s Job 워커 격리, MCP 프록시, 4계층 메모리, 복구 우선, 조직 6요소
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]: 분업, Lazy Load, Defense in Depth, 프롬프트 3계층과 루프 가드레일, Metric Registry, Eval, 고가용성, Closure-loop 위임 경계
- [[Agent-Swarm-Containment|에이전트 군집 격리]]: 공유 자원과 비인가 통신, 평가 환경의 권한 경계, 기록 무결성과 사고 조사 한계

## 함께 볼 문서

- [[tools|AI 엔지니어링 실천 도구]]

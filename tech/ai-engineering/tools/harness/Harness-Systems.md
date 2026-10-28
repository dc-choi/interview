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
- [[Harness-Gate-Placement|게이트 배치]]: 게이트는 비용이라는 전제, 요청 층과 강제 층의 판별 질문, 걸 곳 셋과 걸지 않을 곳 둘, 위험 명령 A/B 실증, 여섯 방어 시점과 각 층이 놓치는 것, 푸시 전 이해 확인 훅과 강제 통제의 차이
- [[Harness-Adoption-Ladder|하네스 도입 계단]]: Lv.0에서 Lv.5까지의 성숙도와 얹는 순서, 다섯 단계 파이프라인과 네 게이트, 대조 가능한 계획 파일, 한 사람의 도입 6단계 사례
- [[Harness-Component-Evaluation|코딩 에이전트 하네스 구성요소 평가]]: 계획, 행동 인터페이스, 컨텍스트 관리의 조건부 실험과 평가 기준, 학습 분포 밖 언어(KillSwitch)로 기억 의존을 줄이려는 평가 시도와 교란 요인
- [[Harness-AI-Native|AI 네이티브 시스템과 조직 (ai-native/ 서브폴더)]]: 레포 단위의 결정론적 강제(부탁 vs 강제, 제어 4계층, AST 아키텍처 테스트)와 조직 공용 실행 계층(팀챗 위 전사 AI 실행 플랫폼, 상태머신+HITL, 4계층 메모리, 조직 6요소)
- [[Harness-Production|프로덕션 에이전트 운영과 격리 (production/ 서브폴더)]]: 프로덕션 에이전트 아키텍처(분업, Defense in Depth, Metric Registry, Closure-loop 위임 경계), Bedrock AgentCore 운영 경계, 에이전트 군집 격리

## 함께 볼 문서

- [[tools|AI 엔지니어링 실천 도구]]

---
tags: [ai, harness, architecture, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Harness Systems", "하네스 시스템"]
---

# 하네스 시스템

에이전트를 감싸는 제어 계층 — 이 vault의 하네스 5대 점검 축, 런타임 구성도와 게이트 배치, 도입 계단, 레포와 조직 단위의 결정론적 강제, 프로덕션 에이전트 아키텍처. 상위: [[tools|AI 엔지니어링 실천 도구]].

- [[Harness-Engineering|하네스 엔지니어링]]: 이 vault의 Constrain→Inform→Verify→Correct→HITL 점검 축, 프롬프트→컨텍스트→하네스→루프 실무 프레임, 조건부 멀티 에이전트 오케스트레이션과 적용 점검
- [[Harness-Anatomy|하네스 구성도]]: 에이전트 = 모델 + 하네스, 다섯 손잡이(Tools, Knowledge, Observation, Action, Permissions), 런타임 블록 지도와 횡단 계층, 하네스 경계 밖 세 상자, 네 입구 하나의 코어, 가장 작은 하네스 사례(ClawDOS의 TLS 중계와 상태 저장 뒤 메모리 비우기), 세 기둥
- [[Harness-Gate-Placement|게이트 배치]]: 게이트는 비용이라는 전제, 요청 층과 강제 층의 판별 질문, 걸 곳 셋과 걸지 않을 곳 둘, 위험 명령 A/B 실증, 여섯 방어 시점과 각 층이 놓치는 것, 푸시 전 이해 확인 훅과 강제 통제의 차이
- [[Harness-Adoption-Ladder|하네스 도입 계단]]: Lv.0에서 Lv.5까지의 성숙도와 얹는 순서, 다섯 단계 파이프라인과 네 게이트, 대조 가능한 계획 파일, 한 사람의 도입 6단계 사례
- [[BMad-Method|BMad Method]]: 역할별 에이전트와 파일 산출물로 나눈 기성 워크플로우, v6에서 v7로의 전환, story 단위 plan과 리뷰 기록, 무인 실행으로 확장할 때의 실천
- [[AI-DLC|AI-DLC]]: AWS의 AI 주도 개발 수명주기, 계획과 질문 뒤 사람 검증의 반복, Inception, Construction, Operations와 Mob 의식, bolt와 Unit of Work, 도구 중립 aidlc-workflows, 조율 비용과 자율 범위에 대한 운영 관점
- [[Pstack|pstack]]: 작업별 playbook과 원칙 skill 묶음, 프로젝트 전용 검증 skill의 생성과 유지(기능 지도의 네 절, drift, 도구 공백, 제품 버그 분류), 검증 수단이 병렬화를 여는 순서, 반복 실수를 아키텍처부터 문서 순으로 강제 층에 내리는 correct와 제약 주석을 옮기는 no-comments, skill 변경의 눈가림 평가, 시작 전 의도 재진술
- [[Tstack|tstack]]: 코드 작성 뒤의 증명, 리뷰, PR 작성, CI와 리뷰 봇 감시, 병합을 맡기는 skill 9개, 병합 결정만 사람에게 남기는 full-stop과 full-send의 차이, 세션 안 관찰 증거와 병합 관문, 단일 감시자 pr-wait, 세 제공사 모델의 council 리뷰
- [[Spec-Decision-Records|에이전트 작업의 스펙과 결정 기록]]: 의도, 맥락, 시행착오 손실, plan과 decisions 두 문서, 결정의 출처와 영향도 태그와 누적 번호, 항상 적용할 rule과 온디맨드 스킬의 배치, 날짜 태그 릴리스, 자동 현황 문서, 규칙을 덜 때의 A/B 확인
- [[Spec-Driven-Development|코딩 에이전트와 스펙 주도 개발]]: 프로젝트 헌법(미션, 기술 스택, 로드맵)과 기존 코드에서의 역추출, 브랜치 단위 기능 루프(plan, requirements, validation), 재계획과 헌법 변경의 별도 브랜치, 검토 피로를 줄이는 시작 점검, Spec Kit과 OpenSpec의 흐름, 에이전트를 바꿔도 남는 워크플로우
- [[Harness-Component-Evaluation|코딩 에이전트 하네스 구성요소 평가]]: 계획, 행동 인터페이스, 컨텍스트 관리의 조건부 실험과 평가 기준, 학습 분포 밖 언어(KillSwitch)로 기억 의존을 줄이려는 평가 시도와 교란 요인, 팀 하네스의 정기 평가와 enterprise harness, 하네스 교체 때 고정 지시와 확장 경로 비교, 모델별로 달라지는 하네스 순위와 통과당 비용(FrontierHarness Eval v1.1)
- [[Harness-AI-Native|AI 네이티브 시스템과 조직 (ai-native/ 서브폴더)]]: 레포 단위의 결정론적 강제(부탁 vs 강제, 제어 4계층, AST 아키텍처 테스트)와 조직 공용 실행 계층(팀챗 위 전사 AI 실행 플랫폼, 상태머신+HITL, 4계층 메모리, 조직 6요소)
- [[Harness-Production|프로덕션 에이전트 운영과 격리 (production/ 서브폴더)]]: 프로덕션 에이전트 아키텍처(분업, Defense in Depth, Metric Registry, Closure-loop 위임 경계), Bedrock AgentCore 운영 경계, 에이전트 군집 격리

## 함께 볼 문서

- [[tools|AI 엔지니어링 실천 도구]]

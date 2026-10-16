---
tags: [ai, llm, hallucination, operations]
status: done
verified_at: 2026-10-10
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Workflow Patterns Data and Operations", "데이터 vs 모델", "환각 통제와 운영"]
---

# LLM 워크플로우 패턴: 데이터와 모델, 환각 통제와 운영

도메인 서비스에서 데이터와 모델 중 무엇을 먼저 개선할지, 환각을 통제하는 두 갈래, 빠른 피드백 루프와 시작 전략, 배포 완료와 업무 개선의 구분을 다룬다. 상위: [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]].

## 데이터와 모델 중 무엇이 더 중요한가

- **도메인 특화 서비스 → 데이터가 더 중요**: 사내 용어, 테이블 의미, 업무 규칙은 범용 LLM이 알 수 없다
- **일반 지식, 범용 작업 → 모델 성능 영향이 큼**

실무 개발자가 당장 개선하기 쉬운 쪽은 보통 **데이터**다. 모델 자체 고도화는 어렵지만, 좋은 문서, 정확한 메타데이터, 정제된 로그, 명확한 평가셋은 직접 만들 수 있다.

## 환각 통제와 운영

환각은 확률적 생성 모델의 속성이라 제거가 아니라 **통제**의 문제다. 두 갈래다.

- **근거 기반 답변**: RAG와 Function Calling으로 자기 기억이 아니라 외부 문서, API 결과를 근거로 답하게 함 (모른다고 말하는 능력과 시스템 보완은 [[LLM-Abstention|LLM Abstention]])
- **기획 단계의 영역 선택**: 환각에 덜 민감한 작업(초안, 요약)은 사람이 수정 가능하지만, 법률 판단, 인사 평가, 금융 거래처럼 오류 비용이 큰 영역은 더 강한 검증 장치가 필요하다

운영은 한 번 만들고 끝이 아니라 **빠른 피드백 루프**다. 모델, 프롬프트, 검색 데이터, 사용자 요구가 계속 바뀌므로 빠르게 배포하고 피드백을 받아 개선한다(피드백을 지식, 테스트로 환원하는 운영 루프는 [[Production-Agent-Architecture-Eval-and-Operations#Eval 시스템과 운영 루프|Production-Agent-Architecture]], 평가 철학은 [[LLM-Eval-Strategy]]).

**시작 전략**: 거창한 에이전트부터 만들기보다 반복적이고 검증 가능한 업무(문서 요약, FAQ 자동 응답, SQL 초안 생성, 업무 기록 정리)부터. 사람이 최종 확인할 수 있는 작업이 좋은 출발점이다. LLM은 사람을 대체하는 도구라기보다 **사람이 더 빠르게 판단하고 더 나은 결과를 만들게 돕는 업무 증폭기**다.

내부 지식 봇은 배포 완료와 업무 개선을 나누어 평가한다. AWS의 생성형 AI 운영 가이드는 기술 지표와 업무 결과의 연결, 지속적인 모니터링을 요구한다(2026-10-10 확인). 이를 적용하는 예로 제한된 사용자 집단에서 실제 질문과 검토한 답을 모으고, 정답률뿐 아니라 재문의와 사람에게 넘기는 비율, 해결까지의 시간을 확인한 뒤 이용 범위를 넓힐 수 있다. 개발 기간 단축이나 이용 계정 수만으로 현장 직원의 생산성이 검증됐다고 보지 않는다.

## 면접 체크포인트

- 데이터 vs 모델 — 도메인 특화면 데이터, 실무자가 당장 손댈 수 있는 쪽도 데이터
- 환각은 제거가 아니라 통제(근거 기반 + 기획 단계 영역 선택)
- 시작은 검증 가능한 반복 업무부터, 사람이 최종 확인

## 사례
- 성과 평가 보조: Jira 이슈/에픽 → OKR 연결 → 회사 평가 기준 반영으로 성과 노트 초안 작성. 동료 평가는 AI가 질문을 던져 구체화하고 AAT(행동-감사-기대), SBI(상황-행동-영향) 피드백 구조를 적용. 데이터 전처리(누락값, 형식 오류)와 평가 윤리(편향, 개인정보, 최종 판단은 사람)가 난제.

## 출처
- [AWS Prescriptive Guidance, Delivering and sustaining the value of a generative AI application](https://docs.aws.amazon.com/prescriptive-guidance/latest/gen-ai-lifecycle-operational-excellence/prod-value.html)
- [LLM 에이전트 실무 사례 (물어보세, 스마트 마이 노트, HyperCLOVA X Skill Universe) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)

## 관련 문서
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (묶음 인덱스)]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]]
- [[LLM-Workflow-Patterns-Text-to-SQL|Text-to-SQL과 데이터 디스커버리]]
- [[LLM-Abstention|LLM Abstention]] — 환각 통제, 모른다고 말하기
- [[LLM-Eval-Strategy|LLM 평가 전략]] — 좋은 답변 정의, G-Eval/RAGAS, LLM-as-judge
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — 에이전트 위임의 신뢰 설계, 운영 루프
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 리트리벌, 구조화 조회, 근거 추적
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]] — 넓게 보는 눈, 문제 정의와 조율

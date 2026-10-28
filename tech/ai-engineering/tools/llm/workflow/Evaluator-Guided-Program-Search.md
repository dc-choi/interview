---
tags: [ai, llm, search, evaluation, program-synthesis, workflow]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Evaluator-Guided Program Search", "평가기 주도 프로그램 탐색", "LLM Evolutionary Search", "AlphaEvolve", "OpenEvolve"]
---

# 평가기 주도 프로그램 탐색

LLM이 후보 프로그램을 제안하고, 모델 밖의 평가기가 정확성을 검사하고 비용을 점수로 매기며, 그 점수와 피드백을 다음 제안의 입력으로 돌려 개선을 반복하는 구성이다. 정답을 자동으로 판정할 수 있고 개선 정도를 숫자로 잴 수 있는 문제에 맞는다. 이 문서는 2026-10-27에 Google DeepMind의 AlphaEvolve 발표와 기술 보고서, Anthropic의 양자 회로 설계 연구 발표와 논문을 대조한 기준이다.

## 구성 요소

| 구성 | 역할 | 설계 질문 |
|---|---|---|
| 명세 | 풀 문제와 허용 연산 | 자연어 명세를 평가기가 검사할 수 있는 계약으로 옮겼는가 |
| 제안기(LLM) | 새 후보와 프로그램 수정안 | 부모 후보, 평가 피드백, 다른 후보 표본과 메모 가운데 무엇을 넣는가 |
| 평가기 | 정확성 검사와 비용 점수 | 모델이 아닌 프로그램인가, 어디까지 표본으로만 검사하는가 |
| 보관소 | 후보와 점수 저장, 다음 부모 선택 | 탐색과 활용의 균형을 어떻게 잡는가 |

- AlphaEvolve(2025-05 발표)는 Gemini 모델의 제안을 답을 검증하는 자동 평가기와 짝지운다. 제안한 프로그램을 검증, 실행, 채점하고, 진화적 틀로 유망한 후보를 다음 프롬프트에 쓴다. 발표는 적용 대상을 해법을 알고리즘으로 기술하고 자동 검증할 수 있는 문제로 적는다.
- 평가기를 모델 밖 프로그램으로 두면 제안한 모델이 스스로 성공을 선언하지 못한다. 탐색기와 검사기를 나누는 원칙은 [[Energy-Based-Reasoning#낮은 에너지와 정답 증명은 다르다|에너지 기반 추론의 제약 검사]]와 같다.

## 점수는 목적이 아니라 대리 지표다

- 양자 회로 연구의 평가기는 Toffoli 게이트 수 T와 최대 큐비트 수 Q의 곱(T×Q)을 비용으로 썼다. 실행 시간의 대리 지표이며, 논문은 다른 계산 가능한 목적함수로도 탐색할 수 있다고 적는다. 목적함수를 바꾸면 최선의 회로도 바뀐다.
- 논문은 목적함수, 회로 인터페이스와 입력 분포처럼 과제를 정의하는 선택이 프레임워크의 한계라고 밝힌다. 사람이 정한 과제 정의 밖의 품질은 이 점수가 보장하지 않는다.
- 평가기는 지름길을 막아야 한다. 이 연구의 평가기는 출력, 바뀌면 안 되는 입력, 보조 큐비트(ancilla)의 복귀와 위상까지 검사하며, 더러워진 보조 큐비트를 리셋하거나 버리는 방식을 되돌리기(uncompute)의 대체로 인정하지 않는다.

## 정확성 검사의 범위를 기록한다

- **기저 상태 추적**: 허용 연산이 계산 기저 상태를 기저 상태로 보내므로, 시뮬레이터는 2^n개의 진폭 대신 비트열과 위상을 추적한다.
- **표본 검사와 실패율 경계**: 입력 공간이 크면 모든 경로를 검사하지 않고 표본을 뽑는다. 표본 검사는 드문 실패를 놓칠 수 있어 통계적 경계를 붙인다. DQI 디코더는 10만 회 시험에서 탐지된 부호 오류가 100회 이하인 구현만 받아들이고, 한 번의 시험이 실패를 적어도 2분의 1 확률로 탐지한다는 조건 아래 97.5% 신뢰수준에서 입력 분포 전체의 실패 확률 상한 2.434×10⁻³을 얻는다. 이 경계는 시험을 뽑기 전에 고정한 후보에만 적용된다. 논문은 모든 입력과 측정 기록의 쌍이 통과할 때만 선형성으로 양자적 정확성을 보장한다고 적는다.
- **별도 확인**: 발표 글은 디코더를 4억 300만 회 표본 디코딩으로 시험해, 저장해 둔 대체 값이 필요한 빈도를 쟀고 약 1만 회에 1회 실패해 과제가 허용한 오류율 안이었다고 적는다. 가역 divsteps 설계는 대규모 수치 시뮬레이션과 Lean 형식화로 확인했다.
- **하드웨어 실행 여부**: 결과는 평가기 점수와 미래 기계를 위한 자원 추정이다. 실제 양자 하드웨어에서 돌린 결과는 발표에 없다.

## 사례: Claude Mythos 5의 양자 회로 설계

2026-10-16 Anthropic 발표와 같은 시기 arXiv 논문(2610.22367) 기준이다.

- **과제와 결과**: 수치 계산, 화학, 최적화, 양자 시뮬레이션, 정수론에 걸친 8개 과제에서 Claude Mythos 5가 OpenEvolve 위에서 구조와 프로그램 수정을 제안했다. 논문은 7개 과제에서 발견한 회로가 과제별 기준선보다 Toffoli 수와 큐비트 수가 모두 적다고 보고한다(Table 1). 기준선에 자유 매개변수가 있으면 T×Q가 가장 작아지게 맞췄고, Hermitian DQI 디코더는 기존 가역 구현이 없어 단순 가역 구현을 기준선으로 썼다. 여덟 번째 과제인 소수 체 모듈러 역원에서는 divsteps를 가역 회로에서 쓸 수 있게 한 새 구조를 얻었고, 이 과제의 비용은 그 역원을 쓰는 타원곡선 점 덧셈 전체 회로로 잰다.
- **탐색 구조**: LLM이 서로 다른 구조를 여럿 제안해 각각을 가족으로 병렬 발전시키고 주기적으로 선두 프로그램을 공유한다. MAP-Elites로 (T, Q) 평면의 칸마다 T×Q가 가장 낮은 회로를 남긴다. 반복마다 부모 프로그램, 평가 피드백, 보관소 표본과 메모로 새 에이전트 세션을 시작하며, 세션 안에서 시험 실행과 서브에이전트를 쓸 수 있다.
- **대표 수치와 비교 기준**: 점 덧셈은 기존 설계마다 Toffoli와 큐비트를 다르게 맞바꿔, 논문이 단일 기준선과 개선 배율을 내지 않는다(Table S3). 발견한 divstep 회로(Toffoli 4.0×10⁶, 큐비트 935)는 큐비트가 가장 적은 기존 설계(Luo 외, 7.0×10⁷, 838)보다 큐비트를 12% 더 쓰고 Toffoli를 약 17분의 1로 줄였지만, Toffoli가 가장 적은 기존 설계(Schrottenloher, 1.9×10⁶, 1,446)보다는 Toffoli가 약 2배여서 T×Q도 크다(3.7×10⁹ 대 2.7×10⁹). 발표 글 본문은 앞의 비교를 들고 새 설계들이 큐비트 수와 실행 시간의 Pareto 경계를 넓혔다고 설명하며, 이 설계가 53시간 실행 한 번에서 나왔다고 적는다. 어느 기존 설계를 기준으로 삼느냐에 따라 같은 회로가 개선으로도 후퇴로도 읽힌다(이 문서의 판단). DQI에 쓰는 Reed-Solomon 디코더는 Google의 기존 구성(2025)보다 게이트를 12분의 1로 줄였다(논문 표의 T×Q 비 12, Toffoli 5.1×10⁶에서 4.4×10⁵). 모두 연구진이 보고한 자원 추정이다.
- **사람의 역할과 관찰된 약점**: 사람은 점 덧셈 과제의 한 문단 명세를 쓰고 가끔 탐색을 넓히라고 지시했다. 발표는 모델이 개선을 지나치게 의심하고 잘 알려진 접근을 선호하는 경향이 있어, 여러 병렬 접근을 요구하고 가끔 탐색을 넓히도록 유도했다고 적는다.
- **재현 범위**: 2026-10-27 공식 모델 페이지 기준 Mythos 5는 Cyber Verification Program 같은 Anthropic 검증 프로그램을 통과한 조직에만 제공되고(상태 Active), 현재 Mythos 모델은 2026-09-01 출시된 Mythos 5.1이다([[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5]]). 지금 재현하면 연구와 다른 판을 고르기 쉬우므로 쓴 모델 ID를 결과와 함께 기록한다(적용 제안). 같은 구성을 다른 모델로 돌린 결과는 이 연구가 보여 주지 않는다. 가족 수, 반복 횟수와 연산 예산은 논문 본문과 부록, 발표 글에서 찾지 못했다.

## 적용 판단

- 자동으로 판정할 수 있는 정답 조건과 숫자로 잴 수 있는 비용이 있는가
- 평가기가 표본으로만 검사하는 범위와 그 실패율 경계를 결과와 함께 기록하는가
- 대리 지표와 실제 목적의 차이, 그리고 사람이 정한 과제 정의의 한계를 설명할 수 있는가
- 실행 시간과 비용 예산, 사람이 개입할 시점과 최종 검토 방법을 정했는가

이 목록은 도입 검토를 위한 제안이다. 연구 결과 주장을 공동체 검토, 형식화와 재현으로 확인하는 기준은 [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]]의 연구 결과 사례와 같다.

## 출처

- [AlphaEvolve: A Gemini-powered coding agent for designing advanced algorithms — Google DeepMind](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) — 2025-05-14, 자동 평가기와 진화적 틀, 적용 대상
- [AlphaEvolve: A coding agent for scientific and algorithmic discovery — arXiv, Alexander Novikov 외](https://arxiv.org/abs/2506.13131) — 2025-06-16, 평가기 피드백 루프와 대표 결과
- [Designing more efficient quantum circuits with Claude — Anthropic](https://www.anthropic.com/research/designing-efficient-quantum-circuits) — 2026-10-16, 폐쇄 루프, 비용 지표, 검증 방법, 사람의 역할과 한계
- [Discovering state-of-the-art quantum circuits with large language models — arXiv, Andi Gu, Alek H. Kemeny, Susanne F. Yelin, Mikhail D. Lukin](https://arxiv.org/abs/2610.22367) — 2026-10-15 제출, 초록의 과제 결과, Table 1과 Table S3의 기준선, 본문 Methods의 OpenEvolve, 평가기, 표본 검사 경계와 MAP-Elites
- [Anthropic Platform Docs, Claude Mythos 5](https://platform.claude.com/docs/en/models/mythos-5/overview) — 2026-10-27 제공 조건과 상태
- [Anthropic Platform Docs, Claude Mythos 5.1](https://platform.claude.com/docs/en/models/mythos-5-1/overview) — 2026-10-27 출시일과 제공 조건
- [Claude로 더 효율적인 양자 회로 설계하기 — GeekNews](https://news.hada.io/topic?id=35530) — 학습 계기, 수치는 위 공식 자료로 대조

## 관련 문서

- [[Energy-Based-Reasoning|에너지 기반 추론과 제약 검증]] — 탐색기와 검사기의 분리
- [[Monte-Carlo-Tree-Search|몬테카를로 트리 탐색]] — 탐색 예산과 보상 기반 선택
- [[Evaluation-Driven-Development|평가 주도 개발]] — 만드는 축과 채점하는 축
- [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]] — 연구 결과 주장의 검증 조건
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]

---
tags: [ai, llm, gemini, model, evaluation, availability]
status: done
verified_at: 2026-10-01
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gemini 4 Argon", "제미나이 4 아르곤"]
---

# Gemini 4 Argon

## 모델의 범위

복잡한 코딩, 지식 업무, 멀티모달 이해와 방어적 보안 작업을 겨냥한 Google의 모델이다. 2026-09-30 발표됐으며, 아래 가용성과 가격은 발표 및 공식 평가 자료를 2026-10-01 확인한 기준이다.

장시간 작업을 이어가는 추론 능력과 실제 서비스에서 호출할 수 있는 조건은 따로 판단한다. 모델 발표를 일반 API 공개로 해석하면 안 된다.

## 출력 한도와 긴 작업

발표된 주요 변화는 **출력 토큰 한도 1M**이다. 이를 입력 컨텍스트 한도와 혼동하지 않는다. 긴 추론과 생성 경로를 허용하는 용량이지, 매 요청이 그만큼 출력하거나 정확성을 보장한다는 뜻은 아니다.

긴 작업을 평가할 때는 다음 조건을 별도로 정한다.

- 작업 완료를 판정할 테스트와 중간 확인 지점
- 최대 실행 시간과 토큰 비용
- 중단 뒤 재개할 상태와 실패 시 복구 방법
- 생성된 코드와 문서의 검토 범위

이는 모델 스펙 자체가 아니라 장기 실행 에이전트에 적용할 운영 점검 기준이다.

## 가용성과 발표 가격

| 항목 | 확인된 범위 |
|---|---|
| 초기 접근 | Fairwind Program의 신뢰된 사이버 방어 조직 등 제한된 대상 |
| 확대 계획 | 유료 API 고객과 Google AI Ultra 구독자부터 확대 예정 |
| 출시 도입 가격 | 100만 토큰당 입력 $2, 출력 $10 |
| 도입 기간 종료 후 | 100만 토큰당 입력 $4, 출력 $20 |
| 캐시 입력 | 입력 가격 대비 95% 할인으로 발표 |

일반 공개일과 도입 가격 종료일은 확인한 발표에 명시되어 있지 않다. 실제 도입 전 모델 ID, 계정별 접근, API별 제한과 적용 요금을 다시 확인한다.

## 성능 수치와 비교 조건

다음은 Google 공식 모델 페이지의 보고값이다. 다른 제품의 실무 성능이나 특정 팀의 생산성으로 직접 환산하지 않는다.

| 평가 | Argon 보고값 | 평가 영역 |
|---|---|---|
| DeepSWE v1.1 | 77.9% | 장기 소프트웨어 엔지니어링 |
| FrontierSWE v2 | 55.0% | 에이전트 코딩 |
| Terminal-Bench 4.0 | 57.4% | 터미널 기반 작업 |
| AutomationBench | 51.3% | 업무 절차 수행 |
| LVBench | 91.7% | 긴 영상 이해 |

평가 방법론은 별도 명시가 없으면 pass@1과 최고 thinking 설정을 사용한다. 경쟁 모델 수치는 벤더 보고값과 공개 리더보드를 함께 사용하므로, 모든 결과가 동일 조건의 단일 실험은 아니다.

- DeepSWE의 Argon 값은 mini-swe 하네스로 자체 측정했다.
- LVBench는 도구 없이 평가했지만 모델별 영상 프레임 입력 조건이 다르다.
- OSWorld 2.0은 오프라인 부분집합의 partial score이고, 세 실행 중 최댓값을 보고한다. 일반적인 단일 시도 성공률과 구분한다.

실무 채택 여부는 같은 과업, 하네스, 시간 및 비용 예산을 둔 자체 평가로 판단한다. 특정 벤치마크의 우위만으로 모든 코딩 작업에 가장 적합하다고 결론짓지 않는다.

## 안전 장치와 한계

공식 모델 페이지는 악용 거부, 간접 프롬프트 주입 방어, 추론과 행동 감시, 샌드박스 격리를 설명한다. 이는 벤더가 제시한 방어 체계이며 주입 공격이나 오작동의 부재를 보장하지 않는다.

평가 기준으로는 외부 문서의 지시를 따라 권한을 넘는지, 잘못된 도구 호출 뒤 중단하는지, 검증 실패를 성공으로 보고하는지를 함께 확인한다. 발표된 방어 성능과 개별 배포 환경에서 검증한 동작을 구분한다.

## 출처

- [Gemini 4 Argon: our next era of frontier intelligence — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)
- [Google DeepMind, Gemini](https://deepmind.google/models/gemini/)
- [Google DeepMind, Gemini 4 Argon Model evaluation](https://deepmind.google/models/evals-methodology/gemini-4-argon)

## 관련 문서

- [[LLM-Eval-Strategy|LLM 평가 전략]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택]]
- [[Harness-Component-Evaluation|하네스 구성요소 평가]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
- [[Agent-Swarm-Containment|에이전트 군집 격리]]

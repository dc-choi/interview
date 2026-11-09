---
tags: [ai, llm, gemini, model, evaluation, availability]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gemini 4 Argon", "제미나이 4 아르곤"]
---

# Gemini 4 Argon

## 모델의 범위

복잡한 코딩, 지식 업무, 멀티모달 이해와 방어적 보안 작업을 겨냥한 Google의 모델이다. 2026-09-30 발표됐으며, 발표 가격과 초기 접근 계획은 2026-10-01 확인 기준이다. 구독자 가용성은 아래에 2026-10-14 확인 내용을 별도로 적었다.

장시간 작업을 이어가는 추론 능력과 실제 서비스에서 호출할 수 있는 조건은 따로 판단한다. 모델 발표를 일반 API 공개로 해석하면 안 된다.

## 출력 한도와 긴 작업

2026-10-16 공식 Gemini API 모델 문서 대조 기준, 입력과 출력이 공유하는 전체 토큰 한도는 1,048,576이다. 기본 동기 출력 한도는 65,536이고 long decode로 더 긴 생성을 이어간다. 입력, 추론과 최종 출력의 예산을 합산하며 1M 출력을 입력과 별개로 모두 사용할 수 있다는 의미로 읽지 않는다. Google Cloud 가이드는 비스트리밍 직접 HTTP 요청에서 32,768토큰 한도도 구분하므로 실제 호출 경로를 확인한다. 긴 생성 용량이 정확성이나 완료를 보장하지 않는다.

긴 작업을 평가할 때는 다음 조건을 별도로 정한다.

- 작업 완료를 판정할 테스트와 중간 확인 지점
- 최대 실행 시간과 토큰 비용
- 중단 뒤 재개할 상태와 실패 시 복구 방법
- 생성된 코드와 문서의 검토 범위

이는 모델 스펙 자체가 아니라 장기 실행 에이전트에 적용할 운영 점검 기준이다.

## 가용성과 발표 가격

| 항목 | 확인된 범위 |
|---|---|
| 발표 당시 초기 접근 | Fairwind Program의 신뢰된 사이버 방어 조직 등 제한된 대상 |
| 발표 당시 확대 계획 | 유료 API 고객과 Google AI Ultra 구독자부터 확대 예정 |
| 출시 도입 가격 | 100만 토큰당 입력 $2, 출력 $10 |
| 도입 기간 종료 후 | 100만 토큰당 입력 $4, 출력 $20 |
| 캐시 입력 | 입력 가격 대비 95% 할인으로 발표 |

9월 30일 발표에는 일반 공개일과 도입 가격 종료일이 명시되어 있지 않다. 위 가격을 모든 제품과 계정의 현재 적용 요금으로 간주하지 않는다. 정식 제공 뒤 가격표가 밝힌 기한은 [[#정식 제공 뒤 확인한 모델 ID와 가격 기한]]에 정리했다.

### 구독자 가용성과 API 접근을 구분한다

부분 검증(2026-10-14): 공식 모델 페이지는 Google AI Pro와 Ultra 구독자에게 Argon이 제공된다고 안내한다. 발표 당시의 제한된 초기 접근과 구분하며, 확인일을 서비스 개시일로 단정하지 않는다.

같은 페이지에는 Gemini, Google AI Studio와 Antigravity 진입 링크가 있다. 이 안내만으로 무료 계정 전체의 접근, 특정 리전의 API 지원이나 계정별 quota까지 확인한 것은 아니다. 실제 도입 전 사용할 제품, 모델 ID, 접근 권한과 과금 조건을 확인한다(도입 점검 제안).

2026-10-14에는 가용성 안내와 발표 당시 조건을 대조했다. 개별 계정의 호출 시험과 평가 방법론 전체 재검증은 수행하지 않아 당시에는 기존 `verified_at`을 유지했다. 2026-10-27 갱신의 근거는 아래 정식 제공 절에 적었다.

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

## 10월 일반 제공과 로봇 활용의 확인 범위

2026-10-16 대조한 Google의 2026-10-13 개발자 발표는 유료 Gemini API, AI Studio 및 구독 제품의 확대 제공을 안내한다. API 접근 계획만 있었던 9월 발표와 구분한다. 계정별 리전, quota와 실제 호출 성공은 이번에 시험하지 않았다.

제공된 2026-10-14 GeekNews 발췌는 Chrome 리팩터링 기간 단축, Gemma 4 E2B의 A100/vLLM 처리량 2.85배, 양자 오류 정정과 효소 및 희귀질환 연구를 소개한다. 이 세부 사례의 전체 측정 조건은 이번에 대조하지 않아 일반 성능 배율로 사용하지 않는다.

로봇 활용은 영상 관찰, 물리적 공간 이해, 시뮬레이션 코드와 실제 제어를 연결하는 흐름이다. Google 공식 10월 발표는 ERQA에서 도구 없이 87%와 영상에서 시뮬레이션을 만들고 로봇으로 옮긴 내부 시연을 보고한다. 발췌의 ERQA 400문항, Opus 5.5 82.3%, GPT-6 Astra 81%의 비교 조건과 로봇 전체 행동 로그는 직접 대조하지 않았다. 질문 평가 점수를 실제 로봇의 안전한 작업 성공률로 환산하지 않는다.

## 정식 제공 뒤 확인한 모델 ID와 가격 기한

2026-10-27에 Gemini API 변경 이력, 모델 페이지, 가격표와 Google Cloud의 Gemini Enterprise Agent Platform 릴리스 노트를 대조했다. 이 대조로 `verified_at`을 갱신했으며, 위 성능표와 평가 방법론은 다시 대조하지 않았다.

- **모델 ID와 상태**: 2026-10-13 변경 이력은 `gemini-4-argon`을 GA로 적고, 모델 페이지(2026-10-14 갱신)도 Stable(GA)로 표시한다. 같은 페이지에서 computer use는 Preview다. 모델이 GA여도 기능마다 상태가 다를 수 있다.
- **할인 기한**: Standard 단가는 100만 토큰당 입력 $2, 출력 $10(사고 토큰 포함)이 2026-11-30까지이고, 2026-12-01부터 입력 $4, 출력 $20이다. 캐시 입력은 같은 날 $0.10에서 $0.20으로 바뀌며 암시적 캐싱만 지원하고 명시적 캐싱은 지원하지 않는다. Batch와 Flex는 입력 $1, 출력 $5에서 $2, $10으로 바뀐다. 무료 등급에서는 쓸 수 없다. 9월 발표의 도입 가격과 종료 후 가격이 이 기한과 함께 가격표에 올라간 것이므로, 12월 이후 예산은 바뀐 단가로 계산한다.
- **Google Cloud 경로**: 2026-10-13 릴리스 노트는 `gemini-4-argon`과 방어적 사이버 보안용 `gemini-4-argon-cyber-permissive`를 GA로 적고, 후자는 Fairwind Program 허용 목록 뒤에 둔다. 알려진 문제로 `continuation_token`을 쓰는 long decode는 `v1beta1` API에서만 지원하고 `v1`에서는 지원하지 않는다고 적는다. long decode를 쓰는 경로는 호출하는 API 버전까지 확인한다([[LLM-API-Version-Migration|LLM API 버전과 SDK 마이그레이션]]).

## 출처

- [Gemini 4 Argon: our next era of frontier intelligence — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)
- [Google DeepMind, Gemini](https://deepmind.google/models/gemini/)
- [Google DeepMind, Gemini 4 Argon Model evaluation](https://deepmind.google/models/evals-methodology/gemini-4-argon)
- [Google AI for Developers, Gemini 4 Argon](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon)
- [Google Cloud, Developer's guide to Gemini 4 Argon](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon?hl=en)
- [Gemini 4 Argon is now available for developers — Google](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-4-argon/)
- [Gemini 4 Argon: Built to solve your hardest problems — Google](https://blog.google/intl/en-in/products/introducing-gemini-4-argon/)
- 사용자 제공 GeekNews 발췌: 2026-10-14 정식 출시, 2026-10-15 로봇 제어와 시뮬레이션 활용. 기존 가격과 전체 성능표를 다시 검증하지 않아 그때는 문서 전체 검증일을 유지했다.
- [Gemini API Changelog — Google AI for Developers](https://ai.google.dev/gemini-api/docs/changelog) — 2026-10-13 GA 항목, 2026-10-27 확인
- [Google AI for Developers, Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) — 2026-10-27 할인 기한, 캐시, Batch와 Flex 단가 확인
- [Gemini Enterprise Agent Platform release notes — Google Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes) — 2026-10-13 GA, Cyber Permissive 허용 목록, long decode의 API 버전 제한
- 사용자 제공 알림: 긱뉴스 GeekCast의 오늘의 긱뉴스(2026.10.13~10.17) 영상. 학습 계기이며 영상은 열람하지 않았고, 정식 제공 사실은 위 공식 문서로 대조했다.

## 관련 문서

- [[LLM-Eval-Strategy|LLM 평가 전략]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택]]
- [[Harness-Component-Evaluation|하네스 구성요소 평가]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
- [[Agent-Swarm-Containment|에이전트 군집 격리]]

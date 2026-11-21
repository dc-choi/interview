---
tags: [ai, llm, gemini, model, evaluation, availability]
status: done
verified_at: 2026-11-21
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gemini 4 Argon", "제미나이 4 아르곤", "Gemini 4 Carbon", "Gemini 4 Hydrogen", "Gemini 4 Neon", "Antigravity Orchestrator"]
---

# Gemini 4 Argon

## 모델의 범위

복잡한 코딩, 지식 업무, 멀티모달 이해와 방어적 보안 작업을 겨냥한 Google의 모델이다. 2026-09-30 발표됐으며, 발표 가격과 초기 접근 계획은 2026-10-01 확인 기준이다. 구독자 가용성은 아래에 2026-10-14 확인 내용을 별도로 적었다.

장시간 작업을 이어가는 추론 능력과 실제 서비스에서 호출할 수 있는 조건은 따로 판단한다. 모델 발표를 일반 API 공개로 해석하면 안 된다. 같은 세대의 Carbon, Neon과 Hydrogen, 모델을 오가는 Antigravity Orchestrator는 [[#Gemini 4 계열의 Carbon과 Hydrogen|아래 절]]에 둔다.

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

## Gemini 4 계열의 Carbon과 Hydrogen

2026-11-16에 Google 발표, Gemini API 변경 이력과 가격표, Artificial Analysis 페이지를 대조했다. 이 대조로 `verified_at`을 갱신했으며, 이날 가격표의 Argon 단가와 기한은 위 절과 같았다. 위 성능표와 평가 방법론은 다시 대조하지 않았다. 2026-11-18 나온 Neon은 2026-11-21에 같은 종류의 자료로 대조했고, 이날 가격표의 Carbon 단가와 기한도 아래 표와 같았다.

| 모델 | Google이 밝힌 위치 | API 상태와 단가(100만 토큰당, 가격표 확인일은 행마다 표시) |
|---|---|---|
| Gemini 4 Carbon (`gemini-4-carbon`) | Argon 위의 최상위. 사이버 보안, 장기 에이전트 작업, 소프트웨어 엔지니어링과 과학 추론 | 2026-11-10 GA(2026-11-16 가격표, 11-21 재확인), 무료 등급 없음. Standard 입력 $2, 출력 $10(사고 토큰 포함)은 2026-11-30까지이고 12월 1일부터 $4, $20. 캐시 입력은 같은 날 $0.10에서 $0.20(암시적 캐싱만). Batch와 Flex는 Standard의 절반, Priority는 1.8배 |
| Gemini 4 Neon (`gemini-4-neon`) | Carbon과 Hydrogen 사이. 복잡하면서 자주 하는 코딩, 분석과 기업 업무를 빠르고 싸게 | 2026-11-18 GA(2026-11-21 가격표), 무료 등급 없음. Standard 입력 $3, 출력 $15(사고 토큰 포함), 캐시 입력 $0.15(암시적 캐싱만). Batch와 Flex는 절반, Priority는 1.8배. 특별가 기한과 프롬프트 길이 구간 없음 |
| Gemini 4 Argon (`gemini-4-argon`) | 대부분의 소프트웨어 엔지니어링과 지식 업무 | 2026-11-16 가격표 기준 Carbon과 같은 등급별 단가와 기한. 초대제 비공개 프리뷰인 Contributor 등급(입력 $1, 출력 $5, 사용분이 제품 개선에 쓰일 수 있음)도 표시 |
| Gemini 4 Hydrogen (`gemini-4-hydrogen`) | 일상 작업용 단독 모델이자 Carbon, Argon과 짝을 이루는 실행 엔진 | 2026-11-12 GA(2026-11-16 가격표). 무료 등급에서 입력, 출력과 캐시를 무료로 표시하고 그 사용분은 제품 개선에 쓰일 수 있다고 적음. 유료 입력 $1.50, 출력 $7.50, 캐시 입력 $0.075이고 Batch와 Flex는 절반, Priority는 1.8배. 특별가 기한과 프롬프트 길이 구간 없음 |

- **같은 단가, 다른 토큰 수**: Carbon은 Argon과 단가가 같지만 Google은 Carbon이 더 철저히 탐색하고 검증 루프를 길게 돌리느라 Argon보다 토큰을 더 쓴다고 적는다. 둘 사이의 선택은 단가가 아니라 같은 과업의 토큰 수, 성공률과 과업당 비용으로 한다([[Model-Release-Claims#비용 절감률은 단가, 토큰 수, 과업당 비용으로 나눈다|과업당 비용]]). CursorBench 4.0, WANDR, AutomationBench 1위와 차순위 외부 모델보다 과업당 비용이 절반 미만이라는 주장은 Google 발표이며, 비교 모델과 추론 설정은 이 발표에서 확인하지 못했다. CursorBench는 아래 순위표로 따로 대조했다.
- **CursorBench 4.0의 설정별 비용(2026-11-18 열람)**: Cursor가 실제 세션에서 뽑은 모호한 다중 파일 과제의 순위표다. 과업당 평균 비용은 모델별 공개 단가(입력, 캐시 읽기, 캐시 쓰기, 출력)를 과제마다 쓴 토큰에 적용한 값이라 개발자 청구액의 추정이며 공급사의 원가가 아니다. Carbon은 High 60.4%($9.22, 71단계)로 1위, Medium 60.1%($8.49), Low 58.6%($11.89, 124단계)다. 3위는 Fable 5.2 Max 60.0%($32.79, 218단계)다. 상위 세 행이 0.4%p 안이라 페이지의 주의(작은 점수 차는 통계적으로 의미 없을 수 있다)대로 순위 차이보다 비용 차이를 본다. Fable 5.2는 Extra High 56.3%($15.48), High 56.9%($9.70), Medium 54.8%($4.66), Low 53.2%($3.94)이고 Opus 5.5 High는 56.0%($3.97)다.
  - Google 발표의 차순위 외부 모델 대비 절반 미만 주장은 이 순위표의 Carbon High와 Fable 5.2 Max 기준으로는 어긋나지 않는다(약 28%). 다만 Google이 비교한 모델과 설정이 이 행인지는 확인하지 못했다.
  - Fable 5.2는 Max에서 마지막 몇 %p가 비싸다. Max와 High의 3.1%p 차이에 과업당 약 $23을 더 쓴다. Extra High는 High보다 비싸지만 점수가 낮게 나와, 설정을 올린다고 점수가 단조롭게 오르지 않는다.
  - 낮은 추론 설정이 항상 싸지는 않다. Carbon Low는 High보다 단계가 많고(124 대 71) 과업당 비용도 높다. 페이지는 원인을 설명하지 않으며 단계 증가를 원인으로 보는 것은 이 문서의 추론이다. 같은 표의 Fable 5.2와 Opus 5.5는 낮은 설정일수록 쌌다. 설정은 단가가 아니라 과업당 비용과 성공률을 재서 고른다([[Model-Release-Claims#비용 절감률은 단가, 토큰 수, 과업당 비용으로 나눈다|과업당 비용]]).
  - Carbon 행에 11월 30일까지의 특별가와 12월 이후 단가 중 어느 것을 적용했는지는 페이지에 없다. 특별가로 계산한 값이라면 12월부터 입력, 출력과 캐시 단가가 모두 2배가 되므로 같은 토큰의 High 비용은 약 $18.44로 Fable 5.2 Max의 약 56%가 되어 절반 미만이 아니게 된다. 페이지의 변경 이력은 2026-10-07이 마지막이라 Carbon과 Fable 5.2 행이 들어간 날짜와 적용 단가는 확인하지 못했다. 이날은 Cursor 순위표만 대조했고 Google 가격표와 나머지 주장은 다시 대조하지 않아 `verified_at`은 바꾸지 않았다.
- **느린 이유를 나눈 제3자 분석**: 자체 비공개 평가를 운영하는 Kernel은 버그 수정 평가에서 Carbon(high)이 Opus 5.5와 GPT-6 Astra가 high로 2~4분에 끝내는 과제에 평균 56분을 쓴 원인을 단계당 시간과 궤적 길이로 나눴다([[Benchmark-Coverage-and-Workplace-Performance#느린 실행은 단계당 시간과 단계 수로 나눈다|느린 실행의 분해]]). low로 낮추면 수정을 내지 못하고 이미 읽은 코드를 다시 읽으며 맴돌았다고 적어, 위 순위표에서 Low가 High보다 단계가 많았던 관찰과 같은 방향이다. 두 자료의 과제와 하네스는 다르다.
- **제공 경로**: Carbon은 GA 2주 전 Fairwind Program의 사이버 방어자에게 먼저 열렸다. GA와 함께 유료 Gemini API 개발자 전체, 유료 기업 고객과 Google AI Ultra 구독자(Antigravity, Gemini 앱, 검색 AI Mode)로 넓어졌고, 과학자는 신청을 받아 자격, 용량과 선정 심사를 거쳐 Argon과 Carbon을 6개월 무료로 쓰게 한다. Hydrogen은 AI Studio 전 등급과 Antigravity의 유료 Pro, Ultra 구독자에게 열리고, Gemini 앱의 무료 사용자는 자동 모델 선택을 통해 쓴다고 각주에 적는다. 변경 이력은 Hydrogen을 Gemini Managed Agents의 Antigravity 에이전트 기본 모델로 적는다.
- **Hydrogen의 사고 수준과 발표 수치**: 사고 수준은 low, medium, high(기본)와 새로 생긴 xhigh다. Google은 Artificial Analysis Intelligence Index에서 기본 high가 Argon(50점)을 넘는다고 적었고, 2026-11-16 Artificial Analysis 페이지(v5.0.1)도 High 51점, Xhigh 54점을 보인다. 같은 페이지에서 Xhigh는 지수 평가에 출력 토큰 3억 400만(High 1억 1천만)을 썼고 과업당 비용은 $3.16이다. Terminal-Bench 4.1의 57%(Gemini 3.8 Flash 18.2%)는 하네스를 밝히지 않았고, 3.8 Flash보다 작업을 2.5배 빨리 끝낸다는 주장과 파트너 시험의 2~2.8배 속도, 12~23% 토큰 감소에는 초당 토큰 수와 측정 조건이 없다. 발표의 검색 비교 이미지는 비교 대상을 Gemini 3.5 Flash로 표기해 본문(3.8 Flash)과 어긋난다.

### Gemini 4 Neon: 단가 기한이 바꾸는 비교

Neon은 Carbon의 깊이와 Hydrogen의 속도 사이를 맡는 모델로 소개된다. 사고 수준은 low, medium, high(기본), xhigh 네 단계다(변경 이력). 모델 문서는 입력과 출력이 함께 쓰는 통합 한도를 1,048,576토큰으로 적고, 기본 동기 출력 한도는 65,536토큰이며 long decode로 그 통합 한도까지 출력할 수 있다고 적는다. 위 Argon처럼 입력과 출력이 한 예산을 나눠 쓰므로 1M 입력과 1M 출력을 따로 쓸 수 있다는 뜻이 아니다. Antigravity에서는 유료 Pro와 Ultra 구독자에게 열렸고, Orchestrator가 Neon을 계획에, Hydrogen을 실행에 두는 조합을 새로 지원한다. 사이버 방어용 Neon for cyber는 Fairwind Program 회원에게 며칠에 걸쳐 열린다. Google은 Artificial Analysis 지수 xhigh 61점으로 전체 3위, Vals Index 2위라고 적고, 2026-11-21 Artificial Analysis에서도 Fable 5.2(Max) 65점과 GPT-6.2 Astra(Max) 62점 다음이었다(Vals Index 3위와의 점수 차는 [[Model-Release-Claims#자체 보고 점수는 비교 대상, 채점자와 독립성을 본다|모델 발표 수치 읽기]]).

- **과업당 비용 주장은 비교 날짜의 단가에 묶인다**: Google은 기본 high가 Artificial Analysis 지수의 높은 점수와 함께 Carbon보다 과업당 비용이 32% 낮고, xhigh도 경쟁 모델의 최고 설정보다 36% 이상 낮다고 적는다. 앞의 비교에 Carbon의 어느 단가를 넣었는지, 뒤의 비교가 어느 벤치마크와 모델인지는 밝히지 않는다. Neon의 단가는 Carbon의 11월 특별가($2, $10)보다 높고 12월 정가($4, $20)보다 낮다. 2026-11-21 Artificial Analysis(v5.0.1)에서 같은 High끼리 보면 둘 다 60점이고 과업당 비용은 Neon $3.74(페이지에 내장된 데이터의 값), Carbon $7.76이며 Carbon 값은 정가로 계산돼 있다. Carbon은 11월 30일까지 입력, 캐시 입력, 출력 단가가 모두 절반이라 같은 토큰이면 약 $3.88이므로, High끼리는 정가 기준 약 52%, 특별가 기준 약 4% Neon이 싸다(이 문서의 계산). Google의 32%는 이 지수에서는 어느 Carbon 단가로도 재현되지 않는다(이 문서의 대조). 한 단계 높은 Neon Xhigh(61점, $6.44)와 Carbon High를 비교하면 11월에는 Carbon이, 12월부터는 Neon이 싸므로, 단가 기한이 순서를 바꾸는지는 어느 설정끼리 비교하느냐에 달렸다. 같은 날 GPT-6.2 Astra(Max)는 62점에 과업당 $4.00이었으므로, 36% 이상 낮다는 주장은 적어도 이 지수에서 GPT-6.2 Astra와 비교한 값은 아니다(이 문서의 대조).
- **같은 점수에서 다른 토큰과 시간**: Artificial Analysis의 High 설정에서 Neon과 Carbon은 모두 60점이지만 지수 평가의 출력 토큰은 1억 2,300만 대 2억 500만이었고, 과업당 시간은 2026-11-21 두 번 열람한 값이 14.8분과 14.3분 대 37.0분과 36.6분이었다. 페이지 설명으로는 이 시간이 평가마다 과업당 출력 토큰을 출력 속도로 나눠 지수 가중치로 평균한 값이라 도구 실행 시간은 들어 있지 않다. 전체 출력 토큰을 헤드라인 출력 속도(같은 두 번의 열람에서 Neon High 101~105 tok/s, Carbon High 55~56 tok/s)로 나눈 비는 약 3배인데 시간 비는 약 2.5배라, 평가별 가중치와 속도 값을 모르면 이 계산을 재현할 수 없다(이 문서의 대조). 헤드라인 속도는 2026-11-03 성능 측정 v3.0.0부터 6시간마다 재는 워크로드별 값을 최근 5일 동안 평균한 것이라 같은 날에도 움직인다. 출시 당일 OpenRouter에서 Neon이 초당 127토큰, Carbon이 46토큰이었다는 값은 한 블로그의 관찰이며 측정 조건이 없다.
- **속도를 넣은 순위 예측은 측정이 아니다**: OpenCode 위에서 두 에이전트를 겨루게 하는 Agent Duel의 운영자는 투표 승률을 모델, 속도, 작업이 끝나기 전에 투표했는지와 속도와 조기 투표의 상호작용으로 모형화하고, 속도가 모델 자체만큼 승률을 가른다고 적었다. Carbon은 조기 투표를 뺀 이 순위표에서 1위지만 느리다. 운영자는 이 모형에 Neon이 Carbon과 같은 성능이라는 가정과 127 tok/s를 넣어 Elo 1,066(Opus 5.5 1,078, 차이의 90% 구간 −94~+68, Opus 5.5 상대 예상 승률 48.3%)을 투영했다. Neon의 실제 대결 기록이 없는 투영값이다.
- **하네스가 바꾸는 점수**: Google은 SWE-sweep에서 Neon이 mini-SWE 하네스로 12.8%, Antigravity 하네스로 39.0%라고 적는다. 같은 모델의 점수가 하네스에 따라 3배 넘게 달라지므로, 공급사 하네스로 잰 점수를 다른 하네스로 잰 모델 점수와 비교하지 않는다([[Harness-Component-Evaluation#모델을 바꾸면 하네스 순위도 다시 잰다|하네스 순위]]).

### Antigravity Orchestrator: 한 작업 안에서 모델을 오간다

Orchestrator(2026-11-12)는 Antigravity의 모델 선택지 하나로, 첫 프롬프트로 모델 하나를 골라 작업 전체를 맡기는 정적 라우터가 아니라 한 작업 궤적 안에서 Carbon과 Hydrogen 사이를 양방향으로 오간다고 소개된다. Antigravity 블로그가 예로 든 흐름은 Carbon이 읽기 전용 단계에서 의존성을 살피고 모호함을 풀어 재계획 조건을 명시한 계획을 세우면, Hydrogen이 편집, 패키지 갱신과 테스트 실행을 넘겨받고, Hydrogen이 막히면 Carbon이 상태를 점검해 계획을 고친 뒤 실행을 잇는 것이다. 블로그는 이 흐름을 할 수 있다는 형태로만 설명하며 전환 판단 기준, 결과 검증과 사람 승인 지점은 밝히지 않는다. 큰 작업을 여러 worktree의 병렬 에이전트 팀으로 나누는 `/swarm`과는 별개 기능이다.

- **수치의 조건**: Carbon에 가까운 성공률을 평균 할당량 24% 적게, 19% 빠르게 냈다는 같은 수치를 Google 블로그는 Terminal-Bench 4.0, Antigravity 블로그는 Terminal-Bench 4.1의 결과로 적고, 비교 기준선도 밝히지 않는다. 판 표기가 엇갈리는 동안은 다른 모델의 점수와 비교하지 않는다. 구독 할당량의 감소이므로 API 비용 절감률로 옮기지 않는다.
- **제공 범위**: Google AI Ultra 구독자는 Orchestrator(Carbon)와 Orchestrator(Argon)를, 유료 Pro 구독자는 Orchestrator(Argon)를 쓰고, 기업은 Gemini for business로 쓴다. Argon 변형이 어느 모델과 오가는지와 프리뷰인지 GA인지는 블로그에 없다.
- **일반화**: 계획과 재계획은 상위 모델, 실행은 하위 모델이 맡고 막히면 위로 되돌리는 구성은 [[LLM-Model-Tiers#티어별 역할 분리와 상호 검토|티어별 역할 분리]]의 에스컬레이션을 한 세션 안에서 자동화한 형태다. 모델 전환에 따른 캐시 재사용 조건은 발표에 없으므로 자기 작업의 사용량으로 확인한다(적용 제안).

## 출처

- [Gemini 4 Argon: our next era of frontier intelligence — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)
- [Google DeepMind, Gemini](https://deepmind.google/models/gemini/)
- [Google DeepMind, Gemini 4 Argon Model evaluation](https://deepmind.google/models/evals-methodology/gemini-4-argon)
- [Google AI for Developers, Gemini 4 Argon](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon)
- [Google Cloud, Developer's guide to Gemini 4 Argon](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon?hl=en)
- [Gemini 4 Argon is now available for developers — Google](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-4-argon/)
- [Gemini 4 Argon: Built to solve your hardest problems — Google](https://blog.google/intl/en-in/products/introducing-gemini-4-argon/)
- 사용자 제공 GeekNews 발췌: 2026-10-14 정식 출시, 2026-10-15 로봇 제어와 시뮬레이션 활용. 기존 가격과 전체 성능표를 다시 검증하지 않아 그때는 문서 전체 검증일을 유지했다.
- [Gemini API Changelog — Google AI for Developers](https://ai.google.dev/gemini-api/docs/changelog) — 2026-10-13 GA 항목, 2026-10-27 확인. 2026-11-16에는 aistudio.google.com/docs/changelog로 옮겨진 주소에서 2026-11-10 Carbon과 2026-11-12 Hydrogen의 GA 항목, Hydrogen의 사고 수준과 Antigravity 기본 모델 지정 확인. 2026-11-21 같은 주소에서 2026-11-18 Neon GA 항목의 사고 수준, 컨텍스트와 long decode 확인
- [Google AI for Developers, Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) — 2026-10-27 할인 기한, 캐시, Batch와 Flex 단가 확인. 2026-11-16에는 aistudio.google.com/docs/pricing으로 옮겨진 주소에서 Carbon, Argon, Hydrogen의 등급별 단가와 기한 확인. 2026-11-21 Neon의 등급별 단가와 Carbon의 기한 재확인
- [Gemini 4 Carbon is now available — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) — 2026-11-10, 제공 경로, 특별가 각주, 토큰 사용량 설명과 공급사 벤치마크 주장
- [Introducing Gemini 4 Hydrogen — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/) — 2026-11-12 게시(11-13 갱신), 위치, 제공 범위, 사고 수준, 발표 수치와 Orchestrator 수치(Terminal-Bench 4.0 표기)
- [Gemini 4 Hydrogen and Orchestrator — Google Antigravity](https://antigravity.google/blog/gemini-4-hydrogen-in-google-antigravity/) — 2026-11-12, Orchestrator의 전환 흐름, 제공 범위와 수치(Terminal-Bench 4.1 표기)
- [Gemini 4 Hydrogen Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gemini-4-hydrogen) — 2026-11-16 열람, 사고 수준별 지수, 출력 토큰과 과업당 비용
- [CursorBench 4.0 — Cursor](https://www.cursor.com/cursorbench) — 2026-11-18 열람, Carbon, Fable 5.2, Opus 5.5의 설정별 점수, 과업당 비용, 단계와 비용 계산 방식
- [AI 신규 모델 대격돌, 구글 카본 vs 클로드 페이블 5.2 — YouTube, 안될공학](https://www.youtube.com/watch?v=ijLTC-d1TMs) — 2026-11-11 공개, 학습 계기. 수치는 위 순위표로 대조했고 영상의 다른 사례는 반영하지 않았다
- [Google, 복잡한 코딩과 연구를 위한 Gemini 4 Carbon 일반 공개 — GeekNews](https://news.hada.io/topic?id=36950) — 학습 계기
- [Gemini 4 Hydrogen - 일상적인 코딩과 에이전트 작업을 위한 빠른 실행 모델 — GeekNews](https://news.hada.io/topic?id=37068) — 학습 계기
- [Google Antigravity에 Orchestrator 추가, 코딩 중 Carbon과 Hydrogen 자동 전환 — GeekNews](https://news.hada.io/topic?id=37077) — 학습 계기
- [Introducing Gemini 4 Neon — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/) — 2026-11-18 게시(11-19 갱신). 2026-11-21 위치, 단가, 사고 수준, 과업당 비용 주장, 제3자 순위, 하네스별 SWE-sweep 점수와 제공 범위 대조
- [Gemini 4 Neon in Google Antigravity — Google Antigravity](https://antigravity.google/blog/gemini-4-neon-in-google-antigravity/) — 2026-11-18, Neon과 Hydrogen을 짝짓는 Orchestrator와 제공 범위
- [Gemini 4 Neon Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gemini-4-neon) — 2026-11-21 두 번 열람, 사고 수준별 지수, 출력 토큰, 과업당 시간과 비용(High는 페이지에 내장된 데이터에서 확인), 출력 속도와 과업당 시간의 계산 방식
- [Language Model API Performance Benchmarking — Artificial Analysis](https://artificialanalysis.ai/methodology/performance-benchmarking) — 2026-11-21 열람, v3.0.0(2026-11-03)의 6시간 주기 측정과 최근 5일 워크로드 평균, 이전 방식(최근 72시간 중앙값) 대조
- [Google AI for Developers, Gemini 4 Neon](https://aistudio.google.com/docs/models/gemini-4-neon) — 2026-11-21 입력과 출력의 통합 한도, 기본 동기 출력 한도와 long decode 확인
- [Gemini 4 Carbon Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gemini-4-carbon) — 2026-11-21 두 번 열람, High의 지수, 출력 토큰, 과업당 시간과 비용, 적용 단가와 출력 속도
- [GPT-6.2 Astra Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gpt-6-2-astra) — 2026-11-21 열람, Max의 지수와 과업당 비용
- [Gemini 4 Neon looks like an Opus 5.5 competitor — micjm](https://micjm.com/blog/gemini-4-neon-looks-like-a-top-model/) — 2026-11-18, Agent Duel 승률 모형과 투영 조건, 출시 당일 OpenRouter 속도 관찰
- [Why is Gemini 4 Carbon taking so long? — Kernel](https://kernel.dev/blog/why-is-gemini-4-carbon-taking-so-long/) — 2026-11 게시, 2026-11-21 버그당 평균 시간과 low 설정의 실패 양상 대조
- [Gemini 4 Neon - 복잡한 코딩과 분석에 추론 성능과 효율을 갖춘 AI 모델 — GeekNews](https://news.hada.io/topic?id=37432) — 학습 계기
- [Gemini 4 Neon, Opus 5.5의 경쟁자가 될 것으로 보임 — GeekNews](https://news.hada.io/topic?id=37456) — 학습 계기
- [Gemini 4 Carbon은 왜 이렇게 오래 걸릴까? — GeekNews](https://news.hada.io/topic?id=37411) — 학습 계기
- [Gemini Enterprise Agent Platform release notes — Google Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes) — 2026-10-13 GA, Cyber Permissive 허용 목록, long decode의 API 버전 제한
- 사용자 제공 알림: 긱뉴스 GeekCast의 오늘의 긱뉴스(2026.10.13~10.17) 영상. 학습 계기이며 영상은 열람하지 않았고, 정식 제공 사실은 위 공식 문서로 대조했다.

## 관련 문서

- [[LLM-Eval-Strategy|LLM 평가 전략]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택]]
- [[Harness-Component-Evaluation|하네스 구성요소 평가]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
- [[Agent-Swarm-Containment|에이전트 군집 격리]]
- [[Benchmark-Coverage-and-Workplace-Performance|벤치마크 평가 범위와 업무 성과]] — Carbon의 느린 실행을 단계당 시간과 단계 수로 나눈 분석
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 단가 기한, 과업당 비용과 순위 차이

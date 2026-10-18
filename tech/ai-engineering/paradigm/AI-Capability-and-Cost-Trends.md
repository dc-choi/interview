---
tags: [ai, llm, benchmark, evaluation, pricing, trend]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Capability and Cost Trends", "AI 능력과 비용 추세", "벤치마크 주장 읽기"]
---

# AI 능력과 비용 추세 읽기

AI가 대회에서 사람을 이겼다, 어려운 시험의 절반을 넘었다, 비용이 97% 떨어졌다는 주장은 모두 특정 부문, 데이터셋, 실행 조건과 지표에서 나온 숫자다. 같은 숫자도 조건을 빼면 다른 뜻이 된다. 이 문서는 능력과 비용 추세를 조건과 함께 읽는 기준을 정리하고, 2026-10-12에 대회 주최 측, 벤치마크 관리 주체, 원 논문, 기업 공식 발표와 Epoch AI, Stanford HAI, METR, OpenRouter, Artificial Analysis 자료로 확인한 사례를 붙인다. 개별 모델의 가격과 가용성은 [[Claude-Opus-5|Claude Opus 5]], [[Gemini-4-Argon|Gemini 4 Argon]], [[LLM-Model-Tiers|LLM 모델 티어 선택]]이 다룬다.

## 1. 벤치마크 점수에 붙여 읽을 조건

- **부문과 순위 방식**: 같은 대회라도 부문마다 배점과 채점 방식이 다르다. 정식 순위인지, 따로 집계하는 시범 경기(exhibition)인지 본다.
- **데이터셋과 버전**: 공개, 반비공개(semi-private), 비공개 셋 가운데 어디서 낸 점수인지, 문항 수와 버전이 같은지 확인한다. 이름이 비슷한 파생 셋의 점수를 원래 셋과 섞지 않는다.
- **실행 조건**: 하네스, 추론 강도, 도구 허용 여부, 채점 모델과 실행 비용을 함께 적는다.
- **점수의 정의**: 정답률인지, 사람 기준선 대비 효율인지, 상대 점수인지 확인한다.
- **검증 범위**: 형식 검증, 독립 재현과 사후 정정이 있었는지 본다.

## 2. 능력 주장의 사례

### 대회

- **바둑**: AlphaGo는 2016년 3월 이세돌 9단에게 4승 1패로 이겼다. 인간 기보 없이 학습한 AlphaGo Zero는 3일간 자가대국으로 학습한 뒤 그 AlphaGo(AlphaGo Lee)를 100대 0으로 이겼다(Nature, 2017).
- **AtCoder World Tour Finals**: 2025년 휴리스틱 부문(10시간, 한 문제)의 정식 순위 1위는 사람이었고, OpenAI 모델은 별도로 집계한 시범 경기 순위에만 들어갔다. 2026년 알고리즘 부문(2026-07-09, 420분)은 5문제 배점 합이 8,300점이므로 8,300점은 만점이다. 이 부문에도 OpenAI의 AI 에이전트가 정식 참가자가 아닌 시범 경기 참가자로 나왔고, AI를 이긴 1위 참가자에게 주는 상이 따로 있었다. 공식 순위표는 로그인이 필요해 이 문서에서는 점수와 순위를 확인하지 않았다. 2026년 휴리스틱 부문(2026-07-07~08)에도 같은 형식의 시범 경기와 AI를 이긴 1위 참가자에게 주는 상이 공지됐다. 2025년 휴리스틱과 2026년 알고리즘은 부문과 채점 방식이 달라 한 부문의 연도별 변화로 비교하지 않는다. 대회 결과 주장은 부문, 시범 경기 여부, 만점 대비 점수를 함께 확인한다.

### 시험형 벤치마크

- **Humanity's Last Exam(HLE)**: 수학, 인문학, 자연과학 등 수십 개 과목의 전문가 문항 2,500개로 2025-04-03 확정됐다(첫 공개 때는 3,000문항). 첫 공개 당시 프런티어 모델의 정확도는 GPT-4o 3.3%에서 o1 9.1%, DeepSeek-R1 9.4%(텍스트 전용 부분집합)까지 모두 한 자릿수였고, 2,500문항 확정본 기준으로도 GPT-4o 2.7%, o1 8.0%, DeepSeek-R1 8.5%(텍스트 전용 부분집합)였다. 2026-10-12 Scale AI 리더보드(2,500문항 공개셋)에서는 GPT-6 Astra가 54.80%로 1위였고, 50%를 넘는 모델은 하나뿐이며 2위는 46.50%였다. Stanford HAI 2026 AI Index는 프런티어 모델의 HLE 점수가 1년 사이 30%p 올랐다고 정리했다.
- **HLE-Diamond**: 2026-09-22 공개된 1,000문항 정제 부분집합이다. 도구 없이(추론 강도 high 기준) 네 모델이 50%를 넘었고, 웹과 코드 도구를 쓰면 GPT-6 Astra가 82.9%였다. 원래 HLE와 다른 셋이므로 점수를 섞지 않는다.
- **ARC-AGI-3**: 2026-03-25 공개된 상호작용 환경 벤치마크로 지시, 규칙, 목표 설명이 없다. 공개 당시 발표는 인간 100%, 프런티어 AI 0.51%였다. 점수는 정답률이 아니라 사람 기준선 대비 행동 효율(RHAE)로, 레벨 점수는 (인간 기준 행동 수 / AI 행동 수)의 제곱에서 출발한다.
- **ARC-AGI-3의 GPT-6 Astra 점수**: 2026-09-03 ARC Prize 발표에서 같은 반비공개(semi-private) 셋이라도 공급자 중립 Standard 하네스의 최고점은 max 추론 62.7%(약 2.6만 달러)였다. 99.9%는 요청 사이에 추론 상태를 보존하는 공급자 전용 Provider Adapter 하네스에 high 추론을 쓴 조건의 값(약 1.9만 달러)이다. 비공개 셋 결과는 없고, ARC Prize는 이 결과를 AGI라고 주장하지 않는다고 밝혔다.

### 연구 결과

- OpenAI는 2026-08-01 내부 모델이 얻은 수학과 이론 컴퓨터과학 결과 10개를 발표하고 Lean 4 형식화를 공개했다. 그중 한 결과는 에르되시 문제 183을, 다른 한 결과는 146과 180을 해결한다고 적는다.
- 2026-10-06에는 원고 722편(결과군 372개)을 공개했다. 다음 날 갱신에서 한 원고의 부호 오류가 그 원고와 이에 의존한 원고 2편의 논증을 무너뜨려 3편을 철회했고, 이와 별도로 원고 14편을 증명 보완, 진술 정정, 가정과 의존 관계 명확화 등으로 고쳤다. 이 갱신 뒤 원고는 719편이며, 원고별 대표 결과(top-line result) 가운데 Lean으로 형식화된 것은 300편, 약 42%다.
- 2025-11 OpenAI 공저 논문은 erdosproblems.com에 미해결로 표시된 문제를 GPT-5로 문헌 검색해, 이미 출판된 해법이 있던 10개 문제를 찾았다고 기록한다. 이 10개는 새 증명이 아니라 기존 해법을 찾아낸 것이다. 같은 논문의 에르되시 문제 절은 미해결이던 848번 문제를 절 저자인 Mehtaab Sawhney가 GPT-5와 함께, erdosproblems.com 댓글로 나온 다른 연구자들의 아이디어와 결합해 해결했다고 적는다.
- Lean 컴파일 통과는 형식 진술에 대한 증명이 맞다는 뜻이다. 형식 진술이 원래 문제를 정확히 옮겼는지는 따로 검토한다.
- 2026-09-11 Terence Tao 블로그에 필즈상 수상자 25명을 첫 서명자로 한 공동 선언 A Severe Misalignment of AI in Mathematics가 실렸다. 선언은 LLM의 수학 능력이 크게 높아졌다고 인정하면서도, AI 기업이 수학 문제 풀이를 벤치마크로 밀어붙이는 흐름이 수학과 수학 공동체에 해롭고 AI 기업과 수학 공동체의 목표가 심각하게 어긋난다고 본다. 획기적인 해법은 강연, 토론과 단순화를 거쳐 공동체가 소화하고 교과서 서술로 이어지는데, 이런 해법은 서둘러 발표돼 제대로 된 원고를 쓸 시간이 남지 않는 경우가 많고 이것이 귀속과 표절에 관한 심각한 의문을 낳는다고 지적한다. AI가 수학 연구와 이해를 강화하고 가속할 잠재력도 인정하며, 수학 공동체, 이 기술을 개발하는 기업과 사회 전반이 이 문제들을 시급히 다뤄야 한다고 촉구한다(2026-10-18 원문 확인).
- 수학 연구 결과 주장은 증명의 정확성과 별도로, 사람이 읽고 검토할 수 있는 원고와 선행 연구 인용, 공동체 검토가 뒤따랐는지 확인한다.

## 3. 비용 하락은 무엇의 가격인지 구분한다

| 지표 | 확인한 수치 | 읽는 법 |
|---|---|---|
| 같은 성능을 내는 가장 싼 모델의 토큰 단가 | Epoch AI(2025-03): 성능 문턱에 따라 연 9배~900배 하락 | 입력과 출력 단가를 3:1로 가중한 토큰당 가격이고 추론 모델은 뺐다. 가장 빠른 하락이 최근 1년에 몰려 있다 |
| 같은 성능에 도달하는 실제 실행 비용 | Epoch AI(2026-09): 2023년 이후 분기 약 47%, 연 13배 하락 | 토큰 단가가 아니라 모델이 실제로 쓴 토큰까지 반영한 벤치마크 실행 비용이다. 그 성능이 처음 최고 기록이 된 직후에는 연 75배, 2년 뒤에는 연 4.7배로 느려진다(다섯 벤치마크 평균). 데이터가 불완전하고 벤치마크 맞춤 학습 가능성이 있다 |
| 특정 성능의 질의 비용 | Stanford HAI 2025 AI Index: GPT-3.5 수준(MMLU 64.8)이 2022-11 100만 토큰당 20달러에서 2024-10 0.07달러로 280배 넘게 하락 | 고정 성능 기준의 과거 구간이다 |
| 토큰 처리 비용 | Google CEO(2025-02-10): 18개월 동안 개발자의 토큰 처리 비용이 97% 하락(100만 토큰당 4달러에서 0.13달러) | 공급자 자체 발표다. 원문은 어떤 모델이나 가격 기준인지 밝히지 않으므로 최상위 모델 가격으로 읽을 근거가 없다 |
| 기업 대표의 전망 | Sam Altman(2025-02-09): 같은 수준의 AI를 쓰는 비용이 12개월마다 약 10배 하락. (2025-06-10): 데이터센터 생산이 자동화되면 지능 비용이 결국 전기 비용 가까이로 수렴할 것 | 공급자의 관찰과 전망으로 읽는다 |

같은 성능의 가격이 내려가는 것과 새 최상위 모델의 단가, 실제 작업에 드는 총비용은 서로 다르다. Epoch AI(2025-03)는 추론 모델이 토큰을 훨씬 많이 생성해 같은 성능에서 토큰당 가격으로 비교하면 오해를 낳는다며 분석에서 뺐고, 평가 비용도 토큰 단가와 비슷하게 하락했다고 적었다. 추론 토큰과 호출 횟수가 늘면 단가가 내려가도 총비용이 늘 수 있으므로 자기 작업의 토큰 사용량으로 계산한다.

### 모델 비교에서 속도와 비용의 측정 단위를 분리한다

부분 검증(2026-10-14): Artificial Analysis의 방법론에서 아래 지표 정의를 확인했다. 기존 대회 결과와 모델별 점수 전체를 다시 검증한 것은 아니므로 `verified_at`은 유지한다.

- **첫 토큰과 첫 답변 토큰**: Time to First Token은 응답의 첫 토큰까지 걸린 시간이다. 추론 토큰을 반환하는 모델에서는 첫 추론 토큰일 수 있다. Time to First Answer Token은 사고 시간을 지난 뒤 첫 답변 토큰이 도착하는 시간이다.
- **출력 속도와 완료 시간**: 초당 출력 토큰 수는 첫 토큰 이후 생성 속도다. 사용자가 답변 전체를 받는 시간에는 입력 처리, 추론과 답변 생성이 모두 들어간다. 빠른 출력만으로 전체 대기 시간이 짧다고 판단하지 않는다.
- **Time per Task는 추정값**: 벤치마크별 답변과 추론 토큰을 답변 출력 속도로 나누고 Intelligence Index의 가중치로 합산한다. 평가 실행 중 직접 잰 완료 시간이 아니며, 속도는 가격과 같은 엔드포인트에서 측정한 10k 입력 워크로드의 중앙값을 사용한다.
- **가중 단가와 과업 비용**: Blended Price는 캐시 적중, 입력, 출력 토큰 비율을 7:2:1로 가정한다. Cost per Task는 실제 소비한 토큰과 단가를 반영한 과업당 가중 평균 비용이다. 같은 단가라도 추론이나 답변이 길면 과업 비용은 커질 수 있다.

단가 순위와 과업당 비용 순위는 뒤집힐 수 있다. 아래 값은 2026-10-18 Artificial Analysis 모델별 페이지(Intelligence Index v4.3.2, 각 모델의 Max 설정)에서 확인했고, 단가는 같은 날 각 제공사의 공식 가격표와 대조했다.

| 모델 | 100만 토큰당 입력, 출력 단가 | 지수 평가에서 생성한 토큰 | 과업당 비용 | 지수 |
|---|---|---|---|---|
| GPT-6 Astra | 10달러, 50달러(입력 272K 토큰 이하) | 6천만 | 3.26달러 | 53 |
| Muse Wonder | 4달러, 20달러 | 1억 3천만 | 4.52달러 | 52 |
| Claude Sonnet 5.5 | 2달러, 10달러 | 4억 2천만 | 5.46달러 | 56 |
| Claude Opus 5.5 | 4달러, 20달러 | 2억 6천만 | 5.98달러 | 58 |

GPT-6 Astra는 단가가 Opus 5.5의 2.5배지만 생성 토큰이 4분의 1에 못 미쳐 네 모델 가운데 과업당 비용이 가장 낮았다. Meta가 2026-10-12 공개한 Muse Wonder는 Opus 5.5와 단가가 같지만 생성 토큰이 절반이라 과업당 비용이 더 낮았다. Sonnet 5.5는 단가가 Opus 5.5의 절반인데도 토큰을 더 많이 써 과업당 비용은 약 9% 낮은 데 그쳤다. 과업당 비용이 가장 높은 Opus 5.5가 지수도 가장 높았으므로 비용과 지수를 함께 본다. 공개 평가 과업의 값이라 추론 설정을 낮추거나 자기 업무의 출력 길이가 다르면 순위가 바뀔 수 있다.

도입 점검 제안: 채팅은 첫 답변과 전체 대기 시간, 긴 작업은 완료율과 작업당 비용을 함께 비교한다. 자기 업무의 캐시 적중률과 출력 길이가 다르면 가중 단가 순위를 그대로 예산에 적용하지 않는다.

## 4. 오픈웨이트 모델과 사용량 점유율

- **토큰과 지출은 다르다**: OpenRouter 자료에서 중국 오픈소스 모델의 주간 토큰 점유율은 2024-11~2025-11 평균 약 13%였다. 2026년 6월 초에는 중국 모델이 토큰 점유율에서 미국 모델을 앞질렀고, 2026-09-14 주에는 토큰의 69%가 중국 연구소 모델, 72%가 오픈웨이트 모델이었다. 원문이 9월 둘째 주라고 적은 주에는 지출의 73%가 클로즈드웨이트 모델에 갔다(2026-01-05 주는 89%). 모두 OpenRouter를 거친 사용량이며 시장 전체 점유율이 아니다. 점유율의 분모와 채널을 읽는 기준은 [[LLM-Market-Landscape|생성형 AI 시장 경쟁 구도]]를 따른다.
- **능력 격차는 지표마다 다르다**: Epoch AI 능력 지수(ECI)로 보면 중국 모델은 2023년 이후 미국 프런티어보다 평균 7개월, 2026년 1월 이후의 최고 오픈웨이트 모델은 프런티어 클로즈드 모델보다 평균 4개월 뒤처졌다. Stanford HAI 2026 AI Index의 Arena 투표 기준으로는 2026년 3월 미국 최고 모델이 중국 최고 모델보다 2.7%, 최고 클로즈드 모델이 최고 오픈 모델보다 3.3% 앞섰다.
- **성능과 가격을 비율로 묶은 요약**: Artificial Analysis는 2026-04-30 오픈웨이트 상위 세 모델(지수 52~54)이 선두 독점 모델(최고 60)과 비슷한 지능을 2분의 1에서 6분의 1 가격에 제공한다고 했고, 2026-10-12 지수(v4.3.2)에서는 오픈웨이트 최고 46, 전체 1위 58이었다. 지수 비율은 성능 비율로 정의된 지표가 아니고 지수 버전이 바뀌면 직접 비교할 수 없다.

## 5. 긴 소프트웨어 과제 수행 능력의 추세

METR는 사람 전문가가 걸리는 시간으로 잰 소프트웨어와 추론 과제를 모델이 50% 확률로 해내는 길이(시간 지평)가 2019~2025년 약 7개월마다 두 배가 됐다고 보고했다. 2026-01 갱신한 Time Horizon 1.1 기준으로 2023년 이후 배가 기간은 131일, 2024년 이후는 89일이다. 2026년 2~3월 공개 프런티어의 50% 시간 지평은 약 12시간(신뢰구간 5~61시간)으로 추정됐지만, 이 과제 세트로는 16시간이 넘는 지평을 믿을 만하게 잴 수 없다. Time Horizon 1.1(2026-01) 기준으로 8시간 이상 과제 31개 가운데 사람 기준 시간을 실측한 것은 5개이고 나머지는 추정치다. METR는 신뢰구간이 여전히 매우 넓어 긴 과제를 늘리고 있다고 적었다.

## 6. 계획에 적용하기

- **지금의 한계를 영구 제약으로 두지 않는다**: 고정 성능의 가격과 소프트웨어 과제의 시간 지평은 빠르게 바뀌어 왔다. 모델을 바꿀 수 있게 호출 계층을 분리하고, 교체 때마다 같은 평가 세트로 다시 잰다([[Eval-Model-Drift-Monitoring|모델 드리프트 모니터링]], [[LLM-Eval-Strategy|LLM 평가 전략]]).
- **추세를 보장으로 쓰지 않는다**: 위 수치는 측정 조건이 있는 과거 데이터이거나 공급자의 전망이다. Epoch AI의 2025-03 분석도 가장 빠른 하락이 최근 1년에 몰려 있어 그 속도가 이어질지는 불확실하다고 적는다. 일정과 예산은 현재 쓸 수 있는 모델로 성립하게 세우고, 개선은 재평가 시점의 선택지로 둔다.
- **공개 벤치마크와 자기 업무를 구분한다**: 벤치마크 순위가 자기 업무의 성공률을 대신하지 않는다. 업무 표본으로 만든 골든셋, 하네스와 비용 한도를 같게 두고 비교한다.

## 7. 체크포인트

- AI가 대회나 시험에서 사람을 넘었다는 주장을 들으면 부문, 셋, 하네스, 추론 강도, 도구, 비용 가운데 무엇을 먼저 확인하는가
- 같은 성능의 가격 하락, 새 최상위 모델의 단가, 자기 작업의 총비용이 왜 다른지 설명할 수 있는가
- 오픈웨이트 모델의 점유율을 토큰 기준과 지출 기준으로 나눠 말할 수 있는가

## 출처

- [AlphaGo — Google DeepMind](https://deepmind.google/research/alphago/)
- [Mastering the game of Go without human knowledge — Nature, David Silver 외](https://www.nature.com/articles/nature24270) — 2017
- [AlphaGo Zero: Starting from scratch — Google DeepMind](https://deepmind.google/blog/alphago-zero-starting-from-scratch/) — 2017-10-18
- [World Tour Finals 2025 Heuristic — AtCoder](https://atcoder.jp/contests/awtf2025heuristic)
- [World Tour Finals 2025 Heuristic Editorial — AtCoder](https://atcoder.jp/contests/awtf2025heuristic/editorial)
- [World Tour Finals 2026 Algorithm — AtCoder](https://atcoder.jp/contests/awtf2026algo)
- [World Tour Finals 2026 Heuristic — AtCoder](https://atcoder.jp/contests/awtf2026heuristic)
- [Humanity's Last Exam — arXiv, Center for AI Safety, Scale AI 외](https://arxiv.org/abs/2501.14249) — v1과 최신 v11 대조
- [Humanity's Last Exam — Center for AI Safety, Scale AI](https://lastexam.ai/) — 2,500문항 확정과 파생 셋 공지
- [Humanity's Last Exam — Scale Labs Leaderboard](https://labs.scale.com/leaderboard/humanitys_last_exam) — 2026-10-12 열람
- [HLE-Diamond — Center for AI Safety, Scale AI](https://agi.safe.ai/blog/hle-diamond) — 2026-09-22
- [Announcing ARC-AGI-3 — ARC Prize](https://arcprize.org/blog/arc-agi-3-launch) — 2026-03-25
- [ARC Prize, ARC-AGI-3 Scoring Methodology](https://docs.arcprize.org/methodology)
- [OpenAI's GPT-6 Astra on ARC-AGI-3 — ARC Prize, Greg Kamradt](https://arcprize.org/blog/astra) — 2026-09-03
- [Ten Advances in Mathematics and Theoretical Computer Science — OpenAI](https://cdn.openai.com/pdf/ten-proofs-oai.pdf) — 2026-08-01, 2026-08-06 갱신
- [ten-proofs — GitHub, OpenAI](https://github.com/openai/ten-proofs)
- [math — GitHub, OpenAI](https://github.com/openai/math) — 2026-10-06 첫 공개(원고 722편), 현재 원고 수와 형식화 비율
- [math history — GitHub, OpenAI](https://github.com/openai/math/blob/main/history.md) — 2026-10-07 철회와 수정
- [A Severe Misalignment of AI in Mathematics — Terence Tao 블로그, 필즈상 수상자 공동 선언](https://terrytao.wordpress.com/2026/09/11/a-severe-misalignment-of-ai-in-mathematics/) — 2026-09-11
- [Early science acceleration experiments with GPT-5 — OpenAI, Sébastien Bubeck 외](https://cdn.openai.com/pdf/4a25f921-e4e0-479a-9b38-5367b47e8fd0/early-science-acceleration-experiments-with-gpt-5.pdf) — 2025-11-20
- [The AI Action Summit: A golden age of innovation — Google, Sundar Pichai](https://blog.google/innovation-and-ai/products/sundar-pichai-ai-action-summit/) — 2025-02-10
- [Three Observations — Sam Altman](https://blog.samaltman.com/three-observations) — 2025-02-09
- [The Gentle Singularity — Sam Altman](https://blog.samaltman.com/the-gentle-singularity) — 2025-06-10
- [LLM inference prices have fallen rapidly but unequally across tasks — Epoch AI](https://epoch.ai/data-insights/llm-inference-price-trends) — 2025-03-12
- [The plunging price of thought — Epoch AI, Luke Emberson, David Roodman](https://epoch.ai/publications/the-plunging-price-of-thought) — 2026-09-22
- [2025 AI Index Report, Research and Development — Stanford HAI](https://hai.stanford.edu/ai-index/2025-ai-index-report/research-and-development)
- [2026 AI Index Report, Technical Performance — Stanford HAI](https://hai.stanford.edu/ai-index/2026-ai-index-report/technical-performance)
- [State of AI: An Empirical 100 Trillion Token Study with OpenRouter — a16z, OpenRouter](https://openrouter.ai/state-of-ai) — 2025-12
- [DeepSeek V4 Is Earning Agentic Token Share — OpenRouter](https://openrouter.ai/blog/insights/deepseek-v4-adoption/) — 2026-06-30
- [Inferred 01: The Token State of Play — OpenRouter](https://openrouter.ai/data/newsletter/the-token-state-of-play) — 2026-09-22
- [Recent open weights model launches — Artificial Analysis](https://artificialanalysis.ai/articles/recent-open-weights-model-launches) — 2026-04-30
- [Comparison of Models: Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models) — 2026-10-12 열람
- [Artificial Analysis, Artificial Analysis Benchmarking Methodology](https://artificialanalysis.ai/methodology) — 2026-10-14 응답 시간, 과업 시간 추정과 비용 지표 정의 대조
- [GPT-6 Astra (Max) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gpt-6-astra) — 2026-10-18 열람
- [Muse Wonder (Max) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/muse-wonder) — 2026-10-18 열람
- [Claude Sonnet 5.5 (Max, Default Fallback) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/claude-sonnet-5-5) — 2026-10-18 열람
- [Claude Opus 5.5 (Max, Default Fallback) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/claude-opus-5-5) — 2026-10-18 열람
- [Anthropic Platform Docs, Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — 2026-10-18 Opus 5.5, Sonnet 5.5 단가 대조
- [OpenAI API, Pricing](https://developers.openai.com/api/docs/pricing) — 2026-10-18 GPT-6 Astra 단가 대조
- [Meta Model API, Pricing and rate limits](https://dev.meta.ai/docs/pricing-rate-limits) — 2026-10-18 Muse Wonder 단가 대조
- [Muse Wonder: A Frontier Model For Personal & Professional AI Agents — Meta AI Research](https://research.meta.ai/blog/muse-wonder) — 2026-10-12
- [Chinese AI models have lagged the US frontier by 7 months on average since 2023 — Epoch AI](https://epoch.ai/data-insights/us-vs-china-eci) — 2026-01-02
- [Open models lag state-of-the-art closed models by 4 months — Epoch AI](https://epoch.ai/data-insights/open-closed-eci-gap) — 2026-05-29
- [Measuring AI Ability to Complete Long Software Tasks — METR](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) — 2025-03-19
- [Time Horizon 1.1 — METR](https://metr.org/blog/2026-1-29-time-horizon-1-1/) — 2026-01-29
- [Frontier Risk Report (February to March 2026) — METR](https://metr.org/blog/2026-05-19-frontier-risk-report/) — 2026-05-19

## 관련 문서

- [[Claude-Opus-5|Claude Opus 5]] — 모델 발표와 평가 조건
- [[Gemini-4-Argon|Gemini 4 Argon]] — 발표 가격과 벤치마크의 비교 조건
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 모델 크기와 단가
- [[LLM-Eval-Strategy|LLM 평가 전략]] — 자기 업무의 평가 세트
- [[Eval-Model-Drift-Monitoring|모델 드리프트 모니터링]] — 모델 교체 뒤 재평가
- [[AX-Transformation|AX 조직 전환]] — 조직의 AI 도입 판단
- [[Expertise-Formation-AI|AI 시대 전문성 형성]] — 결과 산출과 이해, 다음 세대 전수의 구분
- [[LLM-Market-Landscape|생성형 AI 시장 경쟁 구도]] — 점유율의 분모와 채널
- [[paradigm|AI 패러다임, 모델]]

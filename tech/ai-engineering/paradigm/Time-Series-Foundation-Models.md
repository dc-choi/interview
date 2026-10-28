---
tags: [ai, time-series, forecasting, foundation-model, probabilistic-forecast]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Time Series Foundation Models", "시계열 파운데이션 모델", "TSFM", "Zero-shot Forecasting", "Timestral", "Pinball Loss"]
---

# 시계열 파운데이션 모델과 분위수 예측

시계열 파운데이션 모델은 많은 시계열로 미리 학습해 두고, 새 시계열을 그 데이터로 다시 학습하지 않은 채(zero-shot) 바로 예측하는 모델이다. 예측값 하나보다 미래 분포를 분위수로 내는 경우가 많아, 결과를 쓰는 쪽도 점 하나가 아니라 범위로 판단해야 한다. 예측 시점과 외부 변수를 다루는 평가 설계 일반은 [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]를 따른다. 이 문서는 2026-10-27에 Chronos, TimesFM, GIFT-Eval, fev-bench 논문, Forecasting: Principles and Practice(3판)와 Mistral의 Timestral 공식 발표, 모델 카드, 라이선스와 저장소를 대조한 기준이다.

## 무엇을 미리 학습하는가

- **값을 토큰처럼 다룬다**: Chronos(2024)는 값을 스케일링하고 양자화해 고정 어휘의 토큰으로 바꾼 뒤 T5 계열 언어 모델 구조를 교차 엔트로피로 학습했다. 공개 데이터에 가우시안 프로세스로 만든 합성 데이터를 더했다.
- **연속 구간을 묶어 넣는다**: TimesFM은 연속된 시점을 패치로 묶어 decoder-only 어텐션 모델에 넣는 구조다. Timestral은 32개 시점을 한 패치로 묶어 과거 최대 1,024패치(32,768 시점)를 받는다.
- **합성 데이터의 비중**: Timestral 발표는 사전학습 데이터 대부분이 추세, 계절성과 노이즈로 만든 단변량 과정이고, 이를 다변량으로 묶는 합성기를 썼으며, 사후 학습에 실제와 합성 데이터를 섞었다고 밝힌다. 실제 데이터의 출처는 밝히지 않는다.

## 출력: 분위수와 예측 구간

- 분위수 q의 예측값은 실제값이 그 값 이하일 확률이 q가 되도록 고른 값이다. Timestral은 시점마다 0.01, 0.05부터 0.05 간격으로 0.95까지, 그리고 0.99를 더한 21개 분위수를 낸다.
- 0.1과 0.9 분위수 사이는 명목상 80% 예측 구간이다. 실제로 관측값의 약 80%가 그 안에 들어오는지(보정)는 자기 데이터의 백테스트로 확인한다.
- 중앙값(0.5 분위수)을 점 예측으로 쓸 수 있지만, 재고와 인력처럼 부족과 과잉의 비용이 다르면 그 비대칭에 맞는 분위수를 기준으로 삼는다(적용 제안).
- **긴 예측 거리**: Timestral은 한 번의 순전파로 최대 1,024 시점을 내고, 더 먼 미래는 블록마다 중앙값 예측을 문맥에 붙여 다음 블록을 예측한다. 뒤 블록은 앞 블록의 분포 전체가 아니라 중앙값 경로 하나를 조건으로 삼으므로, 먼 구간의 분위수 폭이 누적 불확실성을 모두 담는다고 단정하지 않는다(이 문서의 판단).

## 학습과 평가에 쓰는 점수

- **분위수 점수(pinball loss)**: FPP3는 관측값 y와 분위수 예측 f에 대해 y < f면 2(1−p)(f−y), y ≥ f면 2p(y−f)로 정의한다. p가 0.5보다 크면 관측값이 예측보다 클 때 더 무겁게 벌하고, p = 0.5면 절대오차와 같다. fev-bench의 분위수 손실도 같은 2를 붙이지만 앞의 2를 빼고 정의하는 구현도 있으므로, 다른 자료의 값과 비교할 때 정의를 맞춘다. 분위수 예측값과 wQL 같은 손실 지표를 섞어 읽지 않는 기준은 [[Time-Series-Forecast-Evaluation#분위수 예측과 분위수 손실을 구분한다|분위수 예측과 분위수 손실]]을 따른다.
- **CRPS**: 모든 p에 대해 분위수 점수를 평균한 값으로, 예측 분포 전체를 평가한다. Timestral 발표는 21개 분위수의 pinball loss를 CRPS의 이산 근사로 학습 목적함수에 썼다고 밝힌다.
- **척도 없는 점수**: MASE는 테스트 오차를 학습 구간의 (계절) 나이브 1단계 오차 평균으로 나눈 값이며, 1보다 작으면 그 나이브 예측보다 낫다. fev-bench의 주 확률 지표인 SQL(scaled quantile loss)은 0.1부터 0.9까지 아홉 개 분위수의 손실을 같은 계절 나이브 오차로 나눈, MASE의 확장이다.
- **여러 과제의 집계**: fev-bench는 과제마다 계절 나이브 대비 상대 오차를 구해 0.01~100 범위로 자르고, 그 기하평균을 1에서 뺀 값을 skill score로 쓴다. 1이면 완벽한 예측, 0이면 기준선과 같고, 음수면 기준선보다 나쁘다. 과제별 승패로는 평균 win rate를 낸다. 지표와 집계 방식이 다르면 같은 모델의 순위도 달라질 수 있으므로 점수 이름과 집계를 함께 적는다.

## 공개 벤치마크의 누출과 자기 평가

- **사전학습 데이터와 평가 데이터의 겹침**: GIFT-Eval(23개 데이터셋, 약 14.4만 시계열)은 평가 데이터와 겹치지 않는 사전학습 데이터(약 2,300억 데이터 포인트)를 함께 공개했다. fev-bench는 사전학습 모델 제출자가 모델과 과제 쌍마다 그 과제 데이터셋을 같은 주기로 일부라도 학습에 썼는지 신고하게 하고(다른 주기로 리샘플링한 변형은 누출로 보지 않는다), 겹친다고 신고한 과제는 제출 결과를 버리고 Chronos-Bolt(Base) 결과로 대체한다. 논문은 자기 신고에 기대는 실용적 장치이며 더 미묘한 누출은 찾기 어렵다고 인정한다.
- **공급사 보고**: Timestral 발표는 데이터를 완전히 통제해 백테스트한 데이터를 사전학습에서 보지 않았다고 밝히고, 209M 모델이 GIFT-Eval(GMean MASE, GMean WQL), TIME(GMean MASE, GMean CRPS), fev-bench(SQL skill score)의 다섯 지표 모두에서 사전학습 zero-shot 모델 가운데 1위였다고 보고한다. 결과를 GIFT-Eval과 TIME 리더보드에 제출했다고 하지만, 이 문서에서는 리더보드 순위를 열람하지 못했다.
- **자기 데이터로 다시 잰다**: 공개 벤치마크의 예측 거리, 관측 주기와 공변량 구성은 자기 업무와 다르다. 자기 시계열에서 rolling origin 백테스트로 계절 나이브와 기존 모델을 같은 조건으로 비교한다([[Time-Series-Forecast-Evaluation|시계열 예측 평가]]).

## 공변량과 다변량

- Timestral은 과거에만 관측한 공변량(past-only), 미래값을 미리 아는 공변량(known-future), 범주형 공변량을 받고 다변량 대상을 함께 예측한다. 모델 카드는 범주형 공변량을 target encoding한다고 적는다. 발표는 각 시계열에 대상, 과거 전용 공변량, 미래 공변량 역할을 주는 공변량 인식 어텐션을 쓴다고 설명한다.
- 날씨 예보나 생산 계획을 미래 공변량으로 넣을 때는 예측 시점에 실제로 알 수 있던 값을 넣는다. 나중에 관측한 실제값을 넣으면 사후 조건부 평가가 된다([[Time-Series-Forecast-Evaluation#외부 변수의 미래값을 구분한다|사전 예측과 사후 조건부 평가]]).

## 사례: Timestral 1.0 (2026-10-15 공개)

| 항목 | 2026-10-27 확인 내용 |
|---|---|
| 크기 | 5M, 28M, 123M, 209M. 같은 구조와 학습 절차 |
| 입출력 | 과거 최대 32,768 시점, 한 번에 최대 1,024 시점, 21개 분위수. 사전학습 문맥 8,192에서 사후 학습 때 4배로 늘림 |
| 공급사 측정 속도 | 8스레드 서버 CPU, 15분 간격 3주 이력으로 하루 앞 예측에 5M 10ms, 209M 140ms. 28M은 209M보다 5배 빠르고, 123M은 209M 점수의 0.2% 이내를 4분의 3 지연으로 낸다고 보고 |
| 공급사 비교 주장 | 28M이 약 4배 큰 Chronos-2를 GIFT-Eval과 TIME에서 앞선다고 보고 |
| 가중치 라이선스 | Modified MIT. 회사(또는 고용주)의 직전 달 전 세계 연결 월매출이 2천만 달러를 넘으면 이 라이선스로 어떤 권리도 행사할 수 없고, 이 제한은 파생물, 수정물과 결합 저작물에도 적용된다. 해당 조직은 Mistral에 상업 라이선스를 문의하거나 호스팅 서비스를 쓸 수 있다 |
| 코드 | GitHub 저장소 Apache-2.0(2026-10-15 생성) |
| 상태 | Mistral 문서는 209M을 Public Preview로 표시하고, 모델 카드는 기술 보고서를 준비 중으로 안내한다 |

속도와 순위는 공급사가 보고한 값이며 이 문서에서 재현하지 않았다. 매출 기준이 있는 가중치 라이선스를 다른 공개 모델과 함께 읽는 기준은 [[Model-Release-Claims#라이선스와 제공 상태는 발표 문구와 따로 확인한다|모델 발표 수치 읽기]]에 둔다.

## 체크포인트

- 분위수 출력을 점 예측 하나로 줄이지 않고 업무의 오차 비용에 맞는 분위수를 고르는가
- 공개 벤치마크 점수의 지표, 집계 방식과 누출 처리 규칙을 확인했는가
- 블록 단위로 이어 붙인 먼 예측의 불확실성을 백테스트로 따로 확인했는가
- 매출 기준이 붙은 가중치 라이선스를 파생물까지 포함해 검토했는가

## 출처

- [Chronos: Learning the Language of Time Series — arXiv, Abdul Fatir Ansari 외](https://arxiv.org/abs/2403.07815) — 스케일링과 양자화, T5 구조, 합성 데이터
- [A decoder-only foundation model for time-series forecasting — arXiv, Abhimanyu Das 외](https://arxiv.org/abs/2310.10688) — TimesFM, 패치 기반 decoder 구조와 zero-shot 주장
- [GIFT-Eval: A Benchmark For General Time Series Forecasting Model Evaluation — arXiv, Taha Aksu 외](https://arxiv.org/abs/2410.10393) — 구성 규모와 누출 없는 사전학습 데이터
- [fev-bench: A Realistic Benchmark for Time Series Forecasting — arXiv](https://arxiv.org/abs/2509.26468) — v4(2026-06-30) 본문의 SQL, skill score, win rate 정의와 누출 신고 규칙(v2와 같은 정의)
- [Forecasting: Principles and Practice (3rd ed), Evaluating distributional forecast accuracy — OTexts, Rob J Hyndman, George Athanasopoulos](https://otexts.com/fpp3/distaccuracy.html) — 분위수 점수, CRPS, skill score
- [Forecasting: Principles and Practice (3rd ed), Evaluating point forecast accuracy — OTexts, Rob J Hyndman, George Athanasopoulos](https://otexts.com/fpp3/accuracy.html) — scaled error와 MASE
- [Timestral — Mistral AI](https://mistral.ai/news/timestral/) — 2026-10-15, 크기, 학습 데이터, 목적함수, 벤치마크 보고와 CPU 지연
- [Mistral Docs, Timestral 1.0 209M](https://docs.mistral.ai/models/timestral-1-0-209m.md) — Public Preview 표시
- [mistralai/Timestral-209M — Hugging Face](https://huggingface.co/mistralai/Timestral-209M) — 분위수 목록, 패치 크기, 예측 거리와 블록 예측, 공변량
- [Timestral-209M LICENSE — Hugging Face](https://huggingface.co/mistralai/Timestral-209M/blob/main/LICENSE) — 매출 기준 제한과 파생물 적용
- [timestral — GitHub, Mistral AI](https://github.com/mistralai/timestral) — 저장소 라이선스 Apache-2.0
- [Timestral - Mistral이 공개한 시계열 파운데이션 모델 — GeekNews](https://news.hada.io/topic?id=35642) — 학습 계기, 수치는 위 공식 자료로 대조

## 관련 문서

- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]] — 예측 시점, 외부 변수와 rolling origin 평가
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 공급사 보고와 라이선스 조건
- [[LLM-Generation-Mechanics|LLM 동작 원리]] — 토큰화와 트랜스포머를 시계열에 옮긴 출발점
- [[paradigm|AI 패러다임, 모델]]

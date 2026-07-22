---
tags: [architecture, recommendation-system, industry-case-study, media, personalization]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Media Cases", "추천 시스템 미디어 사례"]
---

# 미디어 추천 시스템 산업 사례

Netflix, YouTube, Spotify는 모두 미디어를 추천하지만 최적화 단위가 다르다. Netflix는 화면 전체와 장기 만족, YouTube는 거대한 동영상 집합을 줄이는 funnel, Spotify 연구는 장기 취향과 현재 청취 세션의 분리를 보여 준다. 공개 연도와 제품 표면이 다르므로 하나의 최신 공통 구조로 합치지 않는다.

## 전체 비교

| 사례 | 공개 범위 | Pipeline 관점 | 대표 목적 | 직접 확인되지 않는 것 |
|---|---|---|---|---|
| Netflix | 2015년 homepage 중심의 전체론, 2013년 계산 구조 | 특화 ranker와 page generation | 장기 engagement와 retention | 현재 전체 topology와 latency |
| YouTube | 2016년 mobile Home, 2019년 Watch Next | Candidate generation과 multi-objective ranking | Watch probability, expected watch time와 여러 목적 | 현재 Home, Watch Next, Shorts의 전체 구조 |
| Spotify | 2020년 CoSeRNN 연구, 2023년 playlist sequencing | 다음 session embedding과 목록 순서 | 현재 맥락의 track과 session 소비 | CoSeRNN production 배포, 현재 전체 ranker |

## Netflix: 목록보다 화면을 추천한다

### 여러 문제를 분리한 portfolio

2015년 공개 논문은 Netflix 추천을 단일 점수 함수가 아니라 서로 다른 목적을 가진 알고리즘과 화면 조합으로 설명한다.

- Personalized Video Ranker는 넓은 catalog를 회원별로 정렬한다.
- Top-N은 개인 취향과 전반적 인기도를 함께 사용해 강한 추천을 만든다.
- Trending Now는 짧은 시간에 생긴 지역과 시간대별 관심 변화를 찾는다.
- Continue Watching은 시청을 이어 갈 가능성과 다음 episode를 다룬다.
- Video-video similarity는 현재 작품과 관련된 탐색 경로를 만든다.
- Page generation은 어떤 row를 어느 위치에 놓을지 결정한다.
- Search는 입력 query가 불완전하거나 작품이 없을 때도 회원 의도에 맞는 결과를 찾는다.

같은 작품이라도 Continue Watching, 비슷한 작품, 특정 장르 row에서 의미가 다르다. 후보 source와 row 목적을 보존하지 않고 하나의 global score로만 합치면 화면이 중복되거나 탐색 의도가 사라질 수 있다.

### 계산 시점의 분리

2013년 공개 아키텍처는 계산을 세 경로로 구분한다.

```text
Offline   : 대량의 과거 data로 미리 계산
Nearline  : 최신 event가 도착한 뒤 비동기로 갱신
Online    : 현재 request와 context로 즉시 계산
```

무거운 결과는 미리 만들고 요청 시 회원 context와 조합한다. Online 계산이 실패하거나 늦을 때는 precomputed result를 fallback으로 사용할 수 있어야 한다. 이 원칙은 유효하지만 당시 stack 이름과 규모를 현재 Netflix의 그대로인 명세로 보면 안 된다.

### 평가 계약

Offline 평가는 positive engagement를 재현하는 candidate metric과 model 비교에 사용된다. 그러나 공개 논문은 offline 개선이 A/B 결과를 잘 예측하지 못할 수 있다고 경고한다.

당시 online 실험은 회원을 무작위 cell에 배정하고 일관된 경험을 유지하며 local interaction, 전체 engagement와 retention을 함께 관찰했다. 논문이 언급한 2개월에서 6개월의 실험 기간은 2015년 Netflix의 사례이지 모든 추천 실험의 권장 기간이 아니다.

CTR만 높아도 화면 전체 소비가 한 row로 쏠리거나 장기 만족이 낮아질 수 있다. 따라서 row metric, page-level metric과 장기 guardrail을 분리한다.

### 이후 방향과 근거 경계

2025년 Netflix 공개 글은 여러 특화 모델에서 중복 학습하던 긴 상호작용 이력을 하나의 recommendation foundation model로 학습하고 downstream task에서 embedding을 재사용하는 방향을 설명한다. 이는 2015년 portfolio가 그대로 폐기됐다는 뜻도, 현재 모든 surface가 하나의 모델로 통합됐다는 뜻도 아니다.

공개 자료만으로 현재 요청별 latency budget, 후보 수, cache topology와 model별 online traffic 비율은 확인할 수 없다.

## YouTube: 큰 catalog를 줄이는 2단계 funnel

### Candidate generation

2016년 공개 시스템은 mobile YouTube Home을 다음처럼 나눈다.

```text
수백만 video
  -> candidate generation: 수백 개
  -> ranking: 정밀 score
  -> 최종 표시
```

Candidate model은 사용자의 watch history와 search history, 지역과 기기 같은 context를 입력으로 사용한다. 학습 task는 특정 시점 이전의 행동으로 이후에 시청할 video를 맞히는 extreme multiclass classification이다.

- 논문은 사용자가 video를 완료한 watch를 positive example로 표현하고 그 video를 target class로 삼아 이후의 watch를 예측한다. 다만 완료를 판정하는 수치 threshold는 공개하지 않는다.
- 추천에서 발생한 watch만이 아니라 외부 embed를 포함한 전체 YouTube watch로 example을 만들어 기존 노출 정책에 덜 종속되게 한다.
- 매우 큰 class softmax는 sampled softmax로 학습한다.
- 많은 활동을 한 사용자가 dataset을 지배하지 않도록 사용자별 example 수를 제한한다.
- 무작위 holdout 대신 과거 시점 feature로 미래 watch를 예측해 temporal leakage를 줄인다.
- Serving에서는 마지막 hidden layer를 user embedding처럼 사용해 approximate nearest-neighbor search로 후보를 찾는다.

첫 단계에서 제외된 video는 ranker가 복구할 수 없다. 그래서 final precision만 보고 candidate source를 제거하지 말고 source별 recall, freshness와 coverage를 관찰한다.

### Ranking과 label

Ranker는 노출된 candidate에 대해 user와 video feature, candidate source와 candidate model score 같은 정보를 사용한다. 논문의 학습 data는 클릭된 impression을 positive, 노출됐지만 클릭되지 않은 impression을 negative로 둔다.

Positive example의 weight를 관측 watch time으로 주는 weighted logistic regression을 사용한다. 이 설정에서 모델 odds는 impression당 expected watch time에 가까운 값을 학습한다. 따라서 candidate generation의 next-watch classification과 ranking의 watch-time-weighted objective는 같은 label이 아니다.

논문의 `example age`는 video upload 이후 경과 시간이 아니라 학습 예제 시점과 training window 끝의 차이인 `t_max - t_N`이다. Serving에서는 이 값을 0에 가깝게 두어 학습 기간에 변한 인기도 분포를 모델이 보정하도록 한다. 콘텐츠 자체의 나이나 신규 video 여부를 직접 나타내는 feature로 해석하면 안 되며, 이 장치도 품질, 안전, 다양성 정책을 대신하지 않는다.

### 평가와 근거 경계

Offline holdout은 model iteration에 쓰고 최종 효과는 live A/B로 확인한다. Click만 최적화하면 짧거나 낚시성인 video가 유리할 수 있어 당시 Home ranker는 watch time을 더 직접적인 engagement 신호로 사용했다.

이 논문은 2016년 mobile Home 사례다. 현재 YouTube Home, Watch Next, Search와 Shorts가 동일한 후보 수, feature, objective를 쓴다고 일반화할 수 없고, 현재 YouTube가 watch time 하나만 최적화한다는 근거도 아니다.

### 2019년 Watch Next는 별도 multi-objective 사례다

2019년 공개 논문은 다음에 볼 동영상을 정하는 ranker에서 서로 경쟁할 수 있는 여러 목적을 함께 학습한다. Multi-gate Mixture-of-Experts로 task별 공유 정도를 조절하고, user feedback에 포함된 selection bias는 Wide & Deep 구조로 완화한다.

이는 2016년 Home candidate model의 단순 후속 version이 아니라 다른 제품 표면과 문제 설정이다. 공개 abstract만으로 각 task label, 최종 결합식, 현재 serving topology를 단정하지 않는다.

## Spotify: 장기 취향과 다음 세션 맥락

### CoSeRNN이 푸는 문제

같은 사용자도 아침의 mobile 재생, 저녁의 speaker 재생처럼 시간과 기기, 진입 경로에 따라 다음에 들을 음악이 달라진다. CoSeRNN 연구는 과거 session으로 만든 장기 user representation에 현재 context와 sequence가 만드는 offset을 더해 다음 session embedding을 예측한다.

```text
장기 청취 history -> long-term user vector ----+
현재 시간 / 요일 / 기기와 직전 session ------+-> next-session vector
```

연구에서는 track을 playlist 기반 CBOW로 학습한 고정 40차원 공간에 놓고, session은 20분 이상 비활동이면 나눈다. 각 session은 재생 track embedding의 평균으로 표현하며 played와 skipped track, stream source, 시간 간격을 sequence input에 포함한다.

### 평가가 증명하는 범위

Dataset은 2019년 4월에서 5월 사이 약 20만 Premium 사용자의 log이며 chronological split을 사용했다. 실제 다음 session의 track과 가까운 user embedding을 만드는지를 offline retrieval metric으로 비교한다.

Offline track-ranking에서는 이전 session 전체에서 가장 최근에 들은 distinct track K개만 후보로 둔다. 전체 Spotify catalog의 production candidate generation, ANN index 구성, 요청 latency를 증명하지 않는다. 또한 공개 evidence에는 production 배포나 A/B lift가 없다.

CoSeRNN은 다음 session이 시작되기 전에 context를 이용하려는 representation 연구다. 현재 session에서 행동이 쌓인 뒤 다음 곡을 순서화하는 문제, playlist continuation과도 구분한다.

### 2023년 playlist sequencing은 목록 내부 순서를 다룬다

개별 track relevance로 만든 목록도 어떤 곡을 앞뒤에 두는지에 따라 session 소비가 달라질 수 있다. Spotify 연구는 position-aware preference와 인접 곡 사이의 local-sequential preference를 분리하고, 예상 전체 소비를 최대화하도록 목록 순서를 최적화했다.

공식 공개 자료는 offline과 off-policy 평가 뒤 80개국 700만 사용자의 무작위 online 실험에서 non-sequential baseline 대비 session당 완료한 곡이 2.52% 늘고 skip rate는 2.73% 줄었다고 보고한다. 현재 production 적용 범위는 공개하지 않았으므로, 이 결과를 Spotify 전체 추천 개선율로 재사용하지 않는다.

### 별도의 공개 benchmark

Spotify가 공개한 RecSys Challenge 2018은 Million Playlist Dataset으로 automatic playlist continuation을 비교한 학술 benchmark다. 실제 Spotify production ranker를 공개한 자료가 아니며, playlist continuation 성능을 session recommendation 전체의 근거로 사용하면 안 된다.

## 도메인에 전이할 때

| 설계 질문 | 먼저 볼 사례 | 전이할 원칙 |
|---|---|---|
| 여러 row와 surface를 어떻게 조합하는가 | Netflix | Ranker metric과 page-level utility를 분리한다 |
| 매우 큰 catalog에서 어떻게 줄이는가 | YouTube | Retrieval recall과 ranking objective를 따로 검증한다 |
| 장기 취향과 현재 의도를 어떻게 나누는가 | Spotify | Stable preference와 session context를 별도 feature로 둔다 |
| Offline 개선을 어디까지 믿는가 | 세 사례 모두 | Live outcome과 장기 guardrail 없이는 제품 효과를 단정하지 않는다 |

OTT에 적용할 때 법적, 연령과 안전 제약은 모든 후보 경로에서 지키고, 현재 가용성과 구독은 [[Recommendation-System-Eligibility-Availability|surface 계약]]에 따라 retrieval pushdown과 최종 재검사를 조합한다. 즉시 시청 화면과 전체 발견 화면에 같은 hard filter를 적용하지 않으며, 작품 relevance와 화면 편성 utility를 분리한다. 공개 기업 구조보다 자신의 catalog 계약, impression log와 latency budget이 우선이다.

## 관련 문서

- [[Recommendation-System-Industry-Case-Studies|추천 시스템 산업 사례 지도]]
- [[Recommendation-System-OTT-Aggregator-Design-Proposal|OTT 통합 서비스 추천 시스템 초기 설계안]]
- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Ranking-Reranking|랭킹과 재랭킹]]
- [[Recommendation-System-Eligibility-Availability|자격 조건과 가용성]]
- [[Recommendation-System-Evaluation-Experimentation|평가와 실험]]

## 출처

- [The Netflix Recommender System: Algorithms, Business Value, and Innovation - ACM](https://doi.org/10.1145/2843948)
- [System Architectures for Personalization and Recommendation - Netflix Technology Blog](https://netflixtechblog.com/system-architectures-for-personalization-and-recommendation-e081aa94b5d8)
- [Foundation Model for Personalized Recommendation - Netflix Technology Blog](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39)
- [Deep Neural Networks for YouTube Recommendations - Google Research](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/)
- [Deep Neural Networks for YouTube Recommendations - ACM](https://doi.org/10.1145/2959100.2959190)
- [Recommending What Video to Watch Next: A Multitask Ranking System - Google Research](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/)
- [Contextual and Sequential User Embeddings for Music Recommendation - ACM](https://doi.org/10.1145/3383313.3412248)
- [Contextual and Sequential User Embeddings for Music Recommendation - Spotify Research](https://research.atspotify.com/2021/04/contextual-and-sequential-user-embeddings-for-music-recommendation)
- [Exploiting Sequential Music Preferences via Optimisation-Based Sequencing - Spotify Research](https://research.atspotify.com/2023/10/exploiting-sequential-music-preferences-via-optimisation-based-sequencing)
- [RecSys Challenge 2018: Automatic Music Playlist Continuation - Spotify Research](https://research.atspotify.com/publications/recsys-challenge-2018-automatic-music-playlist-continuation)

---
tags: [ai, search, mcts, uct, planning]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Monte Carlo Tree Search", "몬테카를로 트리 탐색", "MCTS", "UCT"]
---

# 몬테카를로 트리 탐색과 UCT

몬테카를로 트리 탐색(MCTS)은 시뮬레이션 결과를 트리에 누적하면서 다음 계산을 어디에 쓸지 정하는 탐색 방법이다. 모든 후보에 같은 횟수를 배분하지 않고, 지금 유망한 행동의 활용과 덜 확인한 행동의 탐색을 함께 수행한다. 상태 전이와 보상을 모의 실행할 수 있어야 한다.

## 한 번의 탐색

기본 흐름은 다음 네 단계다. 확장하는 자식 수와 시뮬레이션 종료 조건은 구현에 따라 달라진다.

1. **선택:** 루트에서 기존 통계를 사용해 탐색할 가지를 고른다.
2. **확장:** 아직 트리에 없는 행동과 후속 상태를 추가한다.
3. **시뮬레이션:** 무작위 또는 정해진 정책으로 진행해 보상을 얻는다. 깊이 제한을 두면 해당 지점의 평가 방법도 정해야 한다.
4. **통계 갱신:** 지나온 경로의 방문 수와 누적 보상을 갱신한다. 여기서 역전파는 신경망의 기울기 계산을 뜻하지 않는다.

상대가 있는 게임에서는 보상이 어느 플레이어 기준인지 유지한다. 모든 노드에 루트 플레이어의 승리를 더하고 각 노드에서 그 값을 최대화하면 상대도 루트 플레이어를 돕는 것으로 모델링할 수 있다. OpenSpiel 구현은 행동한 플레이어의 보상을 누적한다.

## UCT는 평균 성과에 탐색 보너스를 더한다

UCT는 트리의 각 의사결정을 밴딧 문제로 다루는 선택 방법이다. 아래는 탐색 상수를 `c`로 묶은 표기이며, 방문한 자식 `i`에 적용한다.

`score(i) = Q_i / n_i + c × sqrt(ln(N) / n_i)`

- `Q_i`: 해당 행동의 누적 보상
- `n_i`: 해당 행동의 방문 수
- `N`: 부모의 방문 수
- `c`: 보상 척도에 맞춰 정하는 양의 탐색 상수

덜 방문한 행동은 보너스가 커서 평균 보상이 낮아도 다시 선택될 수 있다. `n_i = 0`이면 식을 직접 계산하지 않고 우선 탐색하는 규칙이 필요하다. OpenSpiel의 `uct_value`는 미방문 자식에 무한대 점수를 준다.

**계산 예시:** `N = 12`, `c = 1`이고 A가 10회 중 6승, B가 2회 중 1승이라면 점수는 A가 약 1.098, B가 약 1.615다. 다음 탐색은 B에 배분한다. 이것은 B의 실제 승률이 더 높다는 증명이 아니다. 보너스를 포함한 점수는 확률이 아니므로 1을 넘을 수 있다.

## 탐색할 행동과 실제 실행할 행동

탐색 중에는 추가 정보를 얻는 가치가 있으므로 보너스를 사용한다. 예산 종료 뒤에는 최종 행동 선택 규칙을 별도로 적용한다. Kocsis와 Szepesvári의 계획 알고리즘은 평균 누적 보상이 가장 큰 행동을 반환한다. 방문 수를 기준으로 고르는 방법도 있다.

OpenSpiel의 `best_child`는 증명된 결과, 방문 수, 누적 보상을 순서대로 비교한다. 모든 후보의 결과가 미확정일 때는 방문 수가 우선이다. 이 구현을 무조건 최다 방문 행동만 고른다고 설명하거나, UCT 점수가 최종 실행 기준이라고 일반화하지 않는다(2026-10-26 소스 대조).

## 학습한 정책과 가치로 탐색을 이끈다: AlphaGo

바둑은 한 국면의 합법 수가 약 250, 게임 길이가 약 150으로 체스(약 35와 80)보다 트리가 훨씬 넓고 깊다. AlphaGo(Silver 외 2016)는 MCTS의 선택과 평가 자리에 학습한 신경망을 넣었다.

- **선택의 사전확률:** 간선마다 행동 가치 `Q`, 방문 수 `N`과 사전확률 `P`를 두고 `Q(s, a) + u(s, a)`가 가장 큰 행동을 고른다. 보너스 `u(s, a)`는 `P(s, a) / (1 + N(s, a))`에 비례해 사전확률이 높은 수를 먼저 보게 하고 방문할수록 줄어든다. 사전확률은 사람 기보로 지도학습한 정책망이 낸다. 강화학습으로 더 강해진 정책망보다 이쪽이 탐색에서 나았는데, 저자들은 사람은 유망한 수를 여러 개 고르고 강화학습은 가장 좋은 한 수에 최적화하기 때문으로 추정했다.
- **잎 평가:** 새로 확장한 잎 상태를 가치망의 예측과, 빠른 롤아웃 정책으로 끝까지 둔 결과로 따로 평가해 `V = (1 − λ) × 가치망 + λ × 롤아웃 결과`로 섞는다. 가치망만 쓴 변형(λ = 0)도 다른 바둑 프로그램을 모두 넘었지만, 반씩 섞은 λ = 0.5가 다른 변형과의 대국에서 95% 이상 이겨 가장 좋았다.
- **최종 행동:** 탐색이 끝나면 루트에서 가장 많이 방문한 수를 둔다. 행동 가치가 가장 큰 수보다 이상치에 덜 민감하다는 이유이며, 위 절의 탐색 점수와 실행 기준의 구분과 같은 문제다.

이 방식으로 AlphaGo는 2015년 10월 유럽 챔피언 판후이와의 공식 5국을 모두 이겼다. 논문은 이 대국에서 AlphaGo가 Deep Blue의 Kasparov전보다 수천 배 적은 국면을 평가했고, 정책망으로 볼 국면을 고르고 가치망으로 더 정확히 평가해 그 차이를 메웠다고 적었다. Deep Blue는 사람이 만든 평가 함수에 의존했다. 깊이 제한 탐색에서 평가 함수의 정확도가 수준을 정한다는 점은 [[Adversarial-Search#탐색 비용과 근사의 한계|적대적 탐색의 평가 함수]]와 같고, 차이는 그 평가를 사람이 짜는지 데이터에서 학습하는지다. 사전확률과 가치 추정이 좋을수록 같은 예산을 유망한 가지에 모을 수 있지만 그 품질은 학습 데이터와 방법에 달려 있으며, 탐색이 이를 대신 보증하지는 않는다(해석). 사람 기보 없이 자가 대국으로 학습한 후속 모델과 이세돌 9단과의 대국 결과는 [[AI-Capability-and-Cost-Trends|AI 역량과 비용 추세]]에 있다.

## 적용 조건과 한계

- 제한된 계산으로 후보를 비교할 수 있지만 유한한 예산에서 최적 행동을 보장하지 않는다.
- 모의 실행 정책과 보상 정의가 달라지면 통계의 의미도 달라진다. 시뮬레이션에서 얻은 승률을 현실 성과로 그대로 옮기지 않는다.
- UCT의 수렴 결과는 논문이 다룬 유한 지평 또는 할인 MDP 등의 조건을 전제로 한다. 임의의 업무 에이전트가 예산만 늘리면 정답에 도달한다는 보증이 아니다.

## 출처

- [Bandit based Monte-Carlo Planning — Levente Kocsis, Csaba Szepesvári](https://sites.ualberta.ca/~szepesva/papers/ecml06.pdf) — 2006, 선택적 샘플링, UCT와 계획 알고리즘의 반환 기준
- [A Survey of Monte Carlo Tree Search Methods — Cameron Browne 외](https://www.lamsade.dauphine.fr/~cazenave/A%2BSurvey%2Bof%2BMonte%2BCarlo%2BTree%2BSearch%2BMethods.pdf) — 2012, 기본 탐색 과정과 시뮬레이션 정책
- [OpenSpiel mcts.py — Google DeepMind](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/mcts.py) — `uct_value`, `best_child`, `_apply_tree_policy`, `mcts_search`, 2026-10-26 확인, 실행 검증은 하지 않음
- [Mastering the game of Go with deep neural networks and tree search — David Silver 외](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf) — 2016, Nature 529권 484~489쪽. 2026-11-24 본문과 Methods에서 분기 수와 깊이, 사전확률 보너스, 지도학습 정책망을 쓴 이유, λ 혼합과 0.5의 성능, 최다 방문 수 선택, 판후이 대국과 Deep Blue 비교 대조
- [YouTube, Zachary Huang, Give Me 1 Hour, I Will Make Artificial Intelligence Click Forever](https://www.youtube.com/watch?v=fCEvvkAbJOs) — 2026-10-27 업로드 공개, 2026-11-24 음성 인식 전사 전체 확인. AlphaGo 절의 계기이며 영상의 틱택토 실행 수치는 옮기지 않음

## 관련 문서

- [[paradigm|AI 패러다임과 모델]]
- [[Adversarial-Search|적대적 탐색과 미니맥스]] — 깊이 제한과 평가 함수
- [[AI-Capability-and-Cost-Trends|AI 역량과 비용 추세]] — AlphaGo와 AlphaGo Zero의 대국 결과

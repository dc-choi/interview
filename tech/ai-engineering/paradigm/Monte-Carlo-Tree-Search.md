---
tags: [ai, search, mcts, uct, planning]
status: done
verified_at: 2026-10-26
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

## 적용 조건과 한계

- 제한된 계산으로 후보를 비교할 수 있지만 유한한 예산에서 최적 행동을 보장하지 않는다.
- 모의 실행 정책과 보상 정의가 달라지면 통계의 의미도 달라진다. 시뮬레이션에서 얻은 승률을 현실 성과로 그대로 옮기지 않는다.
- UCT의 수렴 결과는 논문이 다룬 유한 지평 또는 할인 MDP 등의 조건을 전제로 한다. 임의의 업무 에이전트가 예산만 늘리면 정답에 도달한다는 보증이 아니다.

## 출처

- [Bandit based Monte-Carlo Planning — Levente Kocsis, Csaba Szepesvári](https://sites.ualberta.ca/~szepesva/papers/ecml06.pdf) — 2006, 선택적 샘플링, UCT와 계획 알고리즘의 반환 기준
- [A Survey of Monte Carlo Tree Search Methods — Cameron Browne 외](https://www.lamsade.dauphine.fr/~cazenave/A%2BSurvey%2Bof%2BMonte%2BCarlo%2BTree%2BSearch%2BMethods.pdf) — 2012, 기본 탐색 과정과 시뮬레이션 정책
- [OpenSpiel mcts.py — Google DeepMind](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/mcts.py) — `uct_value`, `best_child`, `_apply_tree_policy`, `mcts_search`, 2026-10-26 확인, 실행 검증은 하지 않음

## 관련 문서

- [[paradigm|AI 패러다임과 모델]]

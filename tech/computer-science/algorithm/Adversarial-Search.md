---
tags: [cs, algorithm, adversarial-search, minimax]
status: done
category: "CS - 알고리즘"
aliases: ["Adversarial Search", "적대적 탐색", "미니맥스", "Minimax"]
---

# 적대적 탐색과 미니맥스

적대적 탐색은 상대가 자신의 목표를 방해할 수 있을 때 행동을 고르는 방법이다. 실행할 경로 하나보다 상대의 대응 뒤에도 사용할 **상태별 행동 전략**이 필요하다.

## 게임을 먼저 모델링한다

여기서는 두 사람이 번갈아 행동하는 결정적, 완전정보, 제로섬 게임을 다룬다. MAX의 이득은 MIN의 손해이며, 효용은 MAX 관점으로 통일한다.

| 요소 | 의미 |
|---|---|
| 상태와 차례 | 현재 판과 다음 행동을 고를 플레이어 |
| 가능한 행동과 전이 | 현재 차례에 허용되는 수와 그 결과 상태 |
| 종료 조건과 효용 | 게임이 끝나는 조건과 결과 점수 |
| 전략 | 도달한 상태에서 선택할 행동 |

게임 트리는 현재 상태에서 가능한 행동을 펼친 것이다. 우연, 숨겨진 정보나 서로 다른 플레이어의 목표가 있으면 이 전제를 그대로 적용하지 않는다.

## 상대의 최선까지 고려한다

미니맥스는 상대가 MAX의 효용을 가장 낮추는 수를 고른다고 가정한다. 종료 상태부터 값을 올려 보낸다.

- 종료 상태: 정해진 효용을 반환한다.
- MAX 차례: 자식 값의 최댓값을 고른다.
- MIN 차례: 자식 값의 최솟값을 고른다.

예를 들어 MAX가 왼쪽과 오른쪽을 고르고, 이어 MIN이 최종 결과를 고른다고 하자.

| MAX의 선택 | MIN이 고를 수 있는 효용 | MIN의 선택 결과 |
|---|---|---|
| 왼쪽 | 3, 5 | 3 |
| 오른쪽 | 2, 9 | 2 |

MAX는 `max(min(3, 5), min(2, 9)) = 3`이므로 왼쪽을 고른다. 9점을 얻는 경로가 존재해도 상대가 허용한다는 뜻은 아니다. 미니맥스는 승리 자체를 보장하지 않는다.

## 탐색 비용과 근사의 한계

분기 수가 `b`, 탐색 깊이가 `m`이면 기본 탐색 시간은 `O(b^m)`이다. 알파 베타 가지치기는 이미 확인한 대안보다 좋아질 수 없는 가지를 생략한다. 위 예에서 왼쪽 값 3을 구한 뒤 오른쪽의 2를 보면, 나머지 결과를 읽지 않아도 오른쪽을 버릴 수 있다.

깊이 제한에서 미완료 상태를 평가 함수로 점수화하면 계산량을 줄이지만 값은 추정이다. 끝까지 계산한 미니맥스의 최적성 보장을 그대로 주장할 수 없다.

이해 확인: 오른쪽 결과를 4와 9로 바꾸면 어떤 수를 골라야 하는가? MIN 차례까지 모두 최댓값으로 계산하면 어떤 가정을 잘못 넣게 되는가?

## 출처

- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Games](https://inst.eecs.berkeley.edu/~cs188/textbook/games/games.html)
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Minimax](https://inst.eecs.berkeley.edu/~cs188/textbook/games/minimax.html)

## 관련 문서

- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]
- [[Algorithm-Recursion|재귀와 종료 조건]]
- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]] — 간선의 최댓값을 최소화하는 minimax 경로와 게임 미니맥스는 다른 문제다.

---
tags: [cs, algorithm, graph, shortest-path, routing]
status: done
category: "CS - 알고리즘"
aliases: ["Contraction Hierarchies", "축약 계층", "Customizable Contraction Hierarchies", "CCH"]
---

# 축약 계층과 도로망 최단 경로

Contraction Hierarchies(CH)는 그래프를 미리 처리해 반복적인 최단 경로 질의의 탐색 범위를 줄이는 기법이다. 음수가 아닌 간선 비용을 전제로 한다. 정확도를 포기해 빨라지는 근사 탐색이 아니라, 최단 거리를 보존하는 지름길 간선(shortcut)을 추가하는 방식이다.

## 정점 축약과 지름길

정점마다 축약 순위를 부여한다. 낮은 순위의 정점부터 작업 그래프에서 제거하면서, 그 정점을 거치던 경로를 필요한 shortcut으로 대신한다. 높은 순위가 고속도로 등급을 그대로 뜻하지는 않는다.

예를 들어 `u → v → w`의 비용이 각각 3과 4라면, `v`를 축약할 때 비용 7의 `u → w`가 후보가 된다. 일반 CH에서는 `v`를 거치지 않고 비용 7 이하로 갈 수 있는 경로를 찾는 witness search로 불필요한 shortcut을 줄인다. 한 정점을 없앨 때 필요한 shortcut은 여러 개일 수 있다.

질의에서는 출발점의 순방향 탐색과 도착점의 역방향 탐색을 높은 순위 쪽으로 제한한다. 두 탐색이 공유하는 정점에서 거리 합을 비교한다. 첫 만남만으로 최적해를 확정하지 않고 알고리즘의 종료 조건을 지킨다. 마지막에는 shortcut을 원래 간선열로 풀어 실제 경로를 복원한다.

## 교통 변화와 CCH의 세 단계

기본 CH의 전처리는 가중치에 의존한다. 교통량이나 이동 수단이 바뀌었다고 원래 간선 비용만 교체하면 기존 shortcut의 비용과 필요성이 맞지 않을 수 있다. Customizable Contraction Hierarchies(CCH)는 이를 세 단계로 나눈다.

| 단계 | 입력과 역할 |
|---|---|
| 가중치 독립 전처리 | 그래프 연결 구조로 축약 순서와 보조 그래프를 만든다 |
| Customization | 현재 방향별 비용을 반영해 보조 간선의 가중치를 계산한다 |
| 질의 | 갱신된 보조 그래프에서 최단 거리를 찾고 경로를 복원한다 |

연결 구조가 그대로라면 비용이 바뀔 때 customization을 다시 수행해 전처리 구조를 재사용한다. CCH의 보조 그래프 생성과 일반 CH의 가중치 기반 witness search를 같은 단계로 설명하지 않는다.

방향별 비용을 따로 두면 일방통행도 표현할 수 있다. 회전 금지와 회전 비용은 진입 방향까지 반영하는 별도 모델링이 필요하다. 또한 한 시점의 교통 비용을 갱신하는 것과, 주행 중 각 간선 진입 시각에 따라 비용이 달라지는 문제는 구분한다.

## 적용 판단과 확인

전처리 비용을 나눠 부담할 만큼 같은 도로망에 질의를 반복할 때 검토한다. 작은 그래프나 일회성 질의에서는 [[Graph-Traversal-and-Shortest-Path#Dijkstra|Dijkstra]]부터 비교한다. 전처리 시간, 추가 메모리, 비용 갱신 시간과 경로 복원 시간을 함께 측정해야 한다.

검증할 때는 작은 그래프에서 원본 Dijkstra와 거리 및 복원 경로의 비용을 비교한다. 일방통행, 도달 불가, 비용이 같은 복수 경로와 가중치 변경을 포함한다. 특정 도로망의 방문 정점 수나 지연 수치를 모든 서비스의 성능으로 일반화하지 않는다.

## 출처

- [Customizable Contraction Hierarchies — Julian Dibbelt, Ben Strasser, Dorothea Wagner](https://arxiv.org/html/1402.0402v5)
- [Customizable Contraction Hierarchies – A Survey — Thomas Bläsius 외](https://arxiv.org/html/2502.10519v1)

## 관련 문서

- [[Graph-Algorithms-and-Optimization|그래프 알고리즘과 최적화]]
- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]]

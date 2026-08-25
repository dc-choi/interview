---
tags: [cs, algorithm, graph, greedy, mst, prim, max-flow, ford-fulkerson]
status: done
category: "CS - 알고리즘"
aliases: ["Graph Optimization Algorithms", "Minimum Spanning Tree", "최소 신장 트리", "Maximum Flow", "최대 유량", "Interval Scheduling"]
---

# Greedy, 최소 신장 트리와 최대 유량

Greedy algorithm은 매 단계에서 현재 기준으로 가장 좋은 선택을 확정한다. 지역 최적 선택을 했다는 사실만으로 전체 최적해가 보장되지는 않으며, greedy-choice property와 optimal substructure를 증명해야 한다.

## Greedy를 검증하는 방법

- **Exchange argument**: 어떤 optimal solution도 greedy 선택을 포함하도록 손해 없이 교환할 수 있음을 보인다.
- **Stays-ahead**: 각 단계에서 greedy solution이 다른 후보보다 뒤처지지 않음을 보인다.
- **Cut property**: MST처럼 cut을 가로지르는 safe edge를 선택해도 optimal solution이 존재함을 보인다.

동전 교환에서 큰 동전부터 고르는 전략은 특정 화폐 체계에서는 맞지만 임의 denomination에서는 실패한다. 예시가 맞았다는 것과 algorithm이 항상 맞다는 것은 다르다.

## Interval scheduling

겹치지 않는 interval을 가장 많이 선택하려면 시작이 가장 빠르거나 길이가 가장 짧은 것이 아니라 **finish time이 가장 이른 interval**을 고른다.

1. finish time 오름차순으로 정렬한다.
2. 직전에 선택한 interval의 finish 이후 시작하는 첫 interval을 선택한다.
3. 끝까지 반복한다.

정렬이 O(n log n), scan이 O(n)이다. weighted interval처럼 각 작업 가치가 다르면 이 greedy rule로 풀리지 않고 dynamic programming이 필요하다.

## Minimum Spanning Tree

connected, undirected, weighted graph의 spanning tree는 모든 vertex를 cycle 없이 연결하는 `V-1`개 edge 집합이다. 그 weight 합이 최소인 것이 MST다. 최단 경로 tree와 목적이 다르다.

### Prim algorithm

Prim은 한 vertex에서 시작해 현재 tree와 바깥을 잇는 가장 가벼운 edge를 반복 선택한다. priority queue에는 바깥 vertex로 가는 candidate edge를 넣는다.

- adjacency list와 binary heap: 보통 O(E log V)
- graph가 disconnected면 하나의 spanning tree가 아니라 component별 minimum spanning forest가 나온다.
- 같은 weight가 있으면 MST가 여러 개일 수 있다.

Dijkstra와 priority queue 모양이 비슷하지만 비교값이 다르다. Dijkstra는 source부터의 누적 거리, Prim은 현재 tree로 들어오는 edge weight를 기준으로 갱신한다. 네트워크의 [[Physical-DataLink-Layer|Spanning Tree Protocol]]도 loop-free topology를 만들지만 일반 graph의 MST cost 최적화 문제와 동일하지 않다.

### Kruskal과 Union-Find

Kruskal은 edge를 weight 오름차순으로 보고 서로 다른 component를 잇는 edge만 선택한다. 어떤 cut을 가로지르는 최소 edge가 safe하다는 cut property가 근거다.

Union-Find 또는 disjoint-set union은 각 원소가 속한 component의 대표를 관리한다.

- `find(x)`: 대표를 찾고 path compression으로 경로를 짧게 만든다.
- `union(a, b)`: 대표가 다를 때 rank/size가 작은 tree를 큰 tree 아래에 붙인다.

두 최적화를 함께 쓰면 연산의 amortized cost는 거의 상수인 O(α(V))이고, Kruskal 전체는 edge 정렬이 지배해 O(E log E)다. 이미 대표가 같은 edge를 추가하면 cycle이 되므로 건너뛴다. `V-1`개를 선택하기 전에 edge가 끝나면 graph가 disconnected다.

## Maximum flow

flow network는 source `s`, sink `t`, directed edge capacity를 가진다.

- capacity constraint: `0 ≤ f(u,v) ≤ c(u,v)`
- flow conservation: source와 sink를 제외한 vertex의 유입량과 유출량이 같다.
- residual capacity: 현재 더 보낼 수 있는 양. reverse residual edge는 이전 선택 일부를 취소해 다른 경로로 재배치할 수 있게 한다.

### Ford-Fulkerson method

1. residual graph에서 `s → t` augmenting path를 찾는다.
2. 경로의 최소 residual capacity인 bottleneck만큼 flow를 늘린다.
3. forward/reverse residual capacity를 갱신한다.
4. augmenting path가 없을 때 종료한다.

정수 capacity에서는 종료하며 시간은 구현에 따라 `O(E × maxFlow)`로 묶을 수 있다. 임의 DFS 경로를 택하는 형태는 irrational capacity에서 종료하지 않을 수 있고 path 선택에 민감하다. BFS로 가장 짧은 augmenting path를 고르는 Edmonds-Karp는 O(VE²)의 polynomial bound를 갖는다.

## 선택 지도

| 문제 | 핵심 목적 | 대표 알고리즘 |
|---|---|---|
| 충돌 없는 작업 수 최대화 | interval 개수 | earliest-finish greedy |
| 모든 정점을 최소 총비용으로 연결 | edge 합 | Prim, Kruskal |
| source에서 sink로 보낼 수 있는 최대량 | capacity와 residual graph | Ford-Fulkerson, Edmonds-Karp |
| 한 source부터 각 vertex 최소 비용 | path 거리 | Dijkstra |

## 출처

- 인프런, 큰돌 강사, [#1. 유니온파인드(상호배타적집합)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=331809)

- [NIST Dictionary of Algorithms and Data Structures](https://www.nist.gov/dads/)
- [NIST DADS, Kruskal's algorithm](https://xlinux.nist.gov/dads/HTML/kruskalsalgo.html)
- [NIST DADS, inverse Ackermann function](https://xlinux.nist.gov/dads/HTML/inverseAckermann.html)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Greedy, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135776)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Prim MST, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135777)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Ford-Fulkerson, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135779)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Interval scheduling, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135780)

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path|DFS, BFS와 Dijkstra]]
- [[Algorithm-DP|Dynamic Programming]]
- [[Heap|Priority Queue]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Greedy-Sweep-and-Two-Pointers|Greedy 증명과 line sweep]]

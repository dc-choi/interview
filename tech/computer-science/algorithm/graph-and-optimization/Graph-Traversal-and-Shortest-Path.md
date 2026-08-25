---
tags: [cs, algorithm, graph, dfs, bfs, dijkstra, shortest-path]
status: done
category: "CS - 알고리즘"
aliases: ["Graph Traversal and Shortest Path", "DFS BFS", "그래프 탐색", "Dijkstra", "다익스트라"]
---

# 그래프 탐색과 최단 경로

그래프는 vertex와 그 관계인 edge로 연결 구조를 표현한다. edge에 방향, weight, parallel edge와 self-loop를 허용하는지는 문제 모델이 정한다.

## 표현 선택

| 표현 | 공간 | edge 존재 확인 | neighbor 순회 | 적합한 경우 |
|---|---:|---:|---:|---|
| adjacency list | O(V+E) | 보통 degree에 비례 | O(degree) | sparse graph, 대부분의 탐색 |
| adjacency matrix | O(V²) | O(1) | O(V) | dense graph, 작은 고정 graph |

map/set 기반 adjacency list는 구현이 편하지만 object overhead와 iteration order가 결과에 영향을 줄 수 있다. 정점 ID가 조밀하면 array가 더 단순하다.

## DFS

Depth-First Search는 한 경로를 더 갈 수 없을 때까지 따라간 뒤 backtrack한다. recursion 또는 explicit stack으로 구현한다.

```text
stack에 start 추가
stack이 빌 때까지:
  vertex 꺼내기
  아직 방문하지 않았다면 표시하고 처리
  neighbor를 stack에 추가
```

cycle이 있는 graph에서는 visited가 없으면 끝나지 않는다. directed cycle 탐지처럼 현재 recursion path와 전체 방문 완료를 구분해야 하는 문제도 있다.

활용: connected component, cycle 탐지, topological sort, 모든 경로 탐색과 backtracking.

## BFS

Breadth-First Search는 start에서 edge 수가 같은 level을 차례로 방문하며 queue를 쓴다. neighbor를 queue에 넣을 때 visited를 표시해야 같은 정점이 여러 번 enqueue되는 것을 줄일 수 있다.

unweighted graph 또는 모든 edge cost가 같은 graph에서 처음 도달한 level이 최단 edge 수다. weight가 다른 graph에 BFS 최단 경로 성질을 그대로 적용하면 안 된다.

활용: unweighted shortest path, 최소 단계, 가까운 관계 탐색, level-order traversal.

grid 탐색은 각 cell을 vertex, 이동 가능 관계를 edge로 본 graph 문제다. `(y, x)`와 방향 vector의 순서를 통일하고 범위 검사 뒤 방문 처리한다. connected component 수나 넓이는 아직 방문하지 않은 cell마다 DFS/BFS를 새로 시작해 계산한다.

adjacency list를 쓰면 BFS와 DFS 모두 각 vertex와 edge를 상수 번 확인해 O(V+E), 추가 공간은 O(V)다. 전체 graph가 disconnected라면 모든 vertex에서 미방문 component를 다시 시작한다.

### 0-1 BFS

edge weight가 0 또는 1뿐이면 deque로 Dijkstra의 우선순위를 단순화할 수 있다. 0-weight edge로 거리가 줄면 front, 1-weight edge면 back에 넣어 처리하며 O(V+E)다. 일반 양의 weight graph에는 적용하지 않는다.

## Dijkstra

Dijkstra는 **negative weight가 없는 graph**에서 한 source부터 다른 vertex까지의 최단 거리를 구한다. 핵심은 relaxation이다.

```text
dist[source] = 0, 나머지는 Infinity
priority queue에서 dist가 가장 작은 vertex를 꺼냄
각 edge (u, v, w)에 대해:
  dist[v] > dist[u] + w 이면 갱신
```

binary heap priority queue와 adjacency list를 쓰면 보통 O((V+E) log V)로 표현한다. decrease-key 대신 갱신 값을 새로 push하는 구현은 stale entry를 꺼냈을 때 현재 `dist`와 비교해 건너뛴다.

negative edge에서는 확정한 거리가 나중에 더 작아질 수 있어 Dijkstra의 greedy invariant가 깨진다. Bellman-Ford 같은 알고리즘을 검토하며, negative cycle이 있으면 최단 경로 자체가 정의되지 않을 수 있다.

## Bellman-Ford

Bellman-Ford는 source에서 도달 가능한 모든 edge를 최대 `V-1`번 반복해 relax한다. simple shortest path가 cycle을 제거하면 edge를 최대 `V-1`개 사용한다는 성질에 근거하며 시간은 O(VE)다.

`V`번째 pass에서도 거리가 줄어드는 vertex가 있으면 source에서 도달 가능한 negative cycle의 영향을 받는다. 문제의 target까지 그 영향이 전파되는지도 따로 확인해야 한다. 도달하지 못한 `Infinity` 값에는 weight를 더하지 않는다.

## Floyd-Warshall

Floyd-Warshall은 `dist[i][j]`가 중간 정점 집합 `{0..k-1}`만 허용한 최단 거리라는 invariant로 모든 쌍 거리를 갱신한다.

```text
for k, i, j:
  dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
```

시간 O(V³), 공간 O(V²)이다. negative edge는 허용하지만 negative cycle을 통과할 수 있는 쌍에는 유한한 최단 거리가 없다. 계산 뒤 `dist[v][v] < 0`인 정점으로 cycle을 탐지할 수 있다.

## 거리뿐 아니라 경로 복원

relaxation으로 `dist[v]`를 갱신할 때 `prev[v] = u`도 저장한다. target에서 `prev`를 따라 source까지 역추적한 뒤 뒤집으면 실제 route가 된다. 여러 최단 경로가 있으면 tie-break 정책에 따라 하나만 얻는다.

## DFS, BFS, Dijkstra 선택

| 질문 | 선택 |
|---|---|
| 도달 가능한가, component/cycle 구조는 무엇인가 | DFS 또는 BFS |
| edge 수 기준 최소 단계인가 | BFS |
| non-negative weight의 최소 비용인가 | Dijkstra |
| negative edge가 있는가 | Bellman-Ford 등 |
| 모든 vertex pair 거리인가 | Floyd-Warshall 또는 반복 SSSP |

## 출처

- 인프런, 큰돌 강사, [2주차 개념 #1. 그래프이론의 기초(Graph, Vertex, Edge, Weight)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134738), [2주차 개념 #4-1. 인접행렬(adjacency matrix)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134742), [2주차 개념 #4-2. 인접행렬(adjacency matrix)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146955), [2주차 개념 #5. 인접리스트(adjacency list)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134743), [2주차 개념 #6. 인접행렬과 인접리스트의 차이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=135532)
- 인프런, 큰돌 강사, [2주차 개념 #7. 맵과 방향벡터(direction vector)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134744), [2주차 개념 #8. 연결된 컴포넌트(connected component)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134741), [2주차 개념 #9. 깊이우선탐색(DFS, Depth First Search)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134745), [2주차 개념 #10. 너비우선탐색(BFS, Breadth First Search)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134746), [2주차 개념 #11. DFS와 BFS 비교](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100309)
- 인프런, 큰돌 강사, [2-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100325), [2-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100326), [2-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100327), [2-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100328), [2-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100341)
- 인프런, 큰돌 강사, [2-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100343), [4-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100390), [5-Y](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100420), [7-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100979), [8주차 개념 #2. 다익스트라(Dijkstra)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=147925)
- 인프런, 큰돌 강사, [8주차 개념 #3. 플로이드 워셜(Floyd-Warshall)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=251697), [8주차 개념 #4. 벨만-포드(Bellman-Ford)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=251698), [8-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101066), [8-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101067), [8-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101068)
- 인프런, 큰돌 강사, [8-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101069), [8-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101070), [8-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101071), [8-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101072), [8-U](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101074)
- 인프런, 큰돌 강사, [8-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101077), [8-Y](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101078)

- [NIST Dictionary — Breadth-First Search](https://www.nist.gov/dads/HTML/breadthfirst.html)
- [NIST DADS, Dijkstra's algorithm](https://xlinux.nist.gov/dads/HTML/dijkstraalgo.html)
- [NIST DADS, Bellman-Ford algorithm](https://xlinux.nist.gov/dads/HTML/bellmanford.html)
- [NIST DADS, Floyd-Warshall algorithm](https://xlinux.nist.gov/dads/HTML/floydWarshall.html)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — DFS와 BFS, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135789)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Dijkstra 개념, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135773)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 경로 복원, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135790)

## 관련 문서

- [[Graph-Optimization-Algorithms|MST, 최대 유량과 interval scheduling]]
- [[Heap|Priority Queue]]
- [[Algorithm-Complexity|시간복잡도]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Exhaustive-Search-and-Backtracking|상태 공간과 BFS]]

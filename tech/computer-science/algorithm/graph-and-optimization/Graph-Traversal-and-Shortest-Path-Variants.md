---
tags: [cs, algorithm, graph, shortest-path, dijkstra, bellman-ford, a-star, coding-test]
status: done
category: "CS - 알고리즘"
aliases: ["Shortest Path Variants", "최단 경로 변형", "역방향 그래프 Dijkstra", "상태 확장 Dijkstra", "A*", "A star", "minimax path", "bottleneck path", "추이 폐쇄", "transitive closure"]
verified_at: 2026-09-30
---

# 최단 경로 변형 패턴

기본 Dijkstra, Bellman-Ford와 Floyd-Warshall은 [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]에서 다룬다. 여기에는 그대로 적용되지 않는 질문을 기본 알고리즘으로 되돌리는 변형을 모았다. 공통 원리는 간선 방향, 정점 상태나 가중치를 바꿔 이미 아는 단일 출발점 문제로 만드는 것이다.

## 여러 출발지에서 한 목적지까지: 역방향 그래프

모든 정점 v에서 한 목적지 X까지의 거리가 필요하면 모든 간선의 방향을 뒤집은 그래프에서 X를 출발점으로 Dijkstra를 한 번 돌린다. 원래 그래프의 v → X 경로가 뒤집은 그래프의 X → v 경로와 같기 때문이다.

- 각 정점에서 X에 갔다가 돌아오는 왕복 거리는 정방향 그래프(X → v)와 역방향 그래프(v → X)에서 Dijkstra를 한 번씩 돌려 `dist[v] + rdist[v]`로 구한다. 입력을 받을 때 두 adjacency list를 함께 만들고 Dijkstra 함수가 list를 인자로 받게 하면 같은 코드를 두 번 쓴다. 호출마다 dist를 INF로 다시 초기화한다.
- 모든 쌍 알고리즘인 Floyd-Warshall이 먼저 떠오르지만 O(V³)이라 V = 1,000이면 약 10억 번 연산이다. 역방향 Dijkstra 두 번은 O((V + E) log V)다. V가 수백 이하면 Floyd-Warshall로 모든 쌍을 구해 두는 편이 구현은 짧다.
- 오르막과 내리막의 이동 비용이 다른 높이 격자처럼 간선 비용이 비대칭이면 출발점 s에서 v에 갔다 오는 시간은 `dist[s][v] + dist[v][s]`라 두 방향이 모두 필요하다. 칸에 빈틈 없는 번호(`y * W + x`, [[Graph-Traversal-and-Shortest-Path-Grid-BFS#턴 단위 BFS|좌표를 정수 하나로]])를 붙이면 25 × 25 격자(625개, 약 2.4억 번)는 Floyd-Warshall 한 번으로도 되지만, 출발점이 하나뿐이면 정방향과 역방향 Dijkstra 두 번이 훨씬 싸다.

### 앞뒤로 닿는 정점 수: 순위의 범위

A가 B보다 앞선다는 관계를 간선 A → B로 받으면, X에서 원래 방향으로 닿는 정점은 반드시 X보다 뒤이고 뒤집은 그래프에서 닿는 정점은 반드시 X보다 앞이다. 입력 때 두 adjacency list를 함께 만들고 X에서 BFS나 DFS를 한 번씩 돌려 앞의 수 a와 뒤의 수 b를 세면, X가 가질 수 있는 가장 높은 순위는 a + 1, 가장 낮은 순위는 N - b다.

- 관계에 모순(cycle)이 없으면 두 끝은 실제로 가능하다. 반드시 앞서는 정점을 모두 먼저 두고 바로 다음에 X를 두는 위상 순서가 있기 때문이다.
- 비용은 탐색 두 번의 O(N + M)이다. 정점마다 따로 탐색하면 O(N(N + M))이다. 두 탐색 사이에 visited를 비운다.
- 강한 연결 요소를 찾는 Kosaraju 알고리즘도 뒤집은 그래프를 쓴다.

## 상태를 더한 Dijkstra와 가중치 스케일링

같은 정점이라도 이후 비용이 상태에 따라 다르면 정점을 (정점, 상태) 쌍으로 늘린 그래프에서 Dijkstra를 돌린다. BFS에서 열쇠나 시간 parity를 상태에 넣는 것과 같은 원리다([[Exhaustive-Search-and-Backtracking#BFS도 상태 공간 탐색이다|상태 BFS]]).

- 빠른 이동(시간 절반)과 느린 이동(시간 두 배)을 번갈아 하는 주체는 다음 이동이 빠른지 느린지에 따라 같은 정점에서도 남은 비용이 다르다. `dist[v][flag]`로 두고 priority queue 원소에도 flag를 넣은 뒤, 간선을 지날 때 flag에 맞는 배율을 적용하고 flag를 뒤집는다. 정점의 도착 시간은 두 flag 값 중 작은 값이다.
- 절반 계산이 소수를 만들면 입력 가중치를 처음부터 두 배로 저장한다. 모든 가중치에 같은 양수를 곱하면 모든 경로 비용이 같은 배율로 커져 누가 먼저 도착하는지 같은 대소 비교가 그대로 유지되고, 실수 오차를 피한다([[Cpp-Coding-Test-Workflow#정수와 실수 계산|정수와 실수 계산]]).
- 상태 수 S만큼 dist 크기와 탐색할 간선이 늘어 O(S(V + E) log(SV))다.
- **특정 간선을 지나는 최단 경로가 있는지**: 모든 가중치를 두 배로 하고 확인할 간선 g-h만 `2w - 1`로 두면, Dijkstra 한 번 뒤 거리가 홀수인 정점까지는 g-h를 지나는 최단 경로가 있다. 원래 길이가 같은 경로끼리는 g-h를 지나는 쪽이 1 짧아 선택되고, 원래 길이가 다르면 두 배 뒤 차이가 2 이상이라 순서가 뒤집히지 않는다. 양의 가중치 최단 경로는 같은 간선을 두 번 지나지 않으므로 홀수는 정확히 한 번 지났다는 뜻이다. `2w + 1`로 두면 동률에서 g-h를 지나지 않는 경로가 이겨 답을 놓친다. 도달하지 못한 정점의 INF도 짝수여야 하므로(흔히 쓰는 987654321은 홀수) INF를 짝수로 두거나 도달 여부를 먼저 거르고, 두 배로 늘린 거리가 자료형 범위 안인지 확인한다. 대안은 s, g, h에서 Dijkstra를 세 번 돌려 `dist_s[g] + w + dist_h[t] == dist_s[t]` 또는 g와 h를 바꾼 식을 검사하는 것이다.

## 합이 아닌 경로 값

Dijkstra의 정당성 논증은 최소화 기준으로 두 성질에만 기댄다. 경로를 늘려도 값이 줄지 않고, 작은 값에서 같은 간선으로 늘린 쪽이 큰 값에서 늘린 쪽보다 커지지 않는다. `max`와, 음이 아닌 가중치에서의 `+`가 둘 다 만족하므로 경로 값이 합이 아니어도 완화식만 바꿔 쓴다. 경로를 늘릴 때 값이 좋아질 수 있는 결합(음수 가중치의 합 등)에는 쓰지 않는다.

- **minimax(bottleneck) 경로**: 경로의 가장 무거운 간선을 최소화하면 `max(cur, w) >= cur`이므로 `next = max(dist[u], w)`로 완화하는 Dijkstra다. 경로의 가장 가벼운 간선을 최대화하는 widest path는 max heap과 `min(dist[u], w)`로 같은 틀이다.
- **격자 물탱크**: 칸 사이 벽과 바깥 벽의 구멍 높이가 주어지고 가득 찬 물(높이 H)이 구멍으로 빠질 때, 칸의 최종 수위는 바깥까지 가는 경로마다 지나는 구멍 높이의 최댓값을 구한 뒤 그중 가장 작은 값이다. 모든 칸의 수위를 H로 두고, 바깥 벽 구멍이 있는 칸을 (구멍 높이, 칸)으로 한 priority queue에 함께 넣어 시작한다(여러 출발점). 꺼낸 값이 그 칸의 현재 수위보다 크면 건너뛰고, 구멍이 있는 방향마다 `max(cur, hole)`이 이웃의 수위보다 낮으면 갱신해 넣는다. 답은 수위의 합이다. 두 칸 사이 벽의 구멍은 양쪽 칸에 모두 기록한다. 높이 지도에 고이는 빗물을 경계에서 min heap으로 채워 들어가는 문제도 같은 구조다.
- 목적지 하나의 값만 필요하면 답 x를 정하고 무게 x 이하 간선만으로 닿는지 BFS로 판정하는 [[Binary-Search-and-LIS#답을 이분탐색하기|답 이분탐색]]도 된다. 무방향 그래프에서는 MST 위의 두 정점 사이 경로가 그 쌍의 minimax 경로다. 그 경로의 가장 무거운 간선 e보다 가벼운 간선만으로 두 정점을 잇는 경로가 있으면, e를 빼고 끊어진 두 부분을 그 경로의 간선 하나로 다시 이은 spanning tree가 더 가벼워 MST라는 가정에 어긋나기 때문이다. 쌍 질의가 많으면 [[Graph-Optimization-Algorithms#Minimum Spanning Tree|MST]]를 한 번 만들어 쓴다.

### 도달 가능성만 필요할 때: 추이 폐쇄

거리 대신 i에서 j로 갈 수 있는지만 필요하면 Floyd-Warshall의 `min`과 `+`를 OR와 AND로 바꾼다. `reach[i][j] |= reach[i][k] && reach[k][j]`를 k, i, j 순서로 돌리면 O(V³)에 모든 쌍의 도달 여부(추이 폐쇄)가 나온다.

사건 쌍 (a, b)가 a가 먼저라는 관계로 주어지고 질의마다 두 사건의 선후를 답하는 문제는, a → b 간선으로 추이 폐쇄를 구한 뒤 `reach[a][b]`면 a가 먼저, `reach[b][a]`면 b가 먼저, 둘 다 아니면 알 수 없음으로 답한다. 한 행렬에 a → b는 -1, b → a는 1로 함께 기록하고 같은 부호가 이어질 때만 전파해도 같다. 정점이 수백 개면 충분하고, 한 정점에서 닿는 집합만 필요하면 BFS 한 번(O(V + E))이 낫다.

## 최단 경로 간선을 모두 뺀 재탐색

최단 경로에 쓰인 간선을 하나도 쓰지 않는 가장 짧은 경로(거의 최단 경로)는 세 단계로 구한다.

1. S에서 Dijkstra로 `dist`를 구한다.
2. E에서 거꾸로 올라가며 `dist[u] + w(u, v) == dist[v]`를 만족하는 간선 (u, v)를 모두 표시한다. 역방향 adjacency list를 두고 E에서 BFS하듯 이미 방문한 정점은 다시 넣지 않는다. 최단 경로가 여러 개면 그 간선을 모두 지워야 하므로 `prev` 하나로 경로 하나만 복원해 지우면 틀린다.
3. 표시한 간선을 건너뛰며 Dijkstra를 다시 돌리고, E의 거리가 INF로 남으면 경로가 없다.

adjacency list에서 간선을 실제로 지우려면 그 간선을 찾아 목록을 훑어야 하므로, 가중치를 -1처럼 나올 수 없는 값으로 바꾸거나 삭제 flag를 두고 탐색할 때 건너뛰는 논리 삭제가 간단하다.

## Bellman-Ford로 최대 이익과 무한 판정

도시마다 벌 수 있는 돈이 있고 간선마다 비용이 들 때 도착 도시에서 가진 돈을 최대로 만드는 문제는 음수 간선이 섞인 최장 경로 문제다.

- 간선 u → v의 값을 v에서 버는 돈에서 간선 비용을 뺀 값으로 본다. `dist`를 음의 무한대로, `dist[start]`를 출발 도시에서 버는 돈으로 초기화한 뒤 더 큰 값으로 완화하고, `dist[u]`가 음의 무한대인 간선은 건너뛴다.
- V - 1번 완화한 뒤 V번째 pass에서도 갱신되는 정점은 돈이 계속 늘어나는 cycle의 영향을 받는다. 그 정점들을 queue에 넣고 BFS로 도착 도시에 닿는지 확인해 닿을 때만 무한으로 판정한다. cycle이 있어도 도착 도시로 이어지지 않으면 유한한 최댓값을 낸다.
- 결과는 세 가지다. `dist[도착]`이 음의 무한대로 남으면 도달 불가, 위 BFS가 도착 도시에 닿으면 무한, 나머지는 `dist[도착]`이다.

출발점에서 닿는 양의 cycle마다 V번째 pass에서 적어도 한 정점이 갱신된다. cycle의 어느 간선도 완화되지 않는다면 간선마다 `dist[v] >= dist[u] + w`이고, cycle을 따라 모두 더하면 cycle 가중치 합이 0 이하가 되어 가정과 모순이기 때문이다. 그래서 갱신된 정점에서 출발한 BFS가 cycle의 영향이 닿는 정점을 빠짐없이 찾는다. 최솟값 문제의 음수 cycle도 부등호만 바꿔 같은 방식으로 판정한다.

## A*: 목적지 방향으로 탐색 줄이기

한 쌍의 경로만 필요하고 목적지까지 남은 비용을 과대평가하지 않게 추정할 수 있으면(4방향 격자의 맨해튼 거리, 평면 지도의 직선 거리) A*를 검토한다. 게임의 길찾기처럼 목적지가 하나인 탐색에서 쓴다.

- 출발점부터의 실제 비용 g(v)에 목적지까지의 추정 h(v)를 더한 `f = g + h`가 가장 작은 정점부터 확장한다. h가 항상 0이면 Dijkstra와 같다.
- h가 실제 남은 비용을 넘지 않으면(admissible), 더 짧은 경로가 나올 때 이미 확정한 정점도 다시 여는 구현에서 최단 경로를 보장한다. 한 번 확정한 정점을 다시 열지 않는 보통의 구현에서는 모든 간선 (u, v)에 대해 `h(u) <= w(u, v) + h(v)`인 consistent heuristic이어야 한다.
- consistent h로 돌리는 A*는 간선 가중치를 `w(u, v) - h(u) + h(v)`(음수가 아니다)로 바꾼 그래프에서 Dijkstra를 돌리는 것과 같다. 목적지 쪽 간선이 싸 보이므로 먼저 확장된다.
- 한 출발점에서 모든 정점까지의 거리가 필요하면 향할 목적지가 없으므로 Dijkstra를 쓴다.

## 선택 기준

| 질문 | 변형 |
|---|---|
| 모든 정점에서 한 목적지까지, 또는 왕복 | 역방향 그래프 Dijkstra |
| X보다 반드시 앞서거나 뒤인 정점 수 | 정방향과 역방향 탐색 한 번씩 |
| 같은 정점에서도 이후 비용이 상태에 따라 다름 | (정점, 상태) Dijkstra |
| 특정 간선을 지나는 최단 경로가 있는지 | 가중치 두 배와 parity |
| 경로 값이 가장 무거운 간선(병목) | `max`로 완화하는 Dijkstra, 무방향이면 MST |
| 모든 쌍의 도달 여부 | bool Floyd-Warshall(추이 폐쇄) |
| 최단 경로 간선을 쓰지 않는 가장 짧은 경로 | 모든 최단 경로 간선 표시 뒤 재탐색 |
| 음수 간선, 이익이 무한히 느는 cycle | Bellman-Ford와 갱신 정점 BFS |
| 한 쌍, 과대평가하지 않는 추정치 | A* |

## 출처

- 인프런, 큰돌 강사, [8주차 개념 #2. 다익스트라(Dijkstra)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=147925), [8주차 개념 #4. 벨만-포드(Bellman-Ford)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=251698), [8-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101066), [8-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101067), [8-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101068)
- 인프런, 큰돌 강사, [8-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101069), [8-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101070), [8-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101071), [8-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101072), [8-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101077)
- 인프런, 큰돌 강사, [8-Y](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101078)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Dijkstra 개념, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135773)

- [UC Berkeley CS 188, Note 3](https://inst.eecs.berkeley.edu/~cs188/sp24/assets/notes/cs188-sp24-note03.pdf)
- [NIST DADS, Dijkstra's algorithm](https://xlinux.nist.gov/dads/HTML/dijkstraalgo.html)
- [NIST DADS, Bellman-Ford algorithm](https://xlinux.nist.gov/dads/HTML/bellmanford.html)
- [NIST DADS, transitive closure](https://xlinux.nist.gov/dads/HTML/transitiveClosure.html)
- [Princeton Algorithms, Minimum Spanning Trees](https://algs4.cs.princeton.edu/43mst/)

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[Graph-Traversal-and-Shortest-Path-Grid-BFS|grid BFS 패턴]]
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘 인덱스]]
- [[Exhaustive-Search-and-Backtracking|상태 공간 탐색]]
- [[Heap|Priority Queue]]

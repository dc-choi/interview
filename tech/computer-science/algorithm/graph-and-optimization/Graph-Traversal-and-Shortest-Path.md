---
tags: [cs, algorithm, graph, dfs, bfs, dijkstra, shortest-path]
status: done
category: "CS - 알고리즘"
aliases: ["Graph Traversal and Shortest Path", "DFS BFS", "그래프 탐색", "Dijkstra", "다익스트라"]
---

# 그래프 탐색과 최단 경로

그래프는 vertex와 그 관계인 edge로 연결 구조를 표현한다. edge에 방향, weight, parallel edge와 self-loop를 허용하는지는 문제 모델이 정한다.

## 용어와 입력 가정

- **차수(degree)**: 정점에 연결된 간선 수. 방향 그래프에서는 나가는 outdegree와 들어오는 indegree로 나눈다. indegree가 0인 정점부터 지워 가는 것이 [[Topological-Sort|위상 정렬]]이다.
- **간선과 가중치**: 방향 간선 (u, v)는 u(from)에서 v(to)로 가는 간선이고, 무방향 간선은 양쪽 방향 간선 두 개로 본다. 가중치는 간선을 지나는 비용으로 시간, 거리, 요금처럼 문제가 정한다. 인접 행렬에는 무방향 간선을 `a[u][v] = a[v][u] = 1`로 대칭 기록하고, self-loop가 없으면 대각선은 0이다.
- **사이클**: 한 정점에서 출발해 자신으로 돌아오는 경로. 하나라도 있으면 순환 그래프, 없으면 비순환 그래프다. 방향 그래프는 모양이 고리여도 간선 방향 때문에 사이클이 아닐 수 있다.
- **완전 그래프**는 모든 정점 쌍이 연결된 그래프, **연결 그래프**는 모든 정점 쌍 사이에 경로가 있는 그래프다.
- **단순 그래프**는 두 정점 사이 간선이 하나 이하이고 자기 자신으로 가는 간선(loop)이 없는 그래프다.

문제가 연결 그래프, 단순 그래프라고 명시하지 않으면 분리된 component, 같은 간선의 중복, loop가 있어도 맞게 동작하도록 짠다. 특히 1번 정점 하나에서만 탐색을 시작하면 분리된 정점을 놓친다.

## 표현 선택

| 표현 | 공간 | edge 존재 확인 | neighbor 순회 | 적합한 경우 |
|---|---:|---:|---:|---|
| adjacency list | O(V+E) | 보통 degree에 비례 | O(degree) | sparse graph, 대부분의 탐색 |
| adjacency matrix | O(V²) | O(1) | O(V) | dense graph, 작은 고정 graph |

- 두 정점의 연결 여부를 자주 묻거나 E가 V²에 가까우면 matrix, 정점의 이웃을 자주 훑거나 E가 V²보다 훨씬 작으면 list가 낫다. V가 10만이면 matrix는 메모리부터 들어가지 않으므로 대부분 list를 쓰고, V가 작아 구현이 편하거나 Floyd-Warshall처럼 모든 쌍을 다룰 때 matrix를 쓴다. 중복 간선을 허용하면 matrix에는 1 대신 간선 개수를 저장한다. 입력이 격자 지도나 인접 행렬로 주어지면 다른 표현으로 옮기지 말고 그대로 탐색한다.
- 무방향 그래프는 `adj[u].push_back(v); adj[v].push_back(u);`처럼 양쪽에 넣는다. 모든 list 길이의 합은 방향 그래프 E, 무방향 그래프 2E다.
- 표준 컨테이너를 쓸 수 없으면 정점마다 최대 차수 크기의 배열을 잡지 말고(O(V²)), 간선 목록을 먼저 받아 정점별 차수를 센 뒤 그 크기만큼씩 한 배열을 나눠 쓴다.

map/set 기반 adjacency list는 구현이 편하지만 object overhead와 iteration order가 결과에 영향을 줄 수 있다. 정점 ID가 조밀하면 array가 더 단순하다.

## DFS

Depth-First Search는 한 경로를 더 갈 수 없을 때까지 따라간 뒤 backtrack한다. recursion 또는 explicit stack으로 구현한다.

```text
visited[start] = true
start를 처리하고 stack에 (start, 다음 neighbor index 0) 추가
stack이 빌 때까지:
  (vertex, nextIndex) = stack 최상단
  nextIndex가 vertex의 모든 neighbor를 가리켰다면 stack에서 제거하고 계속
  stack 최상단의 nextIndex를 1 증가
  neighbor = vertex의 원래 nextIndex번째 neighbor
  아직 방문하지 않았다면:
    visited[neighbor] = true
    neighbor 처리
    stack에 (neighbor, 다음 neighbor index 0) 추가
```

cycle이 있는 graph에서는 visited가 없으면 끝나지 않는다. directed cycle 탐지처럼 현재 recursion path와 전체 방문 완료를 구분해야 하는 문제도 있다.

재귀 DFS는 방문 검사를 두는 위치에 따라 두 형태다. 호출 전에 `if (!visited[v]) dfs(v);`로 거르면 무효 이웃에 호출 frame을 만들지 않고, 함수 첫 줄의 `if (visited[u]) return;`으로 거르면 검사가 한 곳에 모여 호출부가 단순한 대신 이웃마다 frame이 생긴다. 격자에서 진입 검사를 쓰면 범위 검사도 함수 첫 줄에 함께 둔다. 어느 쪽이든 방문 표시는 함수에 들어온 직후 한다.

활용: connected component, cycle 탐지, topological sort, 모든 경로 탐색과 backtracking, tree 판정([[Trees-and-Balanced-Search-Trees#그래프로 본 트리|그래프로 본 트리]]). 단절점(articulation point)과 강한 연결 요소(SCC)를 찾는 알고리즘도 DFS 방문 순서를 바탕으로 한다.

방문만 표시하는 void DFS 대신 값을 돌려받으면 세는 문제가 짧아진다. `int dfs(u)`에서 `visited[u] = 1; int ret = 1;`로 시작해 미방문 이웃마다 `ret += dfs(v);`를 더해 돌려주면 u에서 도달하는 정점 수(무방향이면 component 크기)다. 방향 그래프에서 시작점마다 도달 가능한 정점 수는 시작점마다 visited를 비우고 다시 돌려 O(V(V + E))다. 이를 `reach[u] = 1 + Σ reach[v]`로 memoization하면 공유 후손을 두 번 센다(1→2, 1→3, 2→4, 3→4에서 5가 나오지만 실제는 4). cycle이 있으면 값이 정의되지도 않는다. 영향이 전파되는 방향이 따로 정해진 문제(A가 B를 신뢰하면 B를 해킹할 때 A도 해킹된다)는 간선을 전파 방향(B → A)으로 넣는다. 길이가 정확히 K인 경로 수처럼 경우의 수를 셀 때도 하위 호출의 반환값을 더하며, 방문 표시와 해제를 한 쌍으로 둔다([[Exhaustive-Search-and-Backtracking#재귀 상태의 구성|apply와 undo]]).

## BFS

Breadth-First Search는 start에서 edge 수가 같은 level을 차례로 방문하며 queue를 쓴다. neighbor를 queue에 넣을 때 visited를 표시해야 같은 정점이 여러 번 enqueue되는 것을 줄일 수 있다.

unweighted graph 또는 모든 edge cost가 같은 graph에서 처음 도달한 level이 최단 edge 수다. weight가 다른 graph에 BFS 최단 경로 성질을 그대로 적용하면 안 된다.

활용: unweighted shortest path, 최소 단계, 가까운 관계 탐색, level-order traversal.

grid 탐색은 각 cell을 vertex, 이동 가능 관계를 edge로 본 graph 문제다. `(y, x)`와 방향 vector의 순서를 통일하고 범위 검사 뒤 방문 처리한다. connected component 수나 넓이는 아직 방문하지 않은 cell마다 DFS/BFS를 새로 시작해 계산한다.

adjacency list를 쓰고 위처럼 vertex별 다음 neighbor index를 frame에 보존하면 DFS는 재귀 구현과 같은 순서로 각 vertex와 edge를 상수 번 확인해 O(V+E), 추가 공간은 visited와 최대 V개의 stack frame으로 O(V)다. 전체 graph가 disconnected라면 모든 vertex에서 미방문 component를 다시 시작한다.

### grid BFS

grid에서 flood fill, 최단 거리, multi-source, 두 종류 시작점, 1차원 상태 BFS를 푸는 정석 틀과 흔한 실수, 영역 번호와 크기 표, 턴 단위 BFS와 격자가 바뀌는 시뮬레이션은 [[Graph-Traversal-and-Shortest-Path-Grid-BFS|grid BFS 패턴]]으로 분리했다.

### 탐색 비용에서 E를 잊지 않기

인접 리스트 BFS와 DFS는 O(V + E)라서 간선이 많으면 V만 보고 판단하면 안 된다. V = 2000인 완전 그래프는 간선이 약 200만 개라 BFS 한 번에 수백만 연산이고, 이를 시작점마다 1000번 돌리면 수십억 연산이 된다. matrix로 표현하면 이웃 확인 때문에 O(V²)이다.

추가 메모리는 DFS가 최대 재귀 깊이(한 줄로 긴 그래프면 O(V)), BFS가 한 level의 frontier 너비(한 정점에 이웃이 몰리면 O(V))에 비례한다. 최악은 둘 다 O(V)라 queue를 쓰는 BFS가 항상 더 많이 쓴다고 단정하지 않는다. 재귀 DFS는 깊이만큼 call stack을 쓰므로 스택 메모리가 작게 제한된 환경에서 정점이 수만 개인 경로 그래프를 만나면 runtime error가 난다([[Algorithm-Recursion#Call stack과 비용|call stack 한도]]). 이때는 명시적 stack으로 바꾼다. queue를 stack으로 바꾸고 넣을 때 방문 표시하는 순회는 모든 정점을 방문하지만 재귀 DFS와 방문 순서가 다르다. 순서까지 재귀와 같아야 하면 위 DFS 절의 다음 neighbor index를 보존하는 방식을 쓰거나, 꺼낼 때 방문 표시를 하고 이미 방문한 정점은 건너뛰는 방식을 쓴다. 후자는 같은 정점이 stack에 여러 번 들어가므로 간선 수만큼 공간이 들고, 작은 번호부터 방문하려면 이웃을 역순으로 넣는다.

### 0-1 BFS

edge weight가 0 또는 1뿐이면 deque로 Dijkstra의 우선순위를 단순화할 수 있다. 0-weight edge로 거리가 줄면 front, 1-weight edge면 back에 넣어 처리하며 O(V+E)다. 일반 양의 weight graph에는 적용하지 않는다. 현재 턴 queue와 다음 턴 queue를 번갈아 쓰는 방식도 같은 값을 준다([[Graph-Traversal-and-Shortest-Path-Grid-BFS#턴 단위 BFS|턴 단위 BFS]]).

## 위상 정렬

사이클 없는 방향 그래프에서 의존 순서를 세우는 Kahn 알고리즘과 사이클 판정은 [[Topological-Sort|위상 정렬]]로 분리했다.

## Dijkstra

Dijkstra는 **negative weight가 없는 graph**에서 한 source부터 다른 vertex까지의 최단 거리를 구한다. 핵심은 relaxation이다.

```text
dist[source] = 0, 나머지는 Infinity
priority queue에서 dist가 가장 작은 vertex를 꺼냄
각 edge (u, v, w)에 대해:
  dist[v] > dist[u] + w 이면 갱신
```

binary heap priority queue와 adjacency list를 쓰면 보통 O((V+E) log V)로 표현한다. decrease-key 대신 갱신 값을 새로 push하는 구현은 stale entry를 꺼냈을 때 현재 `dist`와 비교해 건너뛴다.

- **왜 맞는가**: 매번 아직 확정되지 않은 정점 중 가장 가까운 정점의 거리를 확정하는 greedy다. 확정한 정점 v보다 짧게 가는 우회 경로가 있다면 그 경로의 중간 정점이 v보다 가까워 먼저 선택됐어야 하므로 모순이다. 간선이 음수가 아니라는 가정이 이 논증에 필요하다.
- **O(V² + E) 배열 구현**: 매번 미확정 정점 중 최솟값을 선형 탐색한다. V가 수천 이하이거나 간선이 V²에 가까운 조밀한 그래프에서는 충분하지만, V가 수만이면 통과하지 못한다. E가 V²에 가까우면 heap 구현은 O(V² log V)라 배열 구현이 오히려 빠르고, stale entry 처리도 필요 없다. 선형 탐색으로 고른 최솟값이 INF면 남은 정점은 도달할 수 없으므로 멈춘다. 계속 돌면 INF에 weight를 더하다 overflow한다.
- **한 목적지만 필요하면**: 목적지가 확정되는 순간(heap에서 꺼내거나 선형 탐색으로 고를 때) 거리가 최종이므로 거기서 멈춰도 된다.
- **힙 구현의 주의점**: `(거리, 정점)` pair를 `greater`로 정렬한 최소 힙에 넣는다. 한 정점이 여러 번 들어갈 수 있으므로 꺼낸 거리가 현재 `dist[v]`와 다르면(이미 더 짧게 확정됨) 건너뛰어야 한다. 이 검사를 빠뜨리면 같은 정점의 간선을 반복해서 훑어 시간이 초과된다. 힙에 최대 E개가 쌓이므로 O(E log E)다.
- **경로 복원**: 거리를 갱신할 때 `pre[v] = u`를 함께 기록하고, 도착점에서 `pre`를 따라 시작점까지 거슬러 올라간 뒤 뒤집는다.

negative edge에서는 확정한 거리가 나중에 더 작아질 수 있어 Dijkstra의 greedy invariant가 깨진다. Bellman-Ford 같은 알고리즘을 검토하며, negative cycle이 있으면 최단 경로 자체가 정의되지 않을 수 있다.

## Bellman-Ford

Bellman-Ford는 source에서 도달 가능한 모든 edge를 최대 `V-1`번 반복해 relax한다. simple shortest path가 cycle을 제거하면 edge를 최대 `V-1`개 사용한다는 성질에 근거하며 시간은 O(VE)다.

`V`번째 pass에서도 거리가 줄어드는 vertex가 있으면 source에서 도달 가능한 negative cycle의 영향을 받는다. 문제의 target까지 그 영향이 전파되는지도 따로 확인해야 한다(방법은 [[Graph-Traversal-and-Shortest-Path-Variants#Bellman-Ford로 최대 이익과 무한 판정|최단 경로 변형]]). 도달하지 못한 `Infinity` 값에는 weight를 더하지 않는다.

## Floyd-Warshall

Floyd-Warshall은 `dist[i][j]`가 중간 정점 집합 `{0..k-1}`만 허용한 최단 거리라는 invariant로 모든 쌍 거리를 갱신한다.

```text
for k, i, j:
  dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
```

시간 O(V³), 공간 O(V²)이다. negative edge는 허용하지만 negative cycle을 통과할 수 있는 쌍에는 유한한 최단 거리가 없다. 계산 뒤 `dist[v][v] < 0`인 정점으로 cycle을 탐지할 수 있다.

- 거쳐 가는 정점 k를 반드시 가장 바깥 loop에 둔다. i, j, k 순서로 바꾸면 작은 예제는 맞는데 제출하면 틀리는 경우가 많다. 자기 자신으로 가는 거리는 0으로, 간선 없는 쌍은 INF로 초기화하고, 같은 쌍에 간선이 여러 개면 최솟값만 남긴다.
- INF는 `0x3f3f3f3f`(약 10억)처럼 두 번 더해도 `int`를 넘지 않는 값을 쓴다. `0x7fffffff` 같은 최댓값은 `dist[i][k] + dist[k][j]`에서 overflow한다. `dist[i][k]`와 `dist[k][j]`가 둘 다 INF가 아닐 때만 비교하는 방법도 있는데, 음수 간선이 있으면 이 검사가 필요하다. INF에 음수를 더한 값이 INF보다 작아 닿지 않는 쌍이 유한한 거리로 바뀌고, 마지막의 `== INF` 도달 불가 판정이 틀린다.
- 흔히 V가 수백(400 안팎) 이하일 때 고르지만, 덧셈과 비교만 반복하는 구조라 V = 1000(10억 번 연산)도 시간 제한에 따라 가능하다. 시간이 빠듯하면 `min`으로 매번 대입하지 말고 `if (dist[i][k] + dist[k][j] < dist[i][j])`일 때만 대입한다.
- 도달 여부만 필요하면 같은 k, i, j 순서로 `reach[i][j] |= reach[i][k] && reach[k][j]`를 돌려 추이 폐쇄를 구한다([[Graph-Traversal-and-Shortest-Path-Variants#도달 가능성만 필요할 때: 추이 폐쇄|추이 폐쇄]]).
- **경로 복원**: `nxt[s][t]`를 s에서 t로 최단 경로로 갈 때 처음 들르는 정점으로 둔다. 간선을 입력받을 때 `nxt[s][t] = t`로 채우고, k를 거쳐 가는 쪽으로 갱신될 때 `nxt[s][t] = nxt[s][k]`로 바꾼다(k로 가는 경로의 첫 정점이 곧 전체 경로의 첫 정점이다). 복원은 `cur = s`에서 시작해 `cur = nxt[cur][t]`를 t에 닿을 때까지 반복한다.

## 거리뿐 아니라 경로 복원

relaxation으로 `dist[v]`를 갱신할 때 `prev[v] = u`도 저장한다. target에서 `prev`를 따라 source까지 역추적한 뒤 뒤집으면 실제 route가 된다. 여러 최단 경로가 있으면 tie-break 정책에 따라 하나만 얻는다.

## 최단 경로 변형

모든 정점에서 한 목적지까지의 거리와 앞뒤로 닿는 정점 수(역방향 그래프), 같은 정점에서도 상태에 따라 비용이 달라지는 Dijkstra와 가중치 스케일링, 특정 간선 통과를 판별하는 parity 인코딩, 경로 값이 합이 아닌 minimax Dijkstra와 추이 폐쇄, 최단 경로 간선을 모두 뺀 재탐색, Bellman-Ford의 무한 이익 판정과 A*는 [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]]으로 분리했다.

## DFS, BFS, Dijkstra 선택

| 질문 | 선택 |
|---|---|
| 도달 가능한가, component/cycle 구조는 무엇인가 | DFS 또는 BFS |
| edge 수 기준 최소 단계인가 | BFS |
| non-negative weight의 최소 비용인가 | Dijkstra |
| 경로 비용이 합이 아니라 가장 무거운 간선인가 | `max`로 완화하는 Dijkstra |
| 모든 vertex에서 한 target까지인가 | 간선을 뒤집어 target에서 Dijkstra |
| negative edge가 있는가 | Bellman-Ford 등 |
| 모든 vertex pair 거리인가 | Floyd-Warshall 또는 반복 SSSP |

## 출처

- 인프런, 큰돌 강사, [2주차 개념 #1. 그래프이론의 기초(Graph, Vertex, Edge, Weight)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134738), [2주차 개념 #4-1. 인접행렬(adjacency matrix)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134742), [2주차 개념 #4-2. 인접행렬(adjacency matrix)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146955), [2주차 개념 #5. 인접리스트(adjacency list)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134743), [2주차 개념 #6. 인접행렬과 인접리스트의 차이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=135532)
- 인프런, 큰돌 강사, [2주차 개념 #7. 맵과 방향벡터(direction vector)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134744), [2주차 개념 #8. 연결된 컴포넌트(connected component)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134741), [2주차 개념 #9. 깊이우선탐색(DFS, Depth First Search)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134745), [2주차 개념 #10. 너비우선탐색(BFS, Breadth First Search)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134746), [2주차 개념 #11. DFS와 BFS 비교](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100309)
- 인프런, 큰돌 강사, [2-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100325), [2-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100326), [2-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100327), [2-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100328), [2-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100341)
- 인프런, 큰돌 강사, [2-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100343), [4-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100390), [5-Y](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100420), [7-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100979), [8주차 개념 #2. 다익스트라(Dijkstra)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=147925)
- 인프런, 큰돌 강사, [8주차 개념 #3. 플로이드 워셜(Floyd-Warshall)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=251697), [8주차 개념 #4. 벨만-포드(Bellman-Ford)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=251698), [8-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101066), [8-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101067), [8-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101068)
- 인프런, 큰돌 강사, [8-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101069), [8-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101070), [8-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101071), [8-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101072), [8-U](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101074)
- 인프런, 큰돌 강사, [8-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101077), [8-Y](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101078), [3-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100372)

- [바킹독의 실전 알고리즘 0x09강, BFS — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=ftOmGdm95XI)
- [바킹독의 실전 알고리즘 0x0A강, DFS — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=93jy2yUYfVE)
- [바킹독의 실전 알고리즘 0x18강, 그래프 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=9iI6fuOLiLg)
- [바킹독의 실전 알고리즘 0x1C강, 플로이드 알고리즘 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=dDDy2bEZRA8)
- [바킹독의 실전 알고리즘 0x1D강, 다익스트라 알고리즘 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=o9BnvwgPT-o)
- [NIST Dictionary — Breadth-First Search](https://www.nist.gov/dads/HTML/breadthfirst.html)
- [NIST DADS, Dijkstra's algorithm](https://xlinux.nist.gov/dads/HTML/dijkstraalgo.html)
- [NIST DADS, Bellman-Ford algorithm](https://xlinux.nist.gov/dads/HTML/bellmanford.html)
- [NIST DADS, Floyd-Warshall algorithm](https://xlinux.nist.gov/dads/HTML/floydWarshall.html)
- [Princeton Algorithms, NonrecursiveDFS.java](https://algs4.cs.princeton.edu/41graph/NonrecursiveDFS.java.html)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — DFS와 BFS, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135789)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Dijkstra 개념, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135773)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Dijkstra 구현, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135774)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 경로 복원, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135790)

## 관련 문서

- [[Graph-Optimization-Algorithms|MST, 최대 유량과 interval scheduling]]
- [[Heap|Priority Queue]]
- [[Algorithm-Complexity|시간복잡도]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Exhaustive-Search-and-Backtracking|상태 공간과 BFS]]
- [[Graph-Traversal-and-Shortest-Path-Grid-BFS|grid BFS 패턴]]
- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]]
- [[Topological-Sort|위상 정렬]]
- [[Contraction-Hierarchies|축약 계층과 반복적인 도로망 질의]]

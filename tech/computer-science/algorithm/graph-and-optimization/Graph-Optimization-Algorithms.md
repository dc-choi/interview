---
tags: [cs, algorithm, graph, greedy, matroid, mst, prim, union-find, max-flow, ford-fulkerson]
status: done
category: "CS - 알고리즘"
aliases: ["Graph Optimization Algorithms", "Minimum Spanning Tree", "최소 신장 트리", "Maximum Flow", "최대 유량", "Interval Scheduling", "Matroid", "Union-Find"]
verified_at: 2026-09-30
---

# Greedy, 최소 신장 트리와 최대 유량

Greedy algorithm은 매 단계에서 현재 기준으로 가장 좋은 선택을 확정한다. 지역 최적 선택을 했다는 사실만으로 전체 최적해가 보장되지는 않으며, greedy-choice property(지금의 국소 최선 선택을 포함하는 최적해가 존재한다는 성질)와 optimal substructure를 증명해야 한다. 앞선 선택이 뒤 선택에 영향을 주지 않는다는 성질과는 다르다.

## Greedy를 검증하는 방법

- **Exchange argument**: 어떤 optimal solution도 greedy 선택을 포함하도록 손해 없이 교환할 수 있음을 보인다.
- **Stays-ahead**: 각 단계에서 greedy solution이 다른 후보보다 뒤처지지 않음을 보인다.
- **Cut property**: MST처럼 cut을 가로지르는 safe edge를 선택해도 optimal solution이 존재함을 보인다.
- **Matroid**: 원소 집합과 독립 집합족이 (1) 독립 집합의 부분집합도 독립이고 (2) 더 큰 독립 집합 Y가 있으면 독립 집합 X에 Y에만 있는 원소 하나를 더해도 독립을 유지할 수 있으면 matroid다. (1)만 만족하는 체계에서 무거운 원소부터 독립을 유지하며 담는 greedy가 모든 가중치에 대해 최적인 것은 그 체계가 matroid일 때뿐이다. graph의 forest를 독립 집합으로 보는 graphic matroid에서 이 greedy가 Kruskal이다. 반대로 interval scheduling, Dijkstra, Huffman coding처럼 matroid가 아니어도 greedy가 최적인 문제가 있으므로, 이때는 위의 exchange argument나 stays-ahead로 증명한다.

동전 교환에서 큰 동전부터 고르는 전략은 특정 화폐 체계에서는 맞지만 임의 denomination에서는 실패할 수 있다(어느 체계에서 맞는지와 판정법은 [[Greedy-Sweep-and-Two-Pointers#대표 예제와 틀린 greedy|동전 예제]]). 예시가 맞았다는 것과 algorithm이 항상 맞다는 것은 다르다.

## Interval scheduling

겹치지 않는 interval을 가장 많이 선택하려면 시작이 가장 빠르거나, 길이가 가장 짧거나, 다른 interval과 가장 적게 겹치는 것이 아니라 **finish time이 가장 이른 interval**을 고른다.

1. finish time 오름차순으로 정렬한다.
2. 직전에 선택한 interval의 finish 이후 시작하는 첫 interval을 선택한다.
3. 끝까지 반복한다.

정렬이 O(n log n), scan이 O(n)이다. weighted interval처럼 각 작업 가치가 다르면 이 greedy rule로 풀리지 않고 dynamic programming이 필요하다.

가장 그럴듯한 오답은 가장 적게 겹치는 interval부터 고르는 기준이다. 반쯤 열린 구간 A[0,3), B[3,6), C[6,9), D[9,12)가 최적 4개일 때 B와 C에만 걸치는 X[5,7)을 두고, A와 B에 걸치는 [2,4)와 C와 D에 걸치는 [8,10)을 세 개씩 쌓으면 겹침 수는 X가 2, A와 D가 3, 나머지가 4다. 이 기준은 X를 먼저 골라 B와 C를 잃고 3개에 그친다.

## Minimum Spanning Tree

connected, undirected, weighted graph의 spanning tree는 모든 vertex를 cycle 없이 연결하는 `V-1`개 edge 집합이다. 그 weight 합이 최소인 것이 MST다. 최단 경로 tree와 목적이 다르다. Prim과 Kruskal은 무방향 graph를 전제한다. 방향 graph에서 정한 root로부터 모든 정점에 닿는 최소 비용 간선 집합은 minimum spanning arborescence 문제이며 Chu-Liu/Edmonds 알고리즘 같은 별도 방법이 필요하다.

### Prim algorithm

Prim은 한 vertex에서 시작해 현재 tree와 바깥을 잇는 가장 가벼운 edge를 반복 선택한다. priority queue에는 바깥 vertex로 가는 candidate edge를 넣는다.

- adjacency list와 binary heap: 보통 O(E log V)
- graph가 disconnected면 하나의 spanning tree가 아니라 component별 minimum spanning forest가 나온다.
- 같은 weight가 있으면 MST가 여러 개일 수 있다.

구현은 `chk[v]`로 트리에 들어간 정점을 표시하고 `(weight, from, to)`를 최소 힙에 넣는 lazy 방식이 단순하다. 시작 정점의 간선을 모두 넣은 뒤, 꺼낸 간선의 도착 정점이 이미 트리에 있으면 버리고(사이클), 아니면 채택해 그 정점을 표시하고 트리 밖으로 나가는 간선만 다시 넣는다. 채택 간선이 V-1개가 되면 멈춘다. 힙에 간선이 최대 E개 쌓이므로 O(E log E)이며, 같은 비용이 여러 개면 아무거나 꺼내도 결과 비용은 같다.

Dijkstra와 priority queue 모양이 비슷하지만 비교값이 다르다. Dijkstra는 source부터의 누적 거리, Prim은 현재 tree로 들어오는 edge weight를 기준으로 갱신한다. 네트워크의 [[Physical-DataLink-Layer|Spanning Tree Protocol]]도 loop-free topology를 만들지만 일반 graph의 MST cost 최적화 문제와 동일하지 않다.

Dijkstra 코드에서 비교값만 바꿔 Prim을 만들 때는 정점마다 `{cost, prev}`를 두고, 매번 tree 밖 정점 중 cost가 가장 작은 정점을 넣은 뒤 이웃 v의 cost를 `dist[u] + w` 대신 `w`와 비교해 갱신한다. 끝나면 시작 정점을 뺀 각 v의 `(prev[v], v)`가 MST 간선이고 cost 합이 MST 가중치다. 이때 갱신은 아직 tree에 없는 정점에만 해야 한다. Dijkstra는 음수 간선이 없으면 확정된 `dist[v] <= dist[u] + w`라 이 검사가 없어도 결과가 같지만 Prim은 다르다. A-B 5, B-C 1에서 A부터 시작하면 C를 넣은 뒤 간선 C-B(1)가 이미 들어간 B의 cost 5보다 작아 B의 prev가 C로 바뀌고, B와 C가 서로를 가리키며 A-B 간선이 사라진다.

### Kruskal과 Union-Find

Kruskal은 edge를 weight 오름차순으로 보고 서로 다른 component를 잇는 edge만 선택한다. 어떤 cut을 가로지르는 최소 edge가 safe하다는 cut property가 근거다.

Union-Find 또는 disjoint-set union은 각 원소가 속한 component의 대표를 관리한다.

- `find(x)`: 대표를 찾고 path compression으로 경로를 짧게 만든다.
- `union(a, b)`: 대표가 다를 때 rank/size가 작은 tree를 큰 tree 아래에 붙인다.

각 그룹을 루트가 대표인 트리로 두고 부모 배열 하나로 구현한다. 모든 원소의 그룹 번호를 배열로 들고 합칠 때 전체를 바꾸면 union이 O(n)이지만, 트리로 두면 루트끼리 연결하는 것으로 끝난다. 최적화 없이 한쪽으로만 붙이면 트리가 일자로 길어져 find가 O(n)이 된다.

```cpp
std::vector<int> p(n + 1, -1);  // 음수면 루트이고, 절댓값은 rank(높이의 상한)

int find(int x) {
  if (p[x] < 0) return x;
  return p[x] = find(p[x]);  // 경로 압축: 지나온 정점을 루트에 바로 붙인다
}

bool uni(int u, int v) {
  u = find(u); v = find(v);
  if (u == v) return false;          // 이미 같은 그룹, Kruskal에서는 사이클
  if (p[v] < p[u]) std::swap(u, v);  // rank가 큰 쪽을 u로
  if (p[u] == p[v]) p[u]--;          // 높이가 같으면 합친 뒤 1 증가
  p[v] = u;
  return true;
}
```

- union by rank만 쓰면 높이가 O(log n)으로 제한되어 연산당 O(log n), 경로 압축만 쓰면 amortized O(log n), 둘 다 쓰면 amortized O(α(n))이다(α는 아커만 함수의 역함수로 사실상 상수).
- 코딩 테스트에서는 코드가 짧은 경로 압축만으로도 충분히 빠르다. 재귀 find는 경로 압축 전 처음 한 번 깊어질 수 있으므로 스택이 작은 환경에서는 반복문으로 바꾼다.

두 최적화를 함께 쓰면 연산의 amortized cost는 거의 상수인 O(α(V))이고, Kruskal 전체는 edge 정렬이 지배해 O(E log E)다. 이미 대표가 같은 edge를 추가하면 cycle이 되므로 건너뛴다. `V-1`개를 선택하기 전에 edge가 끝나면 graph가 disconnected다. 구현에서는 간선을 인접 리스트가 아니라 `(weight, u, v)` tuple 배열에 담아 정렬하고, 채택 수가 V-1이 되면 바로 끝낸다. 같은 component인지를 매번 flood fill로 확인하면 간선마다 O(V)가 들어 O(E log E + VE)로 느려지므로 Union-Find를 쓴다. path compression만 해도 실전에서는 충분히 빠르다. Union-Find를 모르면 Prim으로 같은 O(E log E)를 얻을 수 있다.

Union-Find는 Kruskal 밖에서도 쓴다. 간선이 계속 추가되는 동안 두 정점이 연결됐는지를 여러 번 묻는다면 질의마다 DFS/BFS로 O(V + E)를 들이지 말고, 간선을 받을 때 adjacency list 대신 `uni(u, v)`로 합친 뒤 `find(a) == find(b)`로 답한다. 무방향 graph의 cycle 탐지도 같아서, 간선 (u, v)를 합치기 전에 대표가 이미 같으면 cycle이다. 루트에 rank 대신 `-size`를 저장하는 union by size는 큰 집합의 루트 u에 `p[u] += p[v]; p[v] = u;`로 작은 쪽을 붙이며, `-p[find(x)]`로 x가 속한 집합의 크기도 바로 얻는다. 합치기만 지원하므로 간선 삭제(집합 분리)나 두 정점 사이의 경로, 거리 질의에는 쓸 수 없다.

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

- [바킹독의 실전 알고리즘 0x1B강, 최소 신장 트리 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=4wA3bncb64E)
- [바킹독의 실전 알고리즘 부록 D, Union-Find — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=rE-OUyZJgOk)
- 인프런, 큰돌 강사, [#1. 유니온파인드(상호배타적집합)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=331809)

- [NIST Dictionary of Algorithms and Data Structures](https://www.nist.gov/dads/)
- [NIST DADS, Kruskal's algorithm](https://xlinux.nist.gov/dads/HTML/kruskalsalgo.html)
- [NIST DADS, inverse Ackermann function](https://xlinux.nist.gov/dads/HTML/inverseAckermann.html)
- [MIT 18.433, Lecture notes on matroid optimization](https://math.mit.edu/~goemans/18433S09/matroid-notes.pdf)
- [Optimum Branchings — Journal of Research of the National Bureau of Standards](https://nvlpubs.nist.gov/nistpubs/jres/71B/jresv71Bn4p233_A1b.pdf)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Greedy, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135776)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Prim MST, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135777)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Prim 구현, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135778)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Ford-Fulkerson, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135779)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Interval scheduling, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135780)

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path|DFS, BFS와 Dijkstra]]
- [[Algorithm-DP|Dynamic Programming]]
- [[Heap|Priority Queue]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Greedy-Sweep-and-Two-Pointers|Greedy 증명과 line sweep]]

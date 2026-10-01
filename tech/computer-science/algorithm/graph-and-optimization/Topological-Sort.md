---
tags: [cs, algorithm, graph, topological-sort, dag, coding-test]
status: done
category: "CS - 알고리즘"
aliases: ["Topological Sort", "위상 정렬", "Kahn 알고리즘", "DAG"]
---

# 위상 정렬

방향 그래프에서 모든 간선 `u -> v`에 대해 u가 v보다 앞에 오도록 정점을 나열하는 것이다. 선수 과목, 빌드 의존성, 작업 순서처럼 먼저 끝나야 하는 관계를 한 줄로 세울 때 쓴다. 사이클이 있으면 서로 먼저 와야 해서 불가능하므로 사이클 없는 방향 그래프(DAG)에서만 정의되고, 답은 하나가 아닐 수 있다.

Kahn 알고리즘은 들어오는 간선이 없는(indegree 0) 정점을 하나씩 결과에 넣고 그 정점의 나가는 간선을 지운다. 매번 전체를 훑어 indegree 0을 찾지 않고, indegree 배열을 미리 채운 뒤 0인 정점을 queue에 넣고, 꺼낸 정점의 이웃 indegree를 줄이다 0이 되면 queue에 넣는다. O(V + E)다.

```cpp
std::vector<int> topologicalSort(int n, const std::vector<std::vector<int>>& adj) {
  std::vector<int> indeg(n + 1, 0), result;
  for (int u = 1; u <= n; u++) for (int v : adj[u]) indeg[v]++;
  std::queue<int> q;
  for (int u = 1; u <= n; u++) if (indeg[u] == 0) q.push(u);
  while (!q.empty()) {
    int cur = q.front(); q.pop();
    result.push_back(cur);
    for (int nxt : adj[cur]) if (--indeg[nxt] == 0) q.push(nxt);
  }
  return result;  // 길이가 n보다 작으면 사이클이 있다
}
```

사이클에 속한 정점은 indegree가 0이 될 수 없어 끝내 queue에 들어가지 못한다. 그래서 사이클 여부를 몰라도 일단 돌리고 결과 길이가 n인지로 사이클을 판정한다. 사전순으로 가장 앞선 순서가 필요하면 queue 대신 최소 힙을 쓴다(O((V + E) log V)). DFS 종료 순서를 뒤집어도 위상 정렬이 나온다.

## 체크포인트

- 위상 정렬이 DAG에서만 정의되는 이유와 답이 여러 개일 수 있다는 점
- indegree 0 정점을 queue로 관리해 O(V + E)로 만드는 방법
- 결과 길이로 사이클을 판정하는 방법
- 사전순 최소 결과가 필요할 때 최소 힙으로 바꾸는 이유

## 출처

- [바킹독의 실전 알고리즘 0x1A강, 위상 정렬 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=Th-gLZUrd04)

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘 인덱스]]
- [[Heap|Heap과 우선순위 큐]]

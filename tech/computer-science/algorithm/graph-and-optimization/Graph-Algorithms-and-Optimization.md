---
tags: [cs, algorithm, graph]
status: index
category: "CS - 알고리즘"
aliases: ["Graph Algorithms and Optimization", "그래프 알고리즘과 최적화"]
---

# 그래프 알고리즘과 최적화

그래프 문제는 표현을 정하는 순간 풀이 후보가 좁혀진다. 여기에는 정점과 간선 위를 도는 탐색과 최단 경로, greedy로 안전한 간선을 확정하는 최소 신장 트리와 최대 유량, subset을 bit로 표현해 factorial 탐색을 지수로 줄이는 외판원 문제를 모았다. 세 문서 모두 그래프 위의 탐색과 최적화를 다루며, 복잡도 표기와 P-NP 구분은 상위 인덱스의 복잡도 문서를 따른다.

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]: adjacency list와 matrix 표현 선택, DFS/BFS와 0-1 BFS, Dijkstra, Bellman-Ford, Floyd-Warshall과 경로 복원
- [[Graph-Optimization-Algorithms|Greedy, 최소 신장 트리와 최대 유량]]: greedy 정당성 증명(exchange argument, stays-ahead, cut property), interval scheduling, Prim과 Kruskal, Ford-Fulkerson 최대 유량
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]: 정수 bit로 subset 표현하기, submask 열거, Held-Karp DP로 푸는 외판원 문제와 O(n²2ⁿ) 한계

## 함께 볼 문서

- [[알고리즘(Algorithm)|Algorithm]]

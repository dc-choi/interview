---
tags: [cs, algorithm, graph]
status: index
category: "CS - 알고리즘"
aliases: ["Graph Algorithms and Optimization", "그래프 알고리즘과 최적화"]
---

# 그래프 알고리즘과 최적화

그래프 문제는 표현을 정하는 순간 풀이 후보가 좁혀진다. 여기에는 정점과 간선 위를 도는 탐색과 최단 경로, greedy로 안전한 간선을 확정하는 최소 신장 트리와 최대 유량, subset을 bit로 표현해 factorial 탐색을 지수로 줄이는 외판원 문제를 모았다. 모든 문서가 그래프 위의 탐색과 최적화를 다루며, 복잡도 표기와 P-NP 구분은 상위 인덱스의 복잡도 문서를 따른다.

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]: adjacency list와 matrix 표현 선택, DFS/BFS와 0-1 BFS, 재귀 DFS의 방문 검사 위치와 값 반환 DFS, Dijkstra, Bellman-Ford, Floyd-Warshall과 경로 복원
- [[Graph-Traversal-and-Shortest-Path-Grid-BFS|grid BFS 패턴]]: 정석 틀과 흔한 실수, 거리 순서, 영역 세기, multi-source와 두 종류 시작점, 1차원 상태 BFS, 칸 비용이 다른 grid의 Dijkstra, queue와 stack 교체, 영역 번호와 크기 표, 턴 단위 BFS와 parity 압축, 좌표를 빈틈 없는 정수 번호로, 격자가 바뀌는 시뮬레이션
- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형 패턴]]: 역방향 그래프 Dijkstra와 앞뒤로 닿는 정점 수, (정점, 상태) Dijkstra와 가중치 스케일링, parity로 특정 간선 통과 판별, minimax(병목) Dijkstra와 추이 폐쇄, 최단 경로 간선을 뺀 재탐색, Bellman-Ford 무한 이익 판정, A*
- [[Topological-Sort|위상 정렬]]: DAG, Kahn 알고리즘, 결과 길이로 사이클 판정, 사전순 최소 순서
- [[Contraction-Hierarchies|축약 계층과 도로망 최단 경로]]: shortcut, 순위 기반 질의, CH와 CCH의 가중치 갱신 경계
- [[Graph-Optimization-Algorithms|Greedy, 최소 신장 트리와 최대 유량]]: greedy 정당성 증명(exchange argument, stays-ahead, cut property, matroid), interval scheduling과 오답 기준, Prim과 Kruskal, Union-Find 활용, Ford-Fulkerson 최대 유량
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]: 정수 bit로 subset 표현하기, popcount, submask 열거, 부분집합 열거 완전탐색(bit 고정, 한 축 열거), Held-Karp DP로 푸는 외판원 문제와 O(n²2ⁿ) 한계

## 함께 볼 문서

- [[알고리즘(Algorithm)|Algorithm]]

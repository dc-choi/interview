---
tags: [cs, algorithm, graph]
status: index
category: "CS - 알고리즘"
aliases: ["Graph Algorithms and Optimization", "그래프 알고리즘과 최적화"]
---

# 그래프 알고리즘과 최적화

그래프 문제는 표현을 정하는 순간 풀이 후보가 좁혀진다. 여기에는 정점과 간선 위를 도는 탐색과 최단 경로, greedy로 안전한 간선을 확정하는 최소 신장 트리와 최대 유량, subset을 bit로 표현해 factorial 탐색을 지수로 줄이는 외판원 문제를 모았다. 그래프 위의 탐색과 최적화를 중심으로 제약 기반 자원 배치, 지역 탐색, 선형 계획법과 제약 충족 같은 최적화 문제도 함께 다루며, 복잡도 표기와 P-NP 구분은 상위 인덱스의 복잡도 문서를 따른다.

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]: adjacency list와 matrix 표현 선택, DFS/BFS와 0-1 BFS, 재귀 DFS의 방문 검사 위치와 값 반환 DFS, Dijkstra, Bellman-Ford, Floyd-Warshall과 경로 복원
- [[Graph-Traversal-and-Shortest-Path-Grid-BFS|grid BFS 패턴]]: 정석 틀과 흔한 실수, 거리 순서, 영역 세기, multi-source와 두 종류 시작점, 1차원 상태 BFS, 칸 비용이 다른 grid의 Dijkstra, queue와 stack 교체, 영역 번호와 크기 표, 턴 단위 BFS와 parity 압축, 좌표를 빈틈 없는 정수 번호로, 격자가 바뀌는 시뮬레이션
- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형 패턴]]: 역방향 그래프 Dijkstra와 앞뒤로 닿는 정점 수, (정점, 상태) Dijkstra와 가중치 스케일링, parity로 특정 간선 통과 판별, minimax(병목) Dijkstra와 추이 폐쇄, 최단 경로 간선을 뺀 재탐색, Bellman-Ford 무한 이익 판정, A*
- [[Search-Problem-Formulation|탐색 문제의 정식화와 탐색 전략]]: 상태, 행동, 전이 모델, 목표 판정과 경로 비용, 노드와 frontier, 탐색 집합, 꺼내는 순서로 본 DFS, BFS, 균일 비용 탐색, 탐욕적 최우선 탐색과 A*, 완화 문제 휴리스틱, 중복 규칙과 목표 판정 시점
- [[IDA-Star-Pattern-Database|IDA*와 패턴 데이터베이스]]: 루빅스 큐브의 상태 공간, 탐욕법의 한계, 깊이 우선으로 f 한계를 늘리는 IDA*, 부분 문제 거리 표의 최댓값 heuristic, Kociemba 2단계 알고리즘과 로봇 기록
- [[Topological-Sort|위상 정렬]]: DAG, Kahn 알고리즘, 결과 길이로 사이클 판정, 사전순 최소 순서
- [[Contraction-Hierarchies|축약 계층과 도로망 최단 경로]]: shortcut, 순위 기반 질의, CH와 CCH의 가중치 갱신 경계
- [[Graph-Optimization-Algorithms|Greedy, 최소 신장 트리와 최대 유량]]: greedy 정당성 증명(exchange argument, stays-ahead, cut property, matroid), interval scheduling과 오답 기준, Prim과 Kruskal, Union-Find 활용, Ford-Fulkerson 최대 유량
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]: 정수 bit로 subset 표현하기, popcount, submask 열거, 부분집합 열거 완전탐색(bit 고정, 한 축 열거), Held-Karp DP로 푸는 외판원 문제와 O(n²2ⁿ) 한계
- [[Constraint-Based-Resource-Placement|제약 기반 자원 배치]]: 하드 제약과 목적 함수, 지역 탐색과 MIP, 제한 시간 해와 최적성 증명의 구분, Rebalancer 사례
- [[Local-Search-and-Simulated-Annealing|지역 탐색과 담금질 기법]]: 상태 공간 지형과 이웃 정의, 국소 최적, 고원과 어깨, 언덕 오르기 변형(최급 상승, 확률적, 첫 선택, 무작위 재시작, 지역 빔), 담금질의 온도와 수락 확률, 외판원 문제의 2-opt 이웃
- [[Linear-Programming|선형 계획법]]: 일차 목적과 제약의 정식화, 최대화와 부등호 변환, 실행 불가능과 무한, 꼭짓점과 단체법, 내부점법, SciPy linprog의 bounds 기본값과 status, 정수 조건과 LP 완화
- [[Constraint-Satisfaction-Problem|제약 충족 문제]]: 변수, 도메인과 제약 그래프, 노드와 아크 일관성, AC-3, 백트래킹과 추론의 결합(전방 검사, MAC), MRV, 차수 휴리스틱과 LCV, 최소 충돌 지역 탐색

## 함께 볼 문서

- [[알고리즘(Algorithm)|Algorithm]]

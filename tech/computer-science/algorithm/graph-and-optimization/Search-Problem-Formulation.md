---
tags: [cs, algorithm, search, state-space, heuristic, a-star]
status: done
category: "CS - 알고리즘"
aliases: ["Search Problem Formulation", "탐색 문제 정식화", "Uninformed Search", "무정보 탐색", "Informed Search", "정보 탐색", "Greedy Best-First Search", "탐욕적 최우선 탐색", "Frontier", "Explored Set"]
---

# 탐색 문제의 정식화와 탐색 전략

길 찾기, 퍼즐 풀이, 증명 찾기처럼 시작 상태에서 목표 상태까지 이어지는 행동의 순서를 구하는 문제는 같은 틀로 정식화할 수 있다. 이 틀로 옮기면 DFS, BFS, 균일 비용 탐색, 탐욕적 최우선 탐색과 A*는 frontier에서 다음 노드를 꺼내는 규칙만 다른 하나의 알고리즘이 된다.

## 탐색 문제의 구성 요소

| 요소 | 정의 | 미로 예 |
|---|---|---|
| 에이전트 | 환경을 지각하고 그 환경에 행동하는 주체 | 미로를 걷는 사람 |
| 상태 | 환경 안에서 에이전트가 놓인 한 구성 | 현재 칸의 좌표 |
| 초기 상태 | 탐색을 시작하는 상태 | 출발 칸 |
| 행동 `ACTIONS(s)` | 상태 s에서 실행할 수 있는 행동의 집합 | 벽이 없는 방향으로 한 칸 이동 |
| 전이 모델 `RESULT(s, a)` | s에서 a를 실행한 뒤의 상태 | 이동한 칸 |
| 목표 판정 | 주어진 상태가 목표인지 정하는 조건 | 도착 칸인가 |
| 경로 비용 | 경로에 매기는 수치 비용 | 이동 횟수 |

초기 상태에서 행동을 몇 번이든 이어 도달할 수 있는 상태 전체가 상태 공간이다. 상태를 정점, 행동을 간선으로 보면 상태 공간은 그래프다. 해는 초기 상태에서 목표 상태로 가는 행동의 순서이고, 최적 해는 모든 해 가운데 경로 비용이 가장 낮은 해다. 최적 해가 여럿일 수도 있다.

상태 공간은 보통 미리 만들지 않는다. 탐색 중에 `ACTIONS`와 `RESULT`로 필요한 이웃만 생성한다. 정점 목록이 입력으로 주어지는 [[Graph-Traversal-and-Shortest-Path|그래프 탐색]]과 달리, 상태가 너무 많아 다 만들 수 없는 퍼즐도 같은 틀로 다루는 이유다. 목표 판정은 특정 상태 하나가 아니라 조건일 수 있다. 숫자 퍼즐이라면 모든 칸이 순서대로 놓였는지 확인한다.

## 노드, frontier와 탐색 집합

탐색은 상태를 노드로 감싸 다룬다. 노드는 상태, 부모 노드, 부모에서 이 노드로 오게 한 행동, 초기 상태부터의 경로 비용을 담는다. 목표 노드에 닿으면 부모를 따라 초기 상태까지 거슬러 올라가며 행동을 모으고, 순서를 뒤집어 해를 만든다.

frontier는 생성했지만 아직 확장하지 않은 노드의 모음이고, 탐색 집합(explored set)은 이미 확장한 상태의 집합이다. 노드를 확장한다는 것은 그 상태에서 갈 수 있는 이웃 노드를 모두 만든다는 뜻이다.

```text
frontier ← 초기 상태의 노드 하나
explored ← 빈 집합
반복:
  frontier가 비었으면 해가 없다
  node ← frontier에서 노드 하나를 꺼낸다
  node의 상태가 목표면 부모를 따라 해를 복원해 반환한다
  node의 상태를 explored에 넣는다
  ACTIONS(node의 상태)의 각 a에 대해 RESULT(node의 상태, a)로 child 노드를 만들고
    child의 상태가 frontier에도 explored에도 없으면 frontier에 넣는다
```

탐색 집합이 없으면 A에서 B로, B에서 다시 A로 가는 왕복을 끝없이 반복할 수 있다. 위처럼 탐색 집합을 쓰면 각 상태는 frontier에 한 번만 들어간다. 그래서 상태 공간이 유한하면 꺼내는 순서와 관계없이 언젠가 frontier가 비거나 목표를 꺼내며, 도달 가능한 목표가 있으면 해를 찾는다. 상태 공간이 무한하면 이 보장이 없다.

## 꺼내는 순서가 전략을 정한다

| 전략 | frontier에서 꺼내는 노드 | 자료구조 | 최적 해 보장 |
|---|---|---|---|
| DFS | 가장 나중에 넣은, 가장 깊은 노드 | stack (LIFO) | 없음 |
| BFS | 가장 먼저 넣은, 가장 얕은 노드 | queue (FIFO) | 모든 행동 비용이 같을 때 |
| 균일 비용 탐색 | 경로 비용 g(n)이 가장 작은 노드 | 우선순위 큐 | 비용이 음수가 아닐 때 |
| 탐욕적 최우선 탐색 | 휴리스틱 h(n)이 가장 작은 노드 | 우선순위 큐 | 없음 |
| A* | g(n) + h(n)이 가장 작은 노드 | 우선순위 큐 | h가 아래 조건을 만족할 때 |

위의 셋은 탐색하며 알게 된 것 말고는 문제에 대한 지식을 쓰지 않는 무정보 탐색(uninformed search)이고, 아래 둘은 목표까지 남은 거리의 추정 같은 문제별 지식을 쓰는 정보 탐색(informed search)이다. 균일 비용 탐색은 [[Graph-Traversal-and-Shortest-Path#Dijkstra|Dijkstra]]와 같은 원리로 동작한다.

### DFS와 BFS의 비용

분기 수를 b, 가장 얕은 해의 깊이를 s, 트리의 최대 깊이를 m이라 하자. BFS는 해가 있는 층의 노드를 한꺼번에 frontier에 담으므로 시간과 메모리가 모두 O(b^s)다. 트리 탐색으로 도는 DFS는 시간 O(b^m), frontier 메모리 O(bm)으로 현재 경로와 그 형제 노드만 보관한다. 탐색 집합을 두면 그 집합의 크기도 메모리에 더한다.

같은 미로에서도 결과가 갈린다. 처음 고른 갈림길이 목표 쪽이면 DFS가 가장 빠르지만, 반대쪽 막다른 길을 끝까지 판 뒤에야 돌아오면 BFS보다 훨씬 많은 상태를 확인할 수 있고, 찾은 경로가 가장 짧다는 보장도 없다. BFS는 가까운 상태부터 넓게 훑으므로 목표가 멀면 그 거리 안의 상태를 거의 모두 확인한 뒤에야 최단 경로를 낸다. 명시적 그래프에서의 구현과 메모리 비교는 [[Graph-Traversal-and-Shortest-Path#탐색 비용에서 E를 잊지 않기|그래프 탐색 비용]]에 있다.

## 휴리스틱과 탐욕적 최우선 탐색

휴리스틱 h(n)은 상태 n에서 목표까지 남은 비용의 추정치다. 흔히 제약 일부를 없앤 완화 문제(relaxed problem)의 정확한 답을 쓴다. 미로에서 벽을 무시하고 가로와 세로로 떨어진 칸 수를 더한 맨해튼 거리가 그 예다. 벽이 있으면 실제 거리는 이보다 길 수는 있어도 짧을 수는 없다.

탐욕적 최우선 탐색(greedy best-first search)은 h가 가장 작은, 곧 목표에 가장 가까워 보이는 노드부터 꺼낸다. 휴리스틱이 잘 맞으면 BFS가 훑을 넓은 영역을 건너뛴다. 그러나 이미 든 비용을 보지 않으므로 최적 해를 보장하지 않는다. 갈림길에서 h가 11인 칸과 13인 칸이 있으면 11을 고르는데, 11 쪽 길이 벽을 크게 돌아가고 13 쪽이 실제로 짧은 길일 수 있다. 휴리스틱이 방향을 잘못 알려 주면 엉뚱한 쪽으로 깊이 들어가는 DFS처럼 헤매고, 탐색 집합 없이 돌면 해가 있어도 찾지 못할 수 있다.

## A*: 지나온 비용과 남은 추정을 더한다

A*는 출발점부터 실제로 든 비용 g(n)과 남은 비용의 추정 h(n)을 더한 f(n) = g(n) + h(n)이 가장 작은 노드를 꺼낸다. 목표에 가까워 보여도 거기까지 이미 많이 걸었다면, 덜 걸은 다른 후보가 더 짧은 경로의 일부일 수 있기 때문이다.

| 후보 | g(n) | h(n) | 탐욕적 최우선 탐색 | A*의 f(n) |
|---|---|---|---|---|
| X: 멀리 돌아온 칸 | 15 | 6 | h가 작아 먼저 꺼낸다 | 21 |
| Y: 출발점 근처 칸 | 6 | 13 | 나중에 꺼낸다 | 19, 먼저 꺼낸다 |

A*가 최적 해를 내려면 휴리스틱이 다음 조건을 만족해야 한다.

- **admissible**: h(n)이 실제 남은 비용을 넘지 않는다. 탐색 집합 없이 도는 트리 탐색은 이 조건만으로 최적 해를 낸다.
- **consistent**: 모든 노드 n과 비용 c로 가는 후속 노드 n'에 대해 h(n) ≤ c + h(n')이다. 한 번 확장한 상태를 다시 열지 않는 그래프 탐색이 최적 해를 보장하려면 이 조건이 있어야 한다. 목표에서 h가 0이면, 목표까지의 최단 경로를 따라 이 부등식을 더해 consistent한 h가 admissible함을 보일 수 있다.

h를 모든 상태에서 0으로 두면 A*는 균일 비용 탐색이 된다. admissible한 휴리스틱이 여럿이면 상태마다 그 최댓값을 써도 admissible하다. 간선 가중치를 바꿔 Dijkstra로 보는 관점과 다시 여는 구현의 조건은 [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]]의 A* 절에 있다. A*는 생성한 노드를 frontier와 탐색 집합에 보관하므로 상태 공간이 크면 메모리 사용이 커진다. 비용 한계를 늘리며 깊이 우선으로 다시 탐색하는 [[IDA-Star-Pattern-Database|IDA*]]가 그 대안이다.

## 구현 체크포인트

- **frontier의 중복 규칙**: frontier나 탐색 집합에 이미 있는 상태를 다시 넣지 않는 규칙은 BFS와 DFS에는 충분하다. 균일 비용 탐색과 A*에서는 더 싼 경로로 같은 상태에 닿으면 frontier의 노드를 그 경로로 바꾸거나, 새 항목을 넣고 꺼낸 항목이 기록된 최소 비용보다 비싸면 건너뛴다. 그러지 않으면 먼저 발견한 비싼 경로가 답이 될 수 있다.
- **목표 판정 시점**: BFS는 자식을 만들 때 목표를 확인해도 가장 얕은 해를 얻는다. 비용이 다른 탐색에서는 노드를 frontier에서 꺼낼 때 확인한다. 만들 때 확인하는 구현은 찾은 해보다 싼 후보가 frontier에 남지 않을 때까지 탐색을 이어 간다.
- **휴리스틱 설계**: 알고리즘 구현보다 좋은 휴리스틱을 찾는 일이 더 어려운 경우가 많다. 완화 문제는 원래 문제의 경로를 모두 허용하므로 그 최적 비용은 원래 비용을 넘지 않는 admissible한 하한이다. 더 정확한 휴리스틱은 확장하는 노드를 줄이지만 노드마다 계산 비용이 더 들 수 있으니 전체 시간을 함께 잰다.
- **상태 정의**: 열쇠 보유처럼 이후 선택에 영향을 주는 값을 상태에 넣지 않으면 서로 다른 상태를 하나로 합친다([[Exhaustive-Search-and-Backtracking#BFS도 상태 공간 탐색이다|상태를 늘린 BFS]]).
- **다른 문제로의 확장**: 상대가 있으면 목표 판정과 경로 비용 대신 종료 판정과 효용을 쓰는 [[Adversarial-Search|적대적 탐색]]이 되고, 지식 베이스에 추론 규칙을 적용하는 정리 증명도 같은 틀로 옮길 수 있다([[Propositional-Logic-and-Inference#정리 증명도 탐색 문제다|정리 증명의 탐색]]).

## 이해 확인

- 같은 코드에서 DFS와 BFS를 바꾸려면 무엇만 바꾸면 되는가?
- 갈림길에서 h가 작은 쪽만 고르는 전략이 더 긴 경로를 내는 미로를 그릴 수 있는가?
- frontier에 있는 상태를 다시 넣지 않는 규칙이 BFS에서는 안전하고 A*에서는 왜 위험한가?

## 출처

- [YouTube, Harvard CS50's Artificial Intelligence with Python, Search](https://www.youtube.com/watch?v=5NgNicANyqM&t=146s)
- [Harvard, CS50's Introduction to Artificial Intelligence with Python, Lecture 0 Search Notes](https://cs50.harvard.edu/ai/2020/notes/0/) — 구성 요소의 정의, 노드와 frontier 알고리즘, 무정보와 정보 탐색, A*의 조건
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Uninformed Search](https://inst.eecs.berkeley.edu/~cs188/textbook/search/uninformed.html) — DFS, BFS와 균일 비용 탐색의 완전성, 최적성과 복잡도
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Informed Search](https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html) — 완화 문제 휴리스틱, 탐욕 탐색의 한계, 그래프 탐색의 더 싼 경로 확인, h = 0과 최댓값 휴리스틱
- [Breadth-First-Search — GitHub, aimacode/aima-pseudocode](https://github.com/aimacode/aima-pseudocode/blob/master/md/Breadth-First-Search.md) — 자식을 만들 때의 목표 판정
- [Uniform-Cost-Search — GitHub, aimacode/aima-pseudocode](https://github.com/aimacode/aima-pseudocode/blob/master/md/Uniform-Cost-Search.md) — 3판의 꺼낼 때 목표 판정과 더 싼 frontier 노드 교체, 4판의 생성 시 판정 뒤 계속 탐색

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]] — DFS와 BFS 구현, Dijkstra
- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]] — A*의 조건과 가중치 변환
- [[IDA-Star-Pattern-Database|IDA*와 패턴 데이터베이스]] — 메모리를 줄인 A*와 부분 문제 하한
- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]] — 상태를 늘린 BFS
- [[Adversarial-Search|적대적 탐색과 미니맥스]] — 상대가 있는 탐색
- [[Propositional-Logic-and-Inference|명제 논리와 추론]] — 정리 증명을 탐색으로 풀기
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘 인덱스]]

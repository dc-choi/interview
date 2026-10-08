---
tags: [cs, algorithm, graph, bfs, grid, flood-fill, simulation, coding-test]
status: done
category: "CS - 알고리즘"
aliases: ["Grid BFS", "grid BFS 패턴", "flood fill", "multi-source BFS", "다차원 배열 BFS", "턴 단위 BFS", "영역 라벨링", "좌표 packing", "가중치 grid Dijkstra"]
---

# grid BFS의 정석 틀과 변형

grid에서 시작 칸과 이어진 칸을 모두 찾는 flood fill과 최단 거리 계산은 같은 틀을 쓴다. 각 칸이 queue에 한 번만 들어가므로 R행 C열이면 O(RC)다.

```cpp
int dx[4] = {1, 0, -1, 0};
int dy[4] = {0, 1, 0, -1};
int dist[MX][MX];  // -1이면 미방문, 방문 여부와 거리를 한 배열로

queue<pair<int, int>> q;
for (int i = 0; i < n; i++) fill(dist[i], dist[i] + m, -1);
dist[sx][sy] = 0;          // 시작점도 넣을 때 방문 처리
q.push({sx, sy});
while (!q.empty()) {
  auto [x, y] = q.front(); q.pop();
  for (int dir = 0; dir < 4; dir++) {
    int nx = x + dx[dir], ny = y + dy[dir];
    if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;  // 범위 검사가 먼저
    if (dist[nx][ny] != -1 || board[nx][ny] == WALL) continue;
    dist[nx][ny] = dist[x][y] + 1;  // queue에 넣는 순간 방문 처리
    q.push({nx, ny});
  }
}
```

- **흔한 실수 세 가지**: 시작점에 방문 표시를 빠뜨려 두 번 방문한다. queue에서 꺼낼 때 방문 표시를 해서 같은 칸이 여러 번 들어가 시간이나 메모리가 초과된다(작은 예제에서는 드러나지 않는다). 범위 검사를 빠뜨리거나 방문 배열 확인 뒤에 해서 `dist[-1][0]`을 읽는다.
- **거리 순서**: 꺼낸 칸에서 넣는 칸은 거리가 정확히 1 크므로 queue에는 거리 0인 칸들, 1인 칸들, 2인 칸들 순으로 쌓인다. 그래서 목표에 처음 닿은 순간이 최단 거리이고, 그 자리에서 종료해도 된다.
- **시작점을 1로 두는 변형**: `visited[start] = 1`, `visited[next] = visited[cur] + 1`로 방문 여부와 거리를 한 배열에 담으면 0이 미방문이라 -1 초기화가 필요 없는 대신, 간선 수 기준 거리는 `visited[target] - 1`이다. 시작점을 0으로 두면 미방문과 구분되지 않아 시작점을 다시 방문한다.
- **모든 영역 세기**: 이중 loop로 칸을 돌며 벽이 아니고 미방문인 칸마다 BFS를 새로 시작하면 영역 수와 각 넓이(pop 횟수)를 한 번에 구한다. 전체 비용은 여전히 O(RC)다.
- **시작점이 여러 개**: 가장 가까운 출발점까지의 거리가 필요하면 출발점마다 BFS를 돌리지 말고(O((RC)²)), 모든 출발점을 거리 0으로 queue에 한꺼번에 넣고 한 번 돌린다(multi-source BFS). 끝난 뒤 도달하지 못한 칸이 남았는지 따로 확인한다.
- **시작점이 두 종류**: 불이 번지는 동안 사람이 탈출하는 문제처럼 한쪽(불)이 다른 쪽의 영향을 받지 않으면, 불 BFS로 각 칸에 불이 닿는 시각을 먼저 모두 구한 뒤 사람 BFS에서 `사람 도착 시각 >= 불 도착 시각`인 칸을 건너뛴다. 두 확산이 서로에게 영향을 주면 한쪽을 먼저 끝까지 돌릴 수 없어 시간 순으로 두 queue를 함께 진행해야 한다. 불이 끝내 닿지 않는 칸(불이 하나도 없거나 벽에 막힌 칸)의 불 도착 시각은 INF로 둔다. 미방문 표시(-1이나 0)를 그대로 비교하면 모든 칸이 이미 불탄 것으로 판정돼 사람이 한 칸도 움직이지 못한다. 사람이 가장자리 칸에 닿으면 탈출이며, 밖으로 나가는 마지막 이동을 시간에 넣는지는 지문 정의를 따른다.
- **grid가 아닌 상태 공간**: 위치 x에서 x-1, x+1, 2x로 이동하는 문제처럼 이동 규칙이 edge인 1차원 상태도 같은 BFS다. 이때 탐색 범위를 입력 범위로 멋대로 가정하지 말고, 범위 밖으로 나가는 것이 최단이 될 수 있는지 논증해 배열 크기를 정한다.
- 3차원 grid는 dz를 더해 인접 6칸을 본다.
- **칸마다 비용이 다르면**: 칸에 들어갈 때 그 칸의 값만큼 비용이 드는 grid는 넣는 칸의 거리가 꺼낸 칸보다 정확히 1 크다는 성질이 없어 BFS로 최단 거리를 구할 수 없다. 칸을 정점, 이웃 칸으로 가는 비용을 도착 칸의 값으로 보고 Dijkstra를 돌린다([[Graph-Traversal-and-Shortest-Path#Dijkstra|Dijkstra]]). 출발 칸의 비용을 내는지는 지문을 따라 `dist[start]`를 0이나 그 칸의 값으로 둔다. 비용이 0과 1뿐이면 [[Graph-Traversal-and-Shortest-Path#0-1 BFS|0-1 BFS]]로 충분하다.
- **queue를 stack으로 바꾸면**: 같은 틀에서 queue만 stack으로 바꿔도 연결된 칸을 모두 방문하므로 flood fill은 똑같이 풀린다. 하지만 거리 순서대로 처리하지 않으므로 최초 방문 거리가 최단 거리라는 보장이 사라진다. `dist[next] = dist[cur] + 1`로 탐색 경로의 길이는 계산할 수 있어도 일반적인 최단 거리로 쓸 수는 없다. 넣을 때 방문 표시를 하는 이 stack 순회는 재귀 DFS와 방문 순서도 같지 않다([[Graph-Traversal-and-Shortest-Path#DFS|DFS 절]]). 그래서 grid 문제는 BFS로 통일하고, DFS는 tree와 graph의 구조(cycle, 후위 순서 등)가 필요할 때 쓴다.

## 미로의 목표에서 역으로 거리 채우기

벽을 한쪽 손으로 따라가는 규칙은 일반적인 미로 탐색의 성공을 보장하지 않는다. 바깥 벽과 떨어진 중앙 목표를 가진 미로에서는 같은 벽을 돌며 출발 위치로 돌아올 수 있다. 통로의 연결과 방문 정보를 기억하는 탐색이 필요하다.

벽 배치를 아는 양방향 격자에서 한 칸 이동 비용이 모두 1이면, 목표를 거리 0으로 넣고 BFS를 돌려 각 칸에서 목표까지의 최단 거리를 구한다. 목표가 여러 칸이면 모두 0으로 넣는다. 현재 칸의 거리가 유한할 때 벽으로 막히지 않은 이웃 중 거리가 정확히 1 작은 칸으로 이동하면 최단 경로를 따라갈 수 있다. `INF`나 미방문 값이 남은 칸은 현재 지도에서 목표에 닿지 못한다.

로봇이 아직 모르는 벽을 열려 있다고 가정한 지도에서 계산한 거리는 잠정값이다. 새 벽을 관측하면 지도를 갱신하고 거리를 다시 계산해야 한다. 실제 벽을 모두 반영한 지도의 최단 거리와 탐색 중의 추정 거리를 구분한다. 또한 최소 칸 수 경로가 회전과 가감속까지 포함한 최소 주행 시간 경로인 것은 아니다.

이해 확인: 목표가 여러 개일 때 왜 BFS 한 번으로 충분한가? 벽 하나가 추가되면 기존 거리표를 그대로 써도 되는가?

## 영역 번호와 크기 표

영역 수와 넓이를 세는 데서 그치지 않고, 새 영역을 시작할 때마다 번호를 하나 늘려 칸마다 `comp[y][x]`를 칠하고 번호별 칸 수를 `size[id]`에 남긴다(탐색 함수가 칠한 칸 수를 돌려주면 된다). 그러면 벽 하나를 없앴을 때 얻는 가장 넓은 방처럼 영역을 합치는 질의를 다시 탐색하지 않고 답한다. 번호가 다른 두 칸이 맞닿은 곳에는 벽이 있으므로 모든 인접 칸 쌍에서 `size[a] + size[b]`의 최댓값을 보면 된다. 벽마다 지우고 다시 탐색하는 O(벽 수 × RC)가 라벨링 한 번과 O(RC) 스캔으로 줄어든다. 벽이 방향별 flag의 합으로 주어지면 [[Bitmask-DP-and-TSP#언제 유용한가|bit 연산]]으로 막힌 방향을 거른다.

기준값을 바꿔 가며 다시 세는 문제(물 높이 d마다 d보다 높은 칸이 이루는 영역 수의 최댓값)는 d마다 방문 배열을 비우고 센다. 높이가 1 이상이어도 비가 오지 않는 d = 0을 빼먹으면, 모든 높이가 1인 입력에서 d ≥ 1은 전부 잠겨 0이 되고 정답 1을 놓친다. 이하와 미만 같은 경계와 최소, 최대, 없는 경우를 반례로 먼저 점검한다([[Cpp-Coding-Test-Workflow#반례를 만드는 축|반례 축]]).

## 턴 단위 BFS

BFS의 한 level이 문제의 1초(한 턴)이고 턴마다 목표나 지형이 바뀌면 level을 덩어리로 끊어 처리한다.

- **queue size 스냅숏**: 턴을 시작할 때 `int sz = q.size();`를 저장하고 정확히 sz개만 꺼낸 뒤 턴을 1 늘린다. 이번 턴에 넣은 칸은 다음 턴 덩어리가 된다.
- **두 queue**: 한 번의 파동이 0인 칸으로는 끝까지 퍼지고 1인 칸에서 멈추는 문제처럼 한 턴의 범위를 칸 값이 정하면 현재 턴 queue와 다음 턴 queue를 따로 둔다. 0인 칸은 현재 queue에 넣어 같은 턴 안에서 계속 퍼지고, 1인 칸을 만나면 0으로 바꿔 다음 턴 queue에 넣는다. 현재 queue가 비면 다음 queue로 넘어가며 턴을 센다. 0칸 비용 0, 1칸 비용 1인 최단 경로라 [[Graph-Traversal-and-Shortest-Path#0-1 BFS|0-1 BFS]]와 같은 답이다.
- **좌표를 정수 하나로**: `(y, x)`를 `y * 1000 + x`로 queue에 넣고 `v / 1000`, `v % 1000`으로 되돌린다. 곱하는 수는 x가 가질 수 있는 최댓값보다 커야 좌표가 겹치지 않는다. Dijkstra의 priority queue에도 tuple 없이 `(거리, y * 1000 + x)` pair로 넣는다. 곱하는 수를 열 수 W로 두면 `y * W + x`가 0부터 H × W - 1까지 빈틈 없는 번호가 되어 dist와 visited를 1차원 배열로 쓰고, 그대로 Floyd-Warshall 행렬의 정점 번호로도 쓴다. 1000처럼 넉넉한 수를 곱한 번호로 Floyd-Warshall을 돌리면 쓰지 않는 번호까지 행렬과 3중 loop 범위에 들어가 O(V³)이 크게 늘어난다. 3차원 이상은 `(z * H + y) * W + x`처럼 같은 방식으로 펼치고, 번호가 자료형 범위를 넘지 않는지 확인한다.
- **시간 parity로 상태 줄이기**: 위치 x에서 x-1, x+1, 2x로 움직여 t초에 `K + t(t+1)/2`에 있는 목표를 잡는 문제에서 (위치, 시각)을 모두 상태로 두면 너무 크다. t초에 x에 설 수 있으면 -1, +1 왕복으로 t+2, t+4초에도 설 수 있으므로 방문을 `visited[t % 2][x]`로만 기록하고, 턴마다 목표 위치가 현재 턴과 같은 parity로 이미 방문됐는지 본다. 이 조건 하나가 같은 시각에 만나는 경우와 먼저 도착해 기다리는 경우를 함께 처리한다([[Exhaustive-Search-and-Backtracking#BFS도 상태 공간 탐색이다|상태 BFS]]). 목표가 범위(예: 50만)를 넘으면 실패이고, `t(t+1)/2`가 범위를 넘기 전까지만 돌므로 턴은 약 1,000번이다.

## 격자가 바뀌는 시뮬레이션

시간이 흐르며 격자가 바뀌면 한 턴 안에서 탐색과 변경을 분리한다.

- **모아서 한꺼번에 바꾸기**: 판의 가장자리에 치즈가 없다는 조건이 있으면 바깥 공기인 (0, 0)에서 한 번만 flood fill한다. 공기로는 계속 퍼지고, 치즈 칸은 들어가지 않고 좌표만 모은 뒤 탐색이 끝나면 한꺼번에 녹이고 시간을 1 늘린다. 탐색 도중에 바로 바꾸면 같은 턴에 새로 드러난 안쪽 치즈까지 녹는다. 바깥에서만 시작하므로 치즈에 둘러싸인 안쪽 공기는 녹이는 데 끼지 않는다. 모두 녹기 직전의 치즈 칸 수는 마지막으로 모은 좌표 수다.
- **영역 단위로 모은 뒤 갱신**: 인접 칸의 값 차이가 L 이상 R 이하일 때만 이어지는 영역을 찾으며 좌표와 합을 모으고, 탐색이 끝난 뒤 영역의 칸을 `합 / 칸 수`로 바꾼다. 날마다 방문 배열을 비우고, 하루 동안 한 번도 바뀌지 않으면 멈춘다.
- **막힌 frontier를 다음 턴으로**: 날마다 BFS를 처음부터 다시 돌리지 않는다. 백조 BFS는 물로만 전진하고 얼음에 막힌 칸을 다음 날 queue에 담아 거기서 이어 가며, 물 BFS도 오늘 녹은 칸만 다음 날 녹이기의 시작점으로 둔다(백조가 선 칸도 물이다). 백조 두 마리를 모두 움직이지 않고 한 마리에서 다른 한 마리에 닿는지만 본다. 각 칸이 queue마다 사실상 한 번씩만 들어가 전체가 O(RC)이고, 날마다 다시 돌리면 O(RC × 날짜 수)다.

## 출처

- [Floodfill — IEEE at UC Irvine](https://ieee.ics.uci.edu/micromouse/floodfill.html)
- [Solving the maze — Micromouse Online](https://micromouseonline.com/micromouse-book/mazes-and-maze-solving/solving-the-maze/)
- [Micromouse maze solving performance — Micromouse Online](https://micromouseonline.com/2018/10/28/micromouse-maze-solving-performance/)
- [바킹독의 실전 알고리즘 0x09강, BFS — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=ftOmGdm95XI)
- [바킹독의 실전 알고리즘 0x0A강, DFS — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=93jy2yUYfVE)
- 인프런, 큰돌 강사, [2-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100327), [맞왜틀팁 : 반례를 생각하는 방법 | 2 - C 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144195), [2-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100341), [3-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100358), [3-D와 반례](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100359)
- 인프런, 큰돌 강사, [3-G 와 테스트케이스 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100362), [3-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100364), [3-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100365), [3-K와 문제의 단순화](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100366), [4-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100387)
- 인프런, 큰돌 강사, [8-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101066), [8-U](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101074), [8-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101077)

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘 인덱스]]
- [[Exhaustive-Search-and-Backtracking|상태 공간 탐색]]
- [[Linear-Data-Structures|Queue와 Stack]]

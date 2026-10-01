---
tags: [cs, algorithm, brute-force, backtracking, permutation, combination]
status: done
category: "CS - 알고리즘"
aliases: ["Exhaustive Search and Backtracking", "완전탐색과 백트래킹"]
---

# 완전탐색과 백트래킹

완전탐색은 유효한 후보를 빠짐없이 검사한다. 백트래킹은 아직 완성되지 않은 후보가 어떤 답으로도 이어질 수 없음을 알았을 때 그 subtree를 버리는 완전탐색이다.

## 먼저 상태 공간을 센다

`n`만 보고 판단하지 말고 실제 후보 수와 후보 하나를 검증하는 비용을 곱한다.

- 모든 binary 선택: `2^n`
- 길이 `r`의 순열: `P(n, r)`
- 크기 `r`의 조합: `C(n, r)`
- grid에서 매 단계 최대 `b`개 선택, 깊이 `d`: 상한 `O(b^d)`

대칭, 중복 값, 이미 고정된 선택과 조기 종료 조건을 반영하면 실제 상태 수는 줄 수 있다. 고정된 연산 횟수 기준만 외우지 말고 입력 상한, 검증 비용과 언어 실행 비용을 함께 본다.

### 열거하기 전에 세고 줄이기

- **세기만 하면 되는 문제**: 종류마다 c_i개인 옷을 종류별로 하나 이하 고르는 경우의 수는 이름을 볼 필요 없이 개수만으로 `Π(c_i + 1) - 1`이다. 종류마다 입지 않는 선택 1을 더해 곱하고, 아무것도 입지 않는 경우 1을 뺀다. 모자 2개, 안경 1개면 (2 + 1)(1 + 1) - 1 = 5다. 경우의 수는 빠르게 커지므로 long long으로 시작한다.
- **고르는 쪽 바꾸기**: 9명 중 키의 합이 100인 7명을 고르는 것은 빠질 2명을 고르는 것과 같다(C(9, 7) = C(9, 2) = 36). 전체 합에서 두 값을 뺀 값이 100인 쌍을 이중 loop로 찾는다. 정렬한 배열 전체에 next_permutation을 돌려 앞 7개의 합을 봐도 통과하지만, 9! = 362,880개 순열을 돌며 같은 앞 7개를 뒤 2개의 순서 수(2!)만큼 반복해서 본다.
- **불가능을 먼저 거르기**: 두 수가 각각 10만 이하이면 합은 20만을 넘지 못하므로 목표 합이 20만보다 크면 탐색 없이 0이다. 입력 상한으로 증명되는 불가능 조건은 탐색 전에 처리한다.

### 어림 계산 사례

흔한 출발점은 최대 입력으로 어림한 연산 수가 1억 미만이면 완전탐색을 시도하는 것이다(1초 기준 경험칙과 한계는 [[Algorithm-Complexity#제한 시간에서 허용 복잡도 역산|허용 복잡도 역산]]). 실제로 고르는 후보 수에 후보 하나의 검증 비용을 곱한다.

| 상황 | 어림 | 판단 |
|---|---|---|
| 8 × 8 격자의 빈칸에 벽 3개, 매번 격자 확산 | C(64, 3) = 41,664 × 64칸 ≈ 267만 | 완전탐색 |
| 50 × 50 격자의 치킨집 13곳 이하 중 m곳 선택, 집 100곳 | 칸 기준 C(2500, m)이 아니라 후보 기준 C(13, m) ≤ 1,716가지 × 집 100곳 × m ≤ 약 223만 | 완전탐색 |
| 0~9를 중복 없이 최대 10자리로 나열 | 10! = 3,628,800 | 완전탐색 |
| 세로선 N ≤ 10, 높이 H ≤ 30인 사다리에 가로선을 최대 3개 추가, 매번 결과 확인 | 후보 (N - 1) × H ≤ 270곳에서 C(270, 3) ≈ 324만 × 확인 N × H = 300 ≈ 10억 | 가지치기 필요 |
| 원소 100만 개마다 오른쪽의 첫 큰 수 | 이중 loop 10¹² | [[Linear-Data-Structures#Stack\|단조 stack]] O(n) |

- 격자 크기가 아니라 실제로 고르는 후보 수로 센다. 좌표 후보는 `vector<pair<int, int>>`에 담아 index 0..k-1의 조합을 만들고 index로 좌표를 꺼내면 1차원 조합 코드를 그대로 쓴다.
- C(100, 3)은 분자 100 × 99 × 98이 100만 미만이라 바로 가능하다고 판단하는 식으로 상한만 빠르게 본다.
- 이론 상한이 실제를 크게 넘을 수 있다. 같은 알파벳을 두 번 밟지 않고 격자를 움직이는 탐색은 분기 3, 깊이 25로 보면 수천억이지만, 경우를 최대로 만든 입력에서 잰 호출은 약 245만 번이었다. 다른 방법이 떠오르지 않으면 최악 입력을 만들어 직접 잰다(아래 대표 예제 절 끝).

## 재귀 상태의 구성

backtracking 함수는 보통 다음 네 요소를 가진다.

1. 지금까지 내린 선택을 표현하는 state
2. 다음에 고를 후보를 만드는 transition
3. 답을 기록하는 base case
4. 더 진행해도 답이 없다는 pruning predicate

```text
search(state):
  if complete(state): record(state); return
  for choice in candidates(state):
    if invalid(choice): continue
    apply(choice)
    search(next state)
    undo(choice)
```

`apply`와 `undo`는 한 쌍이다. `visited`, vector, 누적합과 grid를 수정했다면 같은 stack frame에서 원복한다. immutable state를 복사하면 원복 실수는 줄지만 복사 비용을 계산해야 한다. 방문 집합이 정수 하나인 [[Bitmask-DP-and-TSP#언제 유용한가|bit mask]]면 인자로 넘기는 복사가 O(1)이라 원복 코드 자체가 사라진다.

원복 방식은 바뀌는 상태의 크기로 고른다.

- **바뀐 칸만 기록했다 되돌리기**: 감시 카메라의 방향을 정해 벽까지 칸을 칠하는 것처럼 한 선택이 격자 일부를 바꾸면, 실제로 빈칸에서 바뀐 좌표만 vector에 담았다가 재귀가 끝나면 그 좌표만 되돌린다. 이미 다른 선택이 칠한 칸까지 담아 되돌리면 그 선택의 표시가 지워진다. 칸마다 덮은 횟수를 더하고 빼는 방식도 안전하다. 표시 값은 지도에 쓰는 값(빈칸, 카메라 번호, 벽)과 겹치지 않게 고른다.
- **원본에서 새로 복사**: 회전 순서를 바꿔 가며 적용하는 것처럼 넓은 범위가 바뀌고 역연산이 번거로우면 경우마다 원본을 작업용 배열에 복사한다. 비용은 경우의 수 × 격자 크기다([[Simulation-Implementation#풀이 순서|시뮬레이션 풀이 순서]]).
- **값으로 넘기기**: 위의 bit mask처럼 상태가 정수 몇 개(현재 합, 연산자별 남은 개수)면 인자로 넘겨 호출마다 자기 복사본을 갖게 한다.

## 대표 예제로 보는 틀

- **중복 없는 수열 (N과 M 유형)**: 1부터 n 중 m개를 골라 나열한다. `arr[k]`에 k번째 수, `isused[i]`에 i의 사용 여부를 두고 `func(k)`를 "k개를 이미 고른 상태에서 `arr[k]`를 정한다"로 정의한다. `k == m`이면 출력하고 돌아간다. 아니면 미사용 `i`마다 `arr[k] = i; isused[i] = true; func(k + 1); isused[i] = false;`를 한다. `arr[k]`는 다음 선택이 덮어쓰므로 되돌리지 않는다. 사용 여부를 배열로 두면 이미 고른 수를 훑지 않고 O(1)에 판정한다.
- **N-Queen**: 행마다 퀸을 하나씩 놓으며 내려간다. 같은 열은 `y`, 오른쪽 위로 오르는 대각선은 `x + y`, 오른쪽 아래로 내리는 대각선은 `x - y`가 같다. 세 종류의 점유 배열(`x - y`는 음수를 피해 `x - y + n - 1`로 index)을 두면 놓을 수 있는지를 O(1)에 확인하고, 호출에서 돌아오면 셋 모두 false로 되돌린다.
- **부분수열의 합**: 원소마다 넣는다와 넣지 않는다 두 갈래로 내려가 모든 부분집합(2ⁿ개)을 본다. 현재 합을 인자로 넘기면 원복할 전역 상태가 없다. 크기가 양수인 부분수열만 셀 때는 목표 합이 0이면 공집합 하나를 빼야 한다.

```cpp
int n, cnt;
bool col[40], diag1[40], diag2[40];  // y, x+y, x-y+n-1

void place(int x) {
  if (x == n) { cnt++; return; }
  for (int y = 0; y < n; y++) {
    if (col[y] || diag1[x + y] || diag2[x - y + n - 1]) continue;
    col[y] = diag1[x + y] = diag2[x - y + n - 1] = true;
    place(x + 1);
    col[y] = diag1[x + y] = diag2[x - y + n - 1] = false;
  }
}
```

가지치기가 많은 백트래킹은 복잡도 상한이 실제 실행 시간과 크게 다르다. n이 작아 백트래킹 문제로 보이면 가장 오래 걸릴 입력(N-Queen이라면 최대 n)을 직접 돌려 시간을 재고, 이때는 디버그 빌드가 아니라 최적화 빌드(`-O2` 등 채점 환경과 같은 옵션)로 잰다.

## 순열과 조합

순열은 순서가 결과를 바꾸고, 조합은 선택 집합만 중요하다.

- 모든 순열을 사전식으로 열거할 때는 정렬된 상태에서 `std::next_permutation`을 반복한다.
- `std::next_permutation`은 다음 사전순 순열로 바꾸고 true를 반환하며, 마지막 순열이면 false를 반환하므로 `do { ... } while (next_permutation(a.begin(), a.end()));`로 쓴다. 중복 값이 있어도 서로 다른 순열만 만든다. n개 중 r개 조합은 `0`을 n-r개, `1`을 r개 둔 정렬된 mask 배열의 순열을 돌리고 1인 위치를 뽑으면 된다.
- 재귀 순열은 선택한 위치를 swap하고 호출 뒤 다시 swap한다.
- 조합은 다음 탐색 시작 index를 넘겨 같은 집합의 다른 순서를 만들지 않는다.
- 고를 개수가 3개 이하로 고정이면 j는 i + 1부터, k는 j + 1부터 도는 중첩 loop가 가장 짧다. 그보다 많거나 입력에 따라 달라지면 시작 index를 넘기는 재귀(push, 호출, pop, 고른 수가 목표에 닿으면 기저 사례)를 쓴다. 값이 아니라 index를 고르면 같은 값이 여러 개여도 헷갈리지 않는다.
- 중복 값이 있으면 같은 recursion depth에서 동일한 값을 다시 고르지 않는 규칙을 명시한다.

## 안전한 pruning

pruning은 빠를 것 같다는 추측이 아니라 버린 subtree에 최적해가 없다는 논거가 있어야 한다.

- 제약 위반: 이미 제한을 넘었고 이후 선택이 되돌릴 수 없음
- bound: 현재 값과 가능한 최선의 남은 값을 합쳐도 incumbent보다 나쁨
- dominance: 같은 상태에 더 나은 비용으로 이미 도달함
- symmetry: 서로 바꿔도 같은 결과인 후보 중 대표 하나만 탐색

잘못된 greedy 선택을 pruning처럼 넣으면 완전성이 깨진다. 먼저 pruning 없는 작은 입력 버전과 결과를 대조하는 것이 안전하다.

자주 쓰는 형태는 다음과 같다.

- **이론 최적에 닿으면 멈추기**: 합을 11로 나눈 나머지의 최댓값은 10을 넘을 수 없으므로 10을 찾는 순간 탐색 전체를 끝낸다. 원소 10개의 부분집합 1,024개를 다 볼 탐색이 입력에 따라 10번 남짓으로 준다.
- **답 하나면 바로 끝내기**: 첫 해만 출력하면 되는 문제에서 기저 사례가 return만 하면 현재 호출만 끝나 형제 가지가 계속 돌고 답을 여러 번 출력한다. bool을 돌려받아 호출 사슬을 끊거나 found flag를 확인하고, 출력 직후 exit으로 프로그램을 끝내도 된다.
- **incumbent로 자르고 순서로 돕기**: 최솟값을 구할 때 답 변수를 나올 수 없는 큰 값(INF)으로 시작하고, 지금까지 쓴 개수가 이미 그 값 이상이면 더 내려가지 않는다. 끝까지 INF면 불가능(-1)이다. 좋은 해가 먼저 나올 순서로 후보를 시도하면(종이로 칸을 덮는 문제에서 큰 종이부터) incumbent가 빨리 작아져 더 많이 잘린다. 순서만 바꾸고 후보는 버리지 않으므로 완전성이 유지되며, 위의 잘못된 greedy 선택과 다르다.
- **격자를 한 칸씩 훑는 재귀**: `dfs(y, x, cnt)`가 칸을 차례로 넘기고(줄 끝이면 다음 줄 첫 칸) 마지막 칸을 지나면 기저 사례에서 답을 갱신한다. 덮어야 할 칸이면 놓을 수 있는 선택마다 놓기, 재귀, 되돌리기를 한 쌍으로 하고, 하나도 놓을 수 없으면 그 가지는 실패다. 덮을 필요 없는 칸은 다음 칸으로 넘어간다.

## Meet in the middle

선택 수가 n개라서 O(2^n)은 크지만 절반의 O(2^(n/2))은 가능한 경우, 입력을 두 집합으로 나눠 각 절반의 모든 결과를 만든다. 한쪽 결과를 정렬한 뒤 다른 쪽 결과마다 binary search하거나 two pointers로 합치는 방식이 대표적이다.

시간과 memory는 문제에 따라 대략 O(2^(n/2)) 규모로 줄지만, 두 절반의 결과를 어떻게 합쳐야 원래 제약과 중복 개수를 보존하는지 증명해야 한다. 부분집합 합에서는 같은 합의 빈도를 유지하고 빈 subset 포함 여부를 확인한다.

## BFS도 상태 공간 탐색이다

가중치가 모두 같은 상태 전이에서 최소 횟수를 찾으면 BFS를 쓴다. 좌표뿐 아니라 열쇠 보유, 남은 체력, 시간의 parity처럼 미래 선택에 영향을 주는 값을 정점 상태에 포함한다. `visited[position]`만 두면 서로 다른 상태를 합쳐 오답이 될 수 있다.

경로를 복원하려면 처음 방문할 때 predecessor를 기록하고 목표에서 시작점까지 거슬러 올라간 뒤 뒤집는다. 여러 최단 경로의 수가 필요하면 같은 최단 거리에 다시 도착한 경우 count를 합산한다.

상태가 너무 많아 visited를 배열로 만들 수 없으면 실제로 도달한 상태만 map에 저장한다. 용량이 최대 10만인 두 물통의 (A 양, B 양)은 10만 × 10만 배열을 만들 수 없지만, 채우기, 비우기, 붓기 중 무엇을 해도 끝난 뒤 한쪽 물통은 비었거나 가득 차 있으므로 빈 물통에서 시작해 닿는 상태는 2(A + B) + 4개 이하다. `map<pair<int, int>, int>`에 상태별 최소 횟수를 두고 처음 보는 상태만 queue에 넣는다(조회 O(log n)). hash map을 쓰려면 상태를 `a * (B + 1) + b`처럼 정수 하나로 묶은 key가 간단하다. JavaScript의 Map도 배열 key를 내용이 아니라 참조로 비교하므로 같은 이유로 정수나 문자열로 묶는다. 여섯 가지 전이는 함수로 묶어 반복 코드를 줄인다.

## 대표 실패 원인

- base case 전에 array 범위를 벗어남
- 전역 accumulator를 sibling 호출 사이에 복구하지 않음
- 재귀 호출 뒤에 다시 쓰는 값을 전역에 둠: 다음 칸 좌표 `ny`, `nx`를 전역 변수로 옮기기만 해도, 자식 호출이 같은 변수를 덮어써 돌아온 부모의 `visited[ny][nx] = 0`이 자기가 표시한 칸이 아닌 다른 칸을 해제한다. 지역 변수는 호출마다 자기 stack frame에 따로 생기지만 전역 변수는 data 또는 bss 영역에 하나뿐이다. 전역은 모든 호출이 함께 갱신해 가는 값(지금까지의 최댓값, 개수)에 쓰고, 인자로 넘기거나 재귀 호출 뒤에 다시 읽는 값은 지역으로 둔다.
- 중복 순열을 모두 생성함
- 이론적 상한만 보고 실제 검증 비용을 빠뜨림
- pruning 조건이 최적해도 제거함
- grid의 `(y, x)`와 방향 vector 순서를 섞음

## 출처

- 인프런, 큰돌 강사, [2-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100340), [3주차 개념 #1. 완전탐색과 백트래킹](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100310), [3주차개념 #2. 완탐과 원복](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=160119), [3-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100356), [3-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100357)
- 인프런, 큰돌 강사, [3-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100358), [3-D와 반례](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100359), [3-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100360), [3-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100361), [3-G 와 테스트케이스 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100362)
- 인프런, 큰돌 강사, [3-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100363), [3-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100364), [3-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100365), [3-K와 문제의 단순화](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100366), [3-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100367)
- 인프런, 큰돌 강사, [3-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100368), [3-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100369), [3-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100370), [3-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100371), [3-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100372)
- 인프런, 큰돌 강사, [맞왜틀팁 : 전역변수를 사용할 때 주의할 점 | 3-Q 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144194), [5-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100410), [5-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100413), [5-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100414), [5-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100419)
- 인프런, 큰돌 강사, [7-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100977), [7-U meet in the middle](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100984), [1-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100293), [1-A : 재귀함수로 푸는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=151225), [(필수개념) 조합(combination)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123557)
- 인프런, 큰돌 강사, [1-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100302), [1-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100304), [1 - L 재귀로 푸는 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=228311), [2-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100344), [4-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100383)
- 인프런, 큰돌 강사, [7-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100979)

- [바킹독의 실전 알고리즘 0x0C강, 백트래킹 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=Enz2csssTCs)
- [NIST DADS, backtracking](https://xlinux.nist.gov/dads/HTML/backtrack.html)
- [NIST DADS, brute force](https://xlinux.nist.gov/dads/HTML/bruteforce.html)

## 관련 문서

- [[Algorithm-Recursion|재귀와 call stack]]
- [[Graph-Traversal-and-Shortest-Path|DFS/BFS와 경로 복원]]
- [[Bitmask-DP-and-TSP|부분집합을 bit mask로 표현하기]]
- [[Cpp-Coding-Test-Workflow|구현과 반례 점검]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]
- [[Simulation-Implementation|시뮬레이션과 진법 열거]]

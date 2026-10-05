---
tags: [cs, algorithm, binary-search, parametric-search, lis]
status: done
category: "CS - 알고리즘"
aliases: ["Binary Search and LIS", "이분탐색과 LIS"]
---

# 이분탐색, 매개변수 탐색과 LIS

이분탐색은 정렬된 배열의 값만 찾는 기법이 아니다. 후보 답에 대한 판정이 `false...false, true...true`처럼 단조로우면 답의 경계도 이분탐색할 수 있다.

## 경계를 찾는 이분탐색

반열린 구간 `[lo, hi)`에서 처음으로 predicate가 `true`인 위치를 찾는 형태를 정하면 off-by-one을 줄일 수 있다.

```text
while lo < hi:
  mid = lo + (hi - lo) / 2
  if predicate(mid): hi = mid
  else: lo = mid + 1
return lo
```

loop invariant는 `[0, lo)`는 거짓이고 `[hi, n)`은 참이라는 식으로 명시한다. `mid = (lo + hi) / 2`의 덧셈 overflow를 피하려면 차를 이용한다.

`lower_bound`는 `value` 이상인 첫 위치, `upper_bound`는 `value`보다 큰 첫 위치를 반환한다. 결과가 `end()`일 수 있으므로 dereference 전에 확인한다. 같은 값의 개수는 `upper_bound - lower_bound`로 구할 수 있다.

## 답을 이분탐색하기

최댓값을 최소화하거나 최솟값을 최대화하는 문제는 다음 순서로 바꾼다.

1. 후보 답 `x`를 정한다.
2. `x`로 조건을 만족할 수 있는지 O(f(n))에 판정한다.
3. `x`가 커질수록 판정이 한 방향으로만 변함을 증명한다.
4. 가능한/불가능 경계를 포함하도록 초기 구간을 잡는다.

전체 시간은 보통 `O(f(n) log R)`이며 `R`은 답의 탐색 범위다. 판정 함수가 내부 state를 재사용해 이전 호출 결과에 오염되지 않게 한다.

### 닫힌 구간에 답을 기록하는 형태

```text
ans = -1                                # 판정이 한 번도 참이 아니면 답 없음
while lo <= hi:
  mid = lo + (hi - lo) / 2
  if ok(mid): ans = mid; hi = mid - 1   # 가능한 최솟값을 찾는 경우
  else: lo = mid + 1
```

- 위 반열린 형태와 같은 경계를 찾지만 두 형태를 섞으면 깨진다. `lo < hi` 조건에 `hi = mid - 1`을 쓰면 lo와 hi가 만난 마지막 후보를 검사하지 않고 끝나고, `lo <= hi` 조건에 `hi = mid`를 쓰면 `ok(mid)`가 참일 때 구간이 줄지 않아 무한 루프가 된다. 한 풀이에서는 한 형태로 통일한다.
- `ans`를 나올 수 없는 값으로 시작하면 판정이 한 번도 참이 아닌 입력(답 없음)이 저절로 구분된다. 전체 X판 중 Y판을 이겨 내림한 정수 승률을 앞으로 몇 판 더 이겨야 바꿀 수 있는지 묻는 문제에서, 승률이 99% 이상이면 Y < X인 한 `(Y + K) / (X + K)`가 1에 닿지 않아 아무리 이겨도 바뀌지 않는다. 따로 분기하지 않아도 -1이 남는다.
- hi는 최악 입력에서 필요한 값을 역산해 잡는다. 같은 문제에서 X = 10억, Y = 9.8억이면 98%를 99%로 올리는 데 정확히 10억 판이 필요하므로 hi는 10억이다. 승률은 `Y * 100 / X`를 long long 정수 연산으로 구한다. `29.0 / 100 * 100`처럼 실수 나눗셈을 먼저 하면 28.999…가 되어 내림이 틀린다.

### 판정 함수 패턴

- **묶음 수 세기**: 순서를 바꿀 수 없는 원소들을 크기 x 이하의 묶음에 앞에서부터 채우고 넘치면 새 묶음을 연다. 묶음 수가 M 이하면 가능이다. 묶음을 쪼개거나(원소 수가 M 이상이면) 남은 용량이 있어도 새로 열 수 있는 문제라면 묶음 수는 언제든 늘릴 수 있으므로, 정확히 M이 아니라 M 이하로 판정한다. 원소 하나가 x보다 크면 어떤 배치도 불가능하므로 lo를 가장 큰 원소로 두거나 판정에서 바로 거짓을 낸다. hi는 전체 합이다.
- **나눠 줄 사람 수 세기**: 한 사람이 한 종류만 최대 x개 받으면 개수 c인 종류에는 `(c + x - 1) / x`명이 필요하다. 합이 사람 수 N 이하면 가능하고(못 받는 사람이 있어도 되는 경우), 범위는 1부터 가장 많은 종류의 개수까지다.
- **반복 대신 닫힌 식**: 판정 안의 시뮬레이션 비용은 판정 횟수(log R)만큼 곱해진다. 공격력 A인 쪽이 먼저 때려 체력 h를 쓰러뜨리는 데 `(h + A - 1) / A`번이 들고 상대는 그보다 한 번 적게 때리므로, 받는 피해를 loop 없이 곱셈으로 구한다. 체력 회복은 `min(x, 현재 + 회복량)`처럼 후보 x를 상한으로 둔다.
- 판정 안의 합과 곱은 int를 넘기 쉬우므로 처음부터 long long으로 두고 곱의 피연산자도 넓힌다([[Cpp-Coding-Test-Workflow#정수와 실수 계산|정수와 실수 계산]]).

### 경계를 찾은 뒤 순위 확정

운행 시간이 t_i인 놀이기구 M개에 N명이 줄 서서 탈 때(빈 기구가 여럿이면 번호가 작은 것부터) N번째 사람이 타는 기구는, 이분탐색으로 시각의 경계를 찾고 그 시각 안의 순서는 선형으로 확정한다.

1. 시각 T까지 탄 인원은 `count(T) = Σ(T / t_i + 1)`이다(시각 0에 모든 기구에 한 명씩 탄다).
2. `count(T) >= N`인 최소 T를 찾는다. hi는 최악인 N × max(t_i)(20억 × 30 = 600억)보다 크게, long long으로 잡는다.
3. T 전에 탄 `count(T - 1)`명 다음부터 T에 새로 비는 기구(`T % t_i == 0`)를 번호순으로 세어 N번째가 타는 기구를 찾는다. N ≤ M이면 시각 0에 끝나 T - 1이 음수가 되므로 먼저 N번 기구로 답한다.

## 이분탐색으로 풀리는 대표 유형

- **여러 값의 존재나 개수 질의**: 수 N개에서 M개의 값을 각각 찾으면 선형 탐색은 O(NM)이다. 한 번 정렬(O(N log N))하고 질의마다 이분탐색하면 O((N + M) log N)이다. 존재 여부는 `std::binary_search`, 개수는 `upper_bound - lower_bound`나 둘을 한 번에 주는 `equal_range`로 구한다. 모두 오름차순 정렬이 전제다.
- **좌표 압축**: 값의 범위가 10⁹처럼 커서 배열 index로 쓸 수 없을 때, 값을 크기 순위(0부터)로 바꾼다. 복사본을 정렬하고 `v.erase(unique(v.begin(), v.end()), v.end())`로 중복을 지운 뒤, 각 값의 순위는 `lower_bound(v.begin(), v.end(), x) - v.begin()`이다. `unique`는 인접한 중복만 뒤로 보내므로 반드시 정렬 뒤에 쓴다.
- **합을 쪼개 검색하기**: 집합에서 `a + b + c = d`를 만족하는 가장 큰 d를 찾을 때 네 수를 모두 고르면 O(N⁴)다. `a + b`의 모든 합을 미리 만들어 정렬해 두고, `(d, c)` 쌍마다 `d - c`가 합 목록에 있는지 이분탐색하면 O(N² log N)이다. 식을 두 부분으로 나눠 한쪽을 미리 계산하는 방식으로, [[Exhaustive-Search-and-Backtracking#Meet in the middle|meet in the middle]]과 같은 발상이다.

### 매개변수 탐색 예: 자르기

길이가 제각각인 선 K개를 같은 길이로 잘라 N개 이상 만들 때 가능한 최대 길이를 묻는 최적화 문제는, 길이 x로 자르면 N개 이상 나오는가라는 결정 문제로 바꾼다. 조각 수 `sum(len / x)`는 x가 커질수록 줄어드므로 참인 구간이 작은 쪽에 모여 있고, 그 경계의 최댓값을 찾는다.

- 참이면 답이 x 이상이므로 `lo = mid`, 거짓이면 `hi = mid - 1`로 줄인다. 이때 `mid = (lo + hi) / 2`로 내림하면 `lo + 1 == hi`에서 mid가 lo에 머물러 무한 루프가 되므로 `mid = (lo + hi + 1) / 2`로 올림한다. 위의 반열린 구간 형태로 바꿔 거짓이 처음 나오는 위치 - 1을 답으로 하면 이 구분이 필요 없다.
- 길이가 최대 2³¹ - 1이면 `lo + hi + 1`이 `int`를 넘으므로 `long long`을 쓴다. 자른 뒤 남는 길이(`전체 합 - x × N`)를 답하는 변형은 합이 커지므로(길이 10억인 선 100만 개면 10¹⁵) 곱과 합도 long long으로 계산한다.
- 매개변수 탐색 문제는 DP나 greedy와 결합해 나오는 경우가 많고, 문제를 보고 결정 문제로 바꿀 수 있다는 것 자체를 알아차리기 어렵다. 조건을 만족하는 최소 또는 최대를 묻고, 답이 커질수록 조건이 한 방향으로만 바뀌면 먼저 의심한다.

## Longest Increasing Subsequence

`dp[i]`를 `i`에서 끝나는 LIS 길이로 두면 이전의 더 작은 모든 값을 확인해 O(n^2)에 길이를 구할 수 있다.

더 빠른 방법은 길이별 증가 부분수열의 가능한 마지막 값 중 최솟값을 `tails`에 유지한다.

- strictly increasing LIS: `lower_bound`로 `a[i]` 이상인 첫 위치를 교체한다.
- non-decreasing subsequence: `upper_bound`로 `a[i]`보다 큰 첫 위치를 교체한다.
- 교체 위치가 없으면 `tails` 뒤에 추가한다.
- 고정 크기 배열로 구현하며 빈 칸을 0으로 판정하면(`lis[pos] == 0`이면 길이 증가) 입력이 모두 양수일 때만 맞는다. 0이나 음수가 들어오면 반환 위치가 현재 길이와 같은지로 판정하거나, 빈 칸을 답이 될 수 없는 INF로 채운다.

`tails` 자체가 원래 배열의 실제 subsequence일 필요는 없지만 그 길이는 LIS 길이다. 실제 수열을 복원하려면 각 원소가 들어간 길이 위치와 predecessor index를 별도로 저장하고 마지막 index부터 거슬러 올라간다. predecessor 없이 원소마다 들어간 위치만 저장해도 된다. 입력을 뒤에서부터 훑으며 위치가 L - 1, L - 2, ..., 0인 원소를 차례로 고른 뒤 뒤집으면 실제 LIS다. 고른 위치 k 원소보다 앞쪽에서 가장 가까운 위치 k - 1 원소는 그 원소가 들어올 때 `tails[k - 1]`에 있던 값이라 더 작기 때문이다. 10, 20, 30, 14는 위치가 0, 1, 2, 1이라 30, 20, 10을 고르고 뒤집어 10, 20, 30이 된다.

### LIS로 환원하기

두 전봇대를 잇는 전깃줄 (A쪽 위치, B쪽 위치)에서 교차하지 않게 남길 수 있는 최대 개수는, A쪽 위치로 정렬한 뒤 B쪽 위치 수열의 LIS 길이다. A 순서대로 놓았을 때 B도 증가해야 서로 교차하지 않기 때문이다. 없애야 할 최소 개수는 N - LIS다. 쌍으로 주어진 입력은 한 축으로 정렬해 보고, 남은 축에서 증가 조건이 보이면 LIS를 의심한다. 작은 예를 그림으로 그려 무엇을 지우는지 보면 환원이 드러난다.

## 흔한 오류

- 배열이 정렬되지 않았는데 값 찾기용 binary search를 적용함
- predicate가 단조롭지 않은데 답을 이분탐색함
- `lo`, `hi`가 가능한 값인지 불가능한 값인지 invariant가 없음
- 닫힌 구간과 반열린 구간의 조건과 갱신을 섞어 마지막 후보를 놓치거나 무한 루프에 빠짐
- `lower_bound`와 `upper_bound`를 바꿔 중복 값의 의미가 달라짐
- 빠른 LIS의 `tails`를 곧바로 정답 수열로 출력함
- 답 범위의 최댓값이나 합이 `int`를 넘음

## 출처

- 인프런, 큰돌 강사, [6주차 개념 #1. 이분탐색(Binary Search)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100313), [6주차 개념 #2. 최대증가부분수열(LIS, Longest Increasing Subsequence)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=246964), [6-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100947), [6-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100948), [6-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100949)
- 인프런, 큰돌 강사, [6-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100950), [6-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100952), [6-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100953), [6-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100954), [6-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100955)
- 인프런, 큰돌 강사, [6-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100956), [6-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100957), [6-M O(NlogN) 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100959), [6-M O(N^2) 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152727), [6-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100960)
- 인프런, 큰돌 강사, [6-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100961)

- [바킹독의 실전 알고리즘 0x13강, 이분탐색 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=3TkaOKHxHnI)
- [NIST DADS, binary search](https://xlinux.nist.gov/dads/HTML/binarySearch.html)
- [C++ working draft, binary search algorithms](https://eel.is/c++draft/alg.binary.search)

## 관련 문서

- [[Algorithm-Searching|선형 검색과 이진 검색 기본]]
- [[Cpp-Language-Memory-and-STL|C++ 표준 Algorithm]]
- [[Algorithm-DP|동적 프로그래밍]]
- [[Algorithm-Complexity|복잡도 분석]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]

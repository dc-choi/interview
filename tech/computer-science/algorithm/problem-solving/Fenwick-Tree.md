---
tags: [cs, algorithm, fenwick-tree, binary-indexed-tree, range-query]
status: done
category: "CS - 알고리즘"
aliases: ["Fenwick Tree", "Binary Indexed Tree", "펜윅 트리", "2차원 Fenwick tree", "2D BIT"]
---

# Fenwick tree

Fenwick tree 또는 Binary Indexed Tree는 배열의 prefix aggregate를 compact하게 저장한다. 합처럼 inverse가 있는 연산에서 point update와 prefix/range query를 각각 O(log n)에 처리한다.

## `lowbit`가 나타내는 범위

1-based index `i`에서 `i & -i`는 가장 낮은 set bit의 값이다(2의 보수로 본 원리는 [[Bitmask-DP-and-TSP|비트마스크 문서]]). `tree[i]`는 보통 다음 구간의 합을 저장한다.

```text
[i - lowbit(i) + 1, i]
```

2의 보수 표현을 전제로 한 bit trick을 signed overflow 경계에 적용하지 않는다. index는 양수 범위에서 사용하고, 합을 저장하는 type은 값의 총합을 담을 만큼 넓게 잡는다.

## Point update

원소 `index`에 `delta`를 더할 때 그 원소를 포함하는 상위 구간으로 이동한다.

```text
while index <= n:
  tree[index] += delta
  index += index & -index
```

값을 `newValue`로 대입하려면 현재 값을 따로 저장해 `delta = newValue - oldValue`를 계산한다.

## Prefix와 range query

`1..index`의 합은 현재 구간을 더하고 parent prefix로 이동한다.

```text
sum = 0
while index > 0:
  sum += tree[index]
  index -= index & -index
```

inclusive range `[left, right]`의 합은 `prefix(right) - prefix(left - 1)`이다. 외부 API를 0-based로 만들 수 있지만 내부 변환을 한 곳에 모아 index 0에서 무한 loop가 생기지 않게 한다.

## Build와 범위 확장

모든 원소를 point update하면 O(n log n)에 만들 수 있다. `tree[i]`를 parent `i + lowbit(i)`에 더하는 방식으로 O(n) build도 가능하다.

Difference array와 Fenwick tree를 결합하면 range add와 point query를 처리할 수 있다. Fenwick tree 두 개를 사용하면 range add와 range sum도 O(log n)에 구현할 수 있지만, 식의 index convention을 먼저 유도하고 검증해야 한다.

## Coordinate compression

좌표 값은 매우 크지만 실제 등장 값이 n개뿐이면 값을 정렬하고 중복을 제거한 뒤 순위 index로 바꾼다. `lower_bound` 결과에 1을 더하면 Fenwick tree의 1-based index로 사용할 수 있다. compression은 대소 순서를 보존하지만 원래 좌표 사이의 거리까지 보존하지는 않는다. 같은 값은 같은 rank를 가져야 한다.

## 정렬과 함께 쓰는 패턴

원소를 하나씩 추가하며 특정 값 이하의 개수나 합을 묻는 것은 값이 계속 바뀌는 배열의 prefix 질의라 Fenwick tree의 몫이다. 처리 순서를 정렬로 정하면 한 축의 조건이 사라진다.

### 2차원 쌍 세기

점 A에서 x는 같거나 크고 y는 같거나 작은 점 B로 갈 수 있을 때 (A, B) 쌍의 수는, 점이 7만 5천 개면 이중 loop로 n² ≈ 56억이라 안 된다. 한 축은 처리 순서로, 다른 축은 prefix count로 맡긴다.

1. x 오름차순으로 처리하면 현재 점 B와 짝이 될 A는 이미 처리한 점 중에 있다.
2. 같은 x에서는 y가 큰 점이 먼저 처리돼야 짝을 놓치지 않으므로 (x, -y) 오름차순으로 정렬한다. 세야 할 조건 `y_A >= y_B`도 `-y_A <= -y_B`라는 prefix 질의가 된다.
3. 점마다 `answer += prefix(idx)`로 조건을 만족하는 과거 점 수를 더한 뒤 `update(idx, 1)`한다.
4. y가 ±10억이면 -y를 좌표 압축한 index를 쓴다.

등호 포함 여부를 정렬의 tie 순서와 prefix 범위(이하, 미만)에 함께 반영해야 한다. 쌍의 수는 long long이고 테스트 케이스마다 tree를 비운다.

### 개수와 합을 따로 두고 거리 합 구하기

좌표 x에 점을 차례로 추가하며 이미 있는 점들까지의 거리 합 `Σ|x - x_j|`를 구하면, x 이하 점의 개수 cntL과 좌표 합 sumL, x보다 큰 점의 cntR과 sumR로 `x × cntL - sumL + sumR - x × cntR`이다. 왼쪽 항은 그림으로 그리면 높이 x, 폭 cntL인 직사각형에서 왼쪽 점들의 좌표 막대 넓이를 뺀 값이고, 오른쪽 항은 그 반대다. 개수용과 좌표 합용 Fenwick tree 두 개를 두고, 오른쪽 값은 전체 개수와 합에서 왼쪽을 빼서 얻는다. 비용을 구한 뒤 개수 tree에 `update(x, 1)`, 합 tree에 `update(x, x)`를 하며, 좌표가 0부터면 1을 더해 1-based index로 쓴다. 답에 나머지를 취하라는 문제라도 tree에는 실제 값을 저장해야 두 식이 음수가 되지 않으므로, 합의 최댓값이 long long 안에 드는지 먼저 확인한다.

### 맨 앞으로 옮기며 순위 세기

더미에서 원소 하나를 꺼내 그 위에 몇 개가 있었는지 답하고 맨 위로 올리는 질의 m번은, 위치 배열 앞쪽에 m칸을 비워 두고 원소를 m + 1번부터 놓는다. 질의마다 그 원소 앞의 개수 `prefix(pos - 1)`을 답하고, 원래 위치에 -1, 다음 빈 앞자리(매번 1씩 줄어든다)에 +1을 update한 뒤 원소별 위치를 갱신한다. 계속 앞으로 당기면 위치가 음수가 되므로 질의 수만큼 offset을 두는 것이다. tree 크기는 원소 수 + 질의 수다.

## 2차원 Fenwick tree

값 변경과 직사각형 합 질의가 섞이면 1차원 loop 안에 y축 loop를 하나 더 둔다.

```text
update(x, y, delta):
  for (i = x; i <= n; i += i & -i)
    for (j = y; j <= m; j += j & -j)
      tree[i][j] += delta

prefix(x, y):   # (1, 1)부터 (x, y)까지의 합
  for (i = x; i > 0; i -= i & -i)
    for (j = y; j > 0; j -= j & -j)
      s += tree[i][j]
```

(x1, y1)부터 (x2, y2)까지의 합은 포함-배제로 `prefix(x2, y2) - prefix(x1 - 1, y2) - prefix(x2, y1 - 1) + prefix(x1 - 1, y1 - 1)`이다. 값을 대입하는 연산은 1차원처럼 차이만큼 update한다. 연산마다 O(log n × log m), 메모리 O(nm)이며, 값이 바뀌지 않으면 [[Prefix-Sum-and-Range-Queries#2차원 누적합|2차원 누적합]]이 더 단순하다.

## Segment tree와 비교

| 요구 | Fenwick tree | Segment tree |
|---|---|---|
| point add, prefix/range sum | 간단하고 memory가 작음 | 가능 |
| range minimum/maximum | 일반적 형태로는 부적합 | 적합 |
| 복잡한 node 정보와 lazy range update | 제한적 | 확장 가능 |
| 구현 상수와 코드 길이 | 작음 | 상대적으로 큼 |

## 구현 체크리스트

- 내부 index가 1부터 시작하는가?
- update에 새 값이 아니라 `delta`를 넣었는가?
- `left - 1`이 API convention과 맞는가?
- prefix 총합이 저장 type을 넘지 않는가?
- 여러 test case에서 tree를 다시 초기화하는가?

## 출처

- 인프런, 큰돌 강사, [8주차 개념 #1. 펜윅트리(Fenwick Tree)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100315), [8-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101057), [8-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101062), [8-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101063), [8-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101064)
- 인프런, 큰돌 강사, [8-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101065)

- Peter M. Fenwick, [A new data structure for cumulative frequency tables](https://doi.org/10.1002/spe.4380240306), 1994

## 관련 문서

- [[Prefix-Sum-and-Range-Queries|누적합과 구간 질의]]
- [[Algorithm-Complexity|시간복잡도와 공간복잡도]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]

---
tags: [cs, algorithm, prefix-sum, range-query, difference-array]
status: done
category: "CS - 알고리즘"
aliases: ["Prefix Sum and Range Queries", "누적합"]
---

# 누적합과 구간 질의

누적합은 앞에서부터의 합을 미리 저장해 동일한 구간 계산을 반복하지 않는 기법이다. 원본이 불변이거나 update보다 query가 훨씬 많을 때 단순하고 강력하다.

## 1차원 누적합

0-based 배열 `a`에 대해 `prefix[0] = 0`, `prefix[i + 1] = prefix[i] + a[i]`로 정의한다. 그러면 반열린 구간 `[l, r)`의 합은 다음과 같다.

```text
sum(l, r) = prefix[r] - prefix[l]
```

전처리는 O(n), 각 query는 O(1), 추가 공간은 O(n)이다. `prefix`에 빈 prefix를 포함시키면 `l = 0`을 별도 분기하지 않아도 된다. 합의 최댓값을 계산해 overflow하지 않는 type을 사용한다.

## 2차원 누적합

`prefix[y][x]`를 `(0, 0)`부터 `(y, x)` 직전까지의 직사각형 합으로 정의하면 포함-배제로 임의 직사각형을 O(1)에 구할 수 있다.

```text
sum(y1, x1, y2, x2)
  = prefix[y2][x2]
  - prefix[y1][x2]
  - prefix[y2][x1]
  + prefix[y1][x1]
```

여기서 질의 영역도 `[y1, y2) x [x1, x2)`다. 경계를 padding한 prefix table을 쓰면 위 식을 그대로 유지할 수 있다.

## Difference array

구간 `[l, r)` 전체에 `delta`를 더하는 update가 많고 최종 배열만 필요하면 difference array를 쓴다.

```text
diff[l] += delta
diff[r] -= delta
```

모든 update가 끝난 뒤 `diff`의 누적합을 한 번 계산하면 결과가 복원된다. 온라인으로 중간 값을 계속 물으면 이 방식만으로는 충분하지 않다.

## Sliding window와의 차이

고정 길이 연속 구간 하나를 순서대로 훑는다면 직전 합에서 빠지는 값과 새 값을 반영하는 sliding window가 O(1) 공간으로 충분하다. 임의 구간 query가 반복되면 prefix sum이 더 직접적이다.

원형 배열의 연속 구간은 배열을 두 번 이어 붙여 선형 문제로 바꿀 수 있다. 단, 길이가 원래 크기를 넘는 구간과 전체 원을 나타내는 경우를 중복 계산하지 않는다.

## Update가 있는 경우

누적합을 만든 뒤 원소 하나가 바뀌면 뒤쪽 prefix를 모두 다시 계산해야 해 O(n)이다. 누적합을 사용할 수 없는 것이 아니라 update 비용이 큰 것이다.

| workload | 구조 |
|---|---|
| build 1회, range sum 다수 | prefix sum |
| range update 다수, 마지막에 결과 1회 | difference array |
| point update와 range sum 혼합 | [[Fenwick-Tree|Fenwick tree]], segment tree |
| range minimum/maximum과 update | segment tree 등 다른 range structure |

## 점검 항목

- 구간이 inclusive인지 half-open인지 식과 코드가 일치하는가?
- 빈 prefix를 두었는가?
- 합의 type이 충분히 넓은가?
- 원본 update가 있다면 rebuild 비용을 포함했는가?
- 원형 구간을 중복 집계하지 않는가?

## 출처

- 인프런, 큰돌 강사, [1주차 개념 #9. 누적합(prefix sum)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133248), [1-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100295), [1-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100300), [5-V](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100417)

## 관련 문서

- [[Fenwick-Tree|Fenwick tree]]
- [[Greedy-Sweep-and-Two-Pointers|Two pointers와 sliding window]]
- [[Algorithm-Complexity|시간복잡도와 공간복잡도]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]

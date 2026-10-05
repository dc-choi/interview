---
tags: [cs, algorithm, search, linear-search, binary-search]
status: done
verified_at: 2026-10-05
category: "CS - 알고리즘"
aliases: ["검색", "탐색", "Searching", "선형 검색", "순차 검색", "Linear Search", "이진 검색", "Binary Search"]
---

# 검색: 선형 검색과 이진 검색

검색은 모음에서 key와 같은 원소를 찾아 위치나 연관 값을 돌려주거나, 없다는 것을 확정하는 문제다. 쓸 수 있는 방법은 데이터에 대해 미리 아는 것이 정한다. 아무 정보가 없으면 모든 원소를 봐야 하고, key 순서로 정렬돼 있고 index로 바로 접근할 수 있으면 비교할 때마다 후보의 절반을 버린다. 비용 표기는 [[Algorithm-Complexity|시간복잡도와 Big O]]를 따른다.

## 선형 검색

선형 검색(linear search, 순차 검색)은 앞에서부터 한 칸씩 key와 비교한다. 같은 원소를 만나면 바로 끝내고, 끝까지 없을 때만 없다고 답한다.

```text
for i in 0 .. n-1:
    if a[i] == key: return i
return NOT_FOUND
```

- 찾으면 그 위치까지만 보고 없으면 n칸을 모두 본다. 케이스별 비용(최선 Θ(1), 최악 Θ(n), 값이 있고 위치가 균등하다고 가정한 평균 `(n + 1) / 2`번)은 [[Algorithm-Complexity#점근 표기법|점근 표기법]]에 있다.
- 정렬되지 않은 배열에서 없다고 답하려면 어떤 알고리즘이든 n칸을 모두 봐야 한다. 한 칸이라도 보지 않고 없다고 답하면 바로 그 칸에 key가 있는 입력에서 틀리기 때문이다. 따라서 추가 정보가 없는 검색 문제의 최악 하한은 Ω(n)이고, 선형 검색은 이 하한에 맞는다.
- 앞에서부터 차례로 갈 수만 있으면 되므로 연결 리스트와 stream에도 쓴다. 이름에 특정 글자가 들어간 사람처럼 정렬 key가 아닌 조건으로 찾을 때도 그 조건에 맞춘 별도 index가 없으면 선형 검색이다.
- 없음을 -1 같은 index로 표시하면 그 값이 유효한 위치와 겹치지 않아야 한다. C의 `bsearch`처럼 원소 pointer를 돌려주고 없으면 `NULL`을 쓰는 계약도 있다. 프로그램 자체가 검색 도구라면 종료 상태로 결과를 알린다. POSIX `grep`은 선택한 줄이 있으면 0, 없으면 1, 오류면 1보다 큰 값으로 끝나 셸 조건문에서 바로 쓸 수 있다.

## 이진 검색

이진 검색(binary search)은 정렬된 배열의 가운데 원소와 key를 비교해, key가 더 작으면 왼쪽 절반, 크면 오른쪽 절반만 남기는 일을 반복한다. 남은 구간이 비면 없다고 답한다.

```text
lo = 0, hi = n - 1
while lo <= hi:
    mid = lo + (hi - lo) / 2
    if a[mid] == key: return mid
    if key < a[mid]: hi = mid - 1
    else: lo = mid + 1
return NOT_FOUND
```

- 전제는 두 가지다. key 기준으로 정렬돼 있어야 하고, 가운데 원소에 O(1)에 접근할 수 있어야 한다([[Linear-Data-Structures#Array와 dynamic array|배열의 random access]]). 정렬되지 않은 배열에 쓰면 느려지는 것이 아니라 있는 값을 없다고 답할 수 있다. 연결 리스트는 가운데까지 가는 데만 O(n)이 들어 이점이 사라지므로, 순서를 유지하며 빠르게 찾으려면 [[Trees-and-Balanced-Search-Trees|균형 탐색 트리]]를 쓴다.
- 한 단계마다 남은 구간이 절반 이하로 줄어 최악 `⌊log₂ n⌋ + 1`단계에 끝난다. 의사코드의 `==`와 `<`를 작음, 같음, 큼을 한 번에 가리는 3-way 비교(`strcmp`나 비교 함수 호출) 한 번으로 세면 n = 100만에서 최악 20번이다.
- 비교만 쓰는 검색은 비교 결과가 불리하게 나오면 후보가 절반 가까이 남는다. 그래서 n개 위치와 없음을 모두 가려내려면 최악 Ω(log n)번이 필요하고, 이진 검색은 이 하한에 맞는다. 같은 셈법으로 비교 정렬의 하한도 구한다([[Algorithm-Sorting#비교 정렬의 하한|비교 정렬의 하한]]).
- 같은 값이 여럿일 때 첫 위치나 key 이상인 첫 위치를 찾는 경계 형태와, 답을 이분탐색하는 매개변수 탐색은 [[Binary-Search-and-LIS|이분탐색, 매개변수 탐색과 LIS]]에서 다룬다.

## 정렬해 두고 찾을지 판단하기

한 번만 찾으면 정렬(O(n log n))하고 이진 검색하는 것보다 선형 검색(O(n))이 싸다. 같은 데이터를 k번 찾으면 선형 검색은 O(kn), 한 번 정렬하고 이진 검색하면 O(n log n + k log n)이라, 상수를 무시하면 k가 log n을 넘을 무렵부터 정렬이 이득이다. n = 100만이면 n log₂ n이 약 2,000만이라, 없는 값을 찾는 선형 검색 20번 정도의 비용이다. 여러 값을 한꺼번에 묻는 코딩 테스트 유형은 [[Binary-Search-and-LIS#이분탐색으로 풀리는 대표 유형|이분탐색으로 풀리는 대표 유형]]에 있다.

데이터가 계속 바뀌면 찾는 비용만으로 고르지 않는다.

| 구조 | 찾기 | 삽입 | 순서대로 순회 |
|---|---|---|---|
| 정렬되지 않은 배열 | O(n) | 끝에 붙여 amortized O(1) | 먼저 정렬해야 함 |
| 정렬된 배열 | O(log n) | 뒤 원소를 밀어 O(n) | O(n) |
| 균형 탐색 트리 | O(log n) | O(log n) | O(n) |
| hash table | 평균 O(1) | 평균 O(1) | 순서 없음 |

삽입이 드물고 조회가 많으면 정렬된 배열이 낫다. 자식 pointer가 없어 메모리를 적게 쓰고, 찾은 위치부터 범위를 읽을 때 연속 메모리를 차례로 읽는다. 삽입과 범위 조회가 섞이면 균형 탐색 트리나 [[B-Tree|B-tree]]를, 순서 없이 정확히 같은 key만 찾으면 [[Hash-Table|hash table]]을 검토한다.

## 레코드 검색

전화번호부처럼 이름(key)으로 찾아 번호(값)를 돌려주는 검색은 데이터를 묶는 방식이 정확성을 좌우한다.

- **병렬 배열**: `names[i]`와 `numbers[i]`를 따로 두고 같은 index로 짝을 맞춘다. 짝이 맞는다는 불변식을 삽입, 삭제, 정렬하는 모든 코드가 지켜야 한다. 이진 검색을 하려고 `names`만 정렬하면 짝이 어긋나 다른 사람의 번호를 돌려준다.
- **구조체 배열**: 이름과 번호를 구조체 하나로 묶어 배열에 담는다. 레코드가 한 단위로 움직이므로 정렬과 삭제가 짝을 깨지 않고, 필드를 더해도 검색 코드는 그대로다.

```c
#include <stdlib.h>
#include <string.h>

typedef struct {
    const char *name;
    const char *number;
} person;

static int by_name(const void *a, const void *b) {
    const person *x = a, *y = b;
    return strcmp(x->name, y->name);
}

// 정렬 여부와 무관한 선형 검색
const char *find_linear(const person people[], size_t n, const char *name) {
    for (size_t i = 0; i < n; i++) {
        if (strcmp(people[i].name, name) == 0) {
            return people[i].number;
        }
    }
    return NULL;  // 끝까지 본 뒤에만 없음을 확정한다
}

// by_name으로 정렬해 둔 배열에서만 쓰는 이진 검색
const char *find_sorted(const person people[], size_t n, const char *name) {
    person key = { .name = name };
    const person *hit = bsearch(&key, people, n, sizeof people[0], by_name);
    return hit ? hit->number : NULL;
}
```

- C 문자열은 `strcmp`로 내용을 비교한다. 같으면 0이고, 다르면 결과의 부호가 처음 다른 문자 쌍을 `unsigned char`로 본 차이의 부호와 같다. 정해진 것은 부호뿐이라 -1이나 1이라고 가정하지 않는다. `==`는 두 pointer가 같은 주소인지만 본다.
- `bsearch`를 쓰려면 배열이 같은 비교 함수 기준으로 key보다 작은 것, 같은 것, 큰 것 순서로 나뉘어 있어야 하고(정렬돼 있으면 충족), 아니면 동작이 정의되지 않는다. 그래서 `qsort(people, n, sizeof people[0], by_name)`처럼 검색과 같은 함수로 정렬한다. 같은 key가 여럿이면 어느 원소를 돌려줄지 정해져 있지 않다.
- 한 필드만 훑는 검색이 대부분이고 성능이 중요하면 필드별 배열이 캐시에 유리할 수 있다. 이때도 짝을 맞추는 책임은 배열들을 바꾸는 코드에 남는다.

## 흔한 오류

- 선형 검색 loop 안에서 첫 원소가 key와 다르다고 바로 없음을 반환한다. 없음은 loop가 끝난 뒤에만 확정된다.
- 정렬되지 않았거나 다른 기준으로 정렬된 배열에 이진 검색을 쓴다. 대소문자를 무시하거나 locale 순서(`strcoll`)로 정렬해 두고 `strcmp`로 찾으면 정렬 기준과 비교 기준이 달라 있는 값을 놓칠 수 있다.
- `mid = (lo + hi) / 2`에서 `lo + hi`가 type 범위를 넘을 수 있다. C에서 부호 있는 정수 overflow는 정의되지 않은 동작이므로 `lo + (hi - lo) / 2`로 쓴다.
- index를 `size_t` 같은 부호 없는 type으로 두고 닫힌 구간의 `hi = mid - 1`을 쓰면, `mid`가 0일 때 `hi`가 그 type의 최댓값으로 돌아가 범위 밖을 읽는다. 반열린 구간 `[lo, hi)`에서 `hi = mid`로 줄이면 음수가 필요 없다.

## 면접 체크포인트

- 이진 검색의 두 전제(정렬, O(1) random access)와 연결 리스트에 쓰지 않는 이유
- 정렬되지 않은 데이터 검색의 하한 Ω(n)과 비교 기반 검색의 하한 Ω(log n)을 근거와 함께 설명할 수 있는가
- 몇 번 찾을 때부터 정렬해 두는 편이 이득인지, 데이터가 자주 바뀌면 무엇을 고르는지
- 병렬 배열 대신 구조체 배열을 쓰는 이유와 정렬과 검색에 같은 비교 기준을 써야 하는 이유

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 검색 알고리즘](https://www.boostcourse.org/cs112/lecture/119019)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 선형 검색](https://www.boostcourse.org/cs112/lecture/119021)
- [Princeton Algorithms, Elementary Symbol Tables](https://algs4.cs.princeton.edu/31elementary/)
- [cppreference, bsearch](https://en.cppreference.com/w/c/algorithm/bsearch)
- [cppreference, qsort](https://en.cppreference.com/w/c/algorithm/qsort)
- [cppreference, strcmp](https://en.cppreference.com/w/c/string/byte/strcmp)
- [cppreference, Arithmetic operators](https://en.cppreference.com/w/c/language/operator_arithmetic)
- [POSIX.1-2024, grep](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/grep.html)

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Algorithm-Sorting|정렬]]
- [[Binary-Search-and-LIS|이분탐색, 매개변수 탐색과 LIS]]
- [[Linear-Data-Structures|배열, 연결 리스트, Stack, Queue와 Deque]]
- [[Hash-Table|해시 테이블]]

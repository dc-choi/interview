---
tags: [cs, cpp, memory, pointer, stl, container, algorithm]
status: done
category: "CS - C++"
aliases: ["C++ Language Memory and STL", "C++ 메모리와 STL"]
---

# C++ 값과 메모리, Container와 Algorithm

C++에서는 자료형이 값의 범위와 연산 규칙을 결정하고, 객체 수명이 pointer와 reference의 유효 범위를 결정한다. 표준 라이브러리는 이 계약을 iterator와 complexity requirement로 표현한다.

## 정수와 연산

- 필요한 범위를 먼저 계산한 뒤 자료형을 고른다. 원소 하나가 `int` 범위여도 합, 곱과 경우의 수는 `long long`이 필요할 수 있다.
- signed integer overflow는 undefined behavior다. unsigned 연산은 `2^N`을 법으로 한 연산이지만 이를 음수 대용으로 사용하지 않는다.
- 나눗셈이나 나머지 연산 전에 0 여부를 확인하고, 큰 곱의 나머지는 중간 곱 자체가 넘치지 않는지 확인한다.
- bit mask는 `std::uint64_t{1} << k`처럼 unsigned operand를 쓰고 `k`가 type의 bit 수보다 작은지 보장한다. signed 음수와 범위를 벗어난 shift에 기대지 않는다.
- `~x`는 고정된 자릿수의 모든 bit를 뒤집는다. 필요한 bit만 보려면 mask를 다시 적용한다.

## Object, address와 lifetime

pointer는 객체나 함수의 주소를 표현하고, dereference는 그 주소가 가리키는 객체에 접근한다. 주소가 존재한다는 사실만으로 접근이 안전해지는 것은 아니다.

- null pointer, 수명이 끝난 객체를 가리키는 dangling pointer와 범위를 벗어난 pointer를 dereference하면 안 된다.
- local automatic object는 scope를 빠져나가면 수명이 끝난다. 그 주소나 reference를 반환하지 않는다.
- dynamic storage는 소유권을 명확히 한다. 일반 애플리케이션에서는 raw `new`/`delete`보다 RAII container와 smart pointer를 우선한다.
- pointer의 크기는 구현과 ABI가 정한다. 운영체제 이름이나 CPU의 일반적 bit 수만으로 단정하지 말고 `sizeof(T*)`로 확인한다.

### Array-to-pointer conversion

array expression은 많은 문맥에서 첫 원소를 가리키는 pointer로 변환된다. 그래서 built-in subscript `a[i]`는 pointer arithmetic과 dereference로 해석할 수 있다.

그러나 변환은 보편 규칙이 아니다. `sizeof a`, unary `&a`, `decltype(a)`와 array reference binding 같은 문맥에서는 array type과 전체 크기가 보존된다. 함수 parameter의 `T a[]`는 선언 단계에서 `T*`로 조정되므로 길이가 전달되지 않는다. 길이도 함께 넘기거나 `std::span`, container 또는 array reference를 사용한다.

## 문자열과 Container 선택

| 요구 | 우선 후보 | 핵심 주의점 |
|---|---|---|
| 연속 저장, index 접근 | `std::vector` | 재할당 뒤 iterator/reference 무효화 |
| compile-time 고정 길이 | `std::array` | 길이가 type의 일부 |
| 문자열 조립과 검색 | `std::string` | `substr` 경계와 반복 `erase` 비용 |
| 정렬된 key와 range | `std::map`, `std::set` | 보통 O(log n) |
| 평균 O(1) key lookup | `std::unordered_map`, `std::unordered_set` | hash, collision, rehash |
| 양 끝 삽입/삭제 | `std::deque` | 임의 위치 삽입은 선형 |
| LIFO, FIFO | `std::stack`, `std::queue` | adapter라 iterator를 직접 노출하지 않음 |
| 최댓값/최솟값 반복 추출 | `std::priority_queue` | 기본은 max heap |

입력 크기가 `int` 범위를 넘지 않더라도 container의 길이와 index 차이는 `size_type` 또는 적절한 signed type을 의식한다. signed/unsigned 혼합 비교와 `size() - 1` underflow를 피한다.

## 표준 Algorithm의 정확한 계약

### 순열

`std::next_permutation(first, last)`는 현재 배열을 사전식으로 바로 다음 순열로 바꾼다. 호출 전에 정렬해야만 동작하는 함수는 아니다. 다만 모든 순열을 중복 없이 사전식 첫 상태부터 열거하려면 먼저 정렬한 뒤 반환값이 `false`가 될 때까지 반복한다.

### 중복 압축

`std::unique`는 서로 인접한 동등 원소를 앞쪽으로 모으고 새 논리적 끝 iterator를 반환한다. container 크기를 줄이지 않으므로 erase와 조합한다.

```cpp
std::sort(v.begin(), v.end());
v.erase(std::unique(v.begin(), v.end()), v.end());
```

정렬은 전체 중복을 인접하게 만들기 위한 선택이다. 기존 순서를 보존해야 하면 hash set으로 이미 본 값을 추적하는 방식처럼 다른 전략을 쓴다.

### 정렬과 탐색

- `std::sort`의 comparator는 strict weak ordering을 만족해야 한다. 같은 원소에 `true`를 반환하는 `<=` 비교를 쓰지 않는다.
- `std::lower_bound`는 partition된 range에서 조건을 처음 만족하지 않는 위치를 찾는다. 일반적으로 정렬된 range에 쓰며 random-access iterator에서는 O(log n)회 비교한다.
- iterator가 가리키는 range는 `[first, last)`다. `last` 자체를 dereference하지 않는다.

## 선택 체크리스트

1. 값과 중간 계산이 자료형 범위 안에 있는가?
2. pointer/reference가 가리키는 객체가 아직 살아 있는가?
3. container mutation이 iterator를 무효화하지 않는가?
4. algorithm의 precondition과 comparator 계약을 지키는가?
5. API 호출 하나의 복잡도까지 전체 분석에 포함했는가?

## 출처

- 인프런, 큰돌 강사, [(참고) C++이 코딩테스트언어로 좋은 이유](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101769), [(필수개념) split() 함수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133246), [(필수개념) 메모리와 포인터(pointer) #1 메모리와 주소](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=141585), [(필수개념) 메모리와 포인터(pointer) #2 포인터](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=148435), [(필수개념) 메모리와 포인터(pointer) #3 역참조연산자](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=148548)
- 인프런, 큰돌 강사, [(필수개념) 메모리와 포인터(pointer) #4 array to pointer decay](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=148549), [(필수개념) 중복된 요소를 제거하는 방법과 unique()](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146844), [5-B : erase()를 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100397), [6-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100951)

- [C++ working draft, array-to-pointer conversion](https://eel.is/c++draft/conv.array)
- [C++ working draft, sizeof](https://eel.is/c++draft/expr.sizeof)
- [C++ working draft, shift operators](https://eel.is/c++draft/expr.shift)
- [C++ working draft, `next_permutation`](https://eel.is/c++draft/alg.permutation.generators)
- [C++ working draft, `unique`](https://eel.is/c++draft/alg.unique)
- [cppreference, containers library](https://en.cppreference.com/w/cpp/container)

## 관련 문서

- [[C++(Cpp)|C++ 인덱스]]
- [[Cpp-Coding-Test-Workflow|C++ 코딩 테스트 워크플로]]
- [[Linear-Data-Structures|선형 자료구조]]
- [[Algorithm-Sorting|정렬]]
- [[Bitmask-DP-and-TSP|비트마스크]]

---
tags: [cs, cpp, memory, pointer, stl, container, algorithm]
status: done
category: "CS - C++"
aliases: ["C++ Language Memory and STL", "C++ 메모리와 STL"]
verified_at: 2026-10-01
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

### 함수 인자: 값 복사와 참조

함수에 인자를 값으로 넘기면 복사본이 만들어진다. `int`와 구조체는 물론 `std::vector`, `std::string` 같은 container도 값으로 넘기면 원소 전체가 복사되므로 함수 안에서 바꿔도 원본은 그대로다. 배열만 예외처럼 보이는데, 위 array-to-pointer 변환 때문에 첫 원소의 주소가 넘어가 원본이 바뀐다.

복사는 비용이기도 하다. 크기 `n`인 vector 두 개를 값으로 받아 원소 하나만 비교하는 함수는 호출마다 복사 때문에 O(n)이다. 원본을 바꿔야 하면 `std::vector<int>& v`, 읽기만 하면 `const std::vector<int>& v`로 받아 복사 없이 O(1)로 만든다. 참조는 pointer와 비슷하게 원본을 가리키지만 null이 될 수 없고 다른 객체로 다시 묶이지 않아, 두 값을 바꾸는 `swap(int& a, int& b)`처럼 원본 수정 의도를 간단히 표현한다.

### Array-to-pointer conversion

array expression은 많은 문맥에서 첫 원소를 가리키는 pointer로 변환된다. 그래서 built-in subscript `a[i]`는 pointer arithmetic과 dereference로 해석할 수 있다.

그러나 변환은 보편 규칙이 아니다. `sizeof a`, unary `&a`, `decltype(a)`와 array reference binding 같은 문맥에서는 array type과 전체 크기가 보존된다. 함수 parameter의 `T a[]`는 선언 단계에서 `T*`로 조정되므로 길이가 전달되지 않는다. 길이도 함께 넘기거나 `std::span`, container 또는 array reference를 사용한다.

## 문자열과 Container 선택

| 요구 | 우선 후보 | 핵심 주의점 |
|---|---|---|
| 연속 저장, index 접근 | `std::vector` | 재할당 뒤 iterator/reference 무효화 |
| compile-time 고정 길이 | `std::array` | 길이가 type의 일부 |
| 문자열 조립과 검색 | `std::string` | `substr` 경계와 반복 `erase` 비용, split은 [[Cpp-Coding-Test-Workflow-IO-and-Strings#문자열 가공\|직접 구현]] |
| 정렬된 key와 range | `std::map`, `std::set` | 보통 O(log n) |
| 평균 O(1) key lookup | `std::unordered_map`, `std::unordered_set` | hash, collision, rehash |
| 양 끝 삽입/삭제 | `std::deque` | 임의 위치 삽입은 선형 |
| LIFO, FIFO | `std::stack`, `std::queue` | adapter라 iterator를 직접 노출하지 않음 |
| 최댓값/최솟값 반복 추출 | `std::priority_queue` | 기본은 max heap |

`std::vector`는 `push_back`, `pop_back`이 amortized O(1)이고 `insert`, `erase`는 위치 뒤 원소를 옮겨 O(n)이다. 앞쪽 삽입과 삭제 전용 멤버(`push_front`)는 없고 `insert(v.begin(), x)`로 하면 O(n)이다. 앞뒤를 모두 자주 바꾸면 `std::deque`를 쓴다. `v2 = v1` 대입은 원소 전체를 복사하는 깊은 복사라 이후 `v2`를 바꿔도 `v1`은 그대로다.

- range-based for에서 `for (int e : v)`는 원소의 복사본을, `for (int& e : v)`는 원본을 받는다. 원소를 바꾸려면 참조로 받고, 큰 원소를 읽기만 하면 `const auto&`로 받는다.
- 배열 전체 초기화는 `std::fill`이나 loop를 쓴다. `memset`은 바이트 단위로 채우므로 `int` 배열에서는 0과 -1(모든 바이트가 같은 값)만 의도대로 들어가고, 함수 인자로 받은 배열 pointer에 `sizeof`를 쓰면 pointer 크기만큼만 채운다.
- 전역과 정적 배열은 0으로 초기화되지만 함수 안의 지역 배열은 초기화하지 않으면 값이 정해지지 않는다. 그 값을 읽으면 C++23까지는 undefined behavior이고, C++26부터는 구현이 정한 값을 읽는 erroneous behavior가 되지만 어느 쪽도 0을 보장하지 않는다. `int freq[26] = {};`처럼 명시한다.

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

## 연산과 비교의 함정

C++의 주소는 byte 단위 저장 위치를 식별한다. `&x`는 객체 주소를 얻고 `*p`는 그 주소의 객체에 접근한다. `int`가 4 byte인지는 구현에 달려 있다. built-in `T a[R][C]`는 행별로 연속 저장되므로 행을 바깥 loop, 열을 안쪽 loop로 순회하면 이웃 원소를 함께 읽는다. `vector<vector<T>>`는 행마다 별도 저장소지만 행 내부의 연속성은 같다.

곱셈 결과의 type은 대입 대상이 아니라 피연산자 변환으로 정해진다. `long long result = a * b`에서 둘 다 `int`면 먼저 `int`로 곱한다. `1LL * a * b`나 `static_cast<long long>(a) * b`처럼 곱하기 전에 넓힌다. `a * b * 1LL`은 앞의 곱이 이미 넘친 뒤라 늦다. signed/unsigned 혼합까지 단순한 type 크기 순서로 설명하지 않고 usual arithmetic conversions를 확인한다.

shift 횟수는 0 이상이고 승격된 왼쪽 피연산자 폭보다 작아야 한다. 현재 working draft(C++20 이후 규칙)의 signed 오른쪽 shift는 음의 무한대 쪽으로 버림한 나눗셈이라 `-7 >> 1`은 -4지만 `-7 / 2`는 -3이다. unsigned 오른쪽 shift만 0으로 채운다. 양의 값에서도 왼쪽 shift를 수학적 곱셈으로 사용할 때는 type 폭과 결과 범위를 먼저 확인한다.

`std::map::operator[]`는 없는 key를 조회해도 원소를 삽입한다. `int` 값은 0으로 초기화되므로 첫 등장 위치에 0을 미등장 sentinel로 쓰려면 실제 위치는 `i + 1`로 저장한다. 존재 확인은 `find`나 `contains`(C++20)를 사용한다. 빈도 내림차순, 첫 등장 오름차순처럼 동률이 중요하면 comparator에 두 기준을 명시한다. `sort` 자체는 같은 key의 입력 순서를 보장하지 않는다.

`priority_queue`의 `Compare(a,b)`가 true면 a가 b보다 뒤에 추출된다. 시간과 번호 모두 오름차순이면 `pair`와 `greater`의 사전식 비교로 표현할 수 있다. 방향이 섞이면 시간과 동률 번호를 각각 비교하고 strict weak ordering을 지킨다.

## 출처

- 인프런 보충 강의: [(필수개념) 조합(combination)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123557), [2주차 개념 #4-1. 인접행렬(adjacency matrix)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134742), [2-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100331), [비트마스킹 개념 #2-3. 비트연산자 기초 (<<, >>) SHIFT](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145028), [6-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100955), [8-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101073)

- [C++ working draft, priority_queue](https://eel.is/c++draft/priority.queue)

- [C++ working draft, usual arithmetic conversions](https://eel.is/c++draft/expr.arith.conv)

- [C++ working draft, map element access](https://eel.is/c++draft/map.access)

- 인프런, 큰돌 강사, [(참고) C++이 코딩테스트언어로 좋은 이유](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101769), [(필수개념) split() 함수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133246), [(필수개념) 메모리와 포인터(pointer) #1 메모리와 주소](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=141585), [(필수개념) 메모리와 포인터(pointer) #2 포인터](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=148435), [(필수개념) 메모리와 포인터(pointer) #3 역참조연산자](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=148548)
- 인프런, 큰돌 강사, [(필수개념) 메모리와 포인터(pointer) #4 array to pointer decay](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=148549), [(필수개념) 중복된 요소를 제거하는 방법과 unique()](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146844), [5-B : erase()를 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100397), [6-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100951)

- [C++ working draft, array-to-pointer conversion](https://eel.is/c++draft/conv.array)
- [C++ working draft, sizeof](https://eel.is/c++draft/expr.sizeof)
- [C++ working draft, shift operators](https://eel.is/c++draft/expr.shift)
- [C++ working draft, `next_permutation`](https://eel.is/c++draft/alg.permutation.generators)
- [C++ working draft, `unique`](https://eel.is/c++draft/alg.unique)
- [C++ working draft, indeterminate and erroneous values](https://eel.is/c++draft/basic.indet)
- [cppreference, default-initialization](https://en.cppreference.com/w/cpp/language/default_initialization)
- [바킹독의 실전 알고리즘 0x02강, 기초 코드 작성 요령 II — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=6lhVHP8bkPA)
- [바킹독의 실전 알고리즘 0x03강, 배열 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=mBeyFsHqzHg)
- [cppreference, containers library](https://en.cppreference.com/w/cpp/container)

## 관련 문서

- [[C++(Cpp)|C++ 인덱스]]
- [[Cpp-Coding-Test-Workflow|C++ 코딩 테스트 워크플로]]
- [[Cpp-Coding-Test-Workflow-IO-and-Strings|C++ 입출력과 문자열]]
- [[Linear-Data-Structures|선형 자료구조]]
- [[Algorithm-Sorting|정렬]]
- [[Bitmask-DP-and-TSP|비트마스크]]

---
tags: [cs, data-structure, array, dynamic-array]
status: done
category: "CS - 자료구조"
aliases: ["Linear Data Structures Array", "Array", "Dynamic Array", "Resizable Array", "배열", "동적 배열"]
---

# 배열과 동적 배열

배열의 주소 계산과 연산 비용, 값을 index로 쓰는 배열, dynamic array의 확장 비용을 다룬다. ADT와 구현의 구분은 [[Linear-Data-Structures-ADT-and-Selection|추상 자료형과 선형 자료구조 선택]]에 있다.

## Array와 dynamic array

array는 index로 원소 위치를 계산해 random access가 O(1)이다. contiguous representation은 cache locality가 좋지만 중간 삽입/삭제는 뒤 원소를 shift해 O(n)이다.

C 배열은 같은 타입 원소를 연속 할당하므로 i번째 원소의 주소가 `시작 주소 + i × 원소 크기`다. `a[i]`는 정의상 `*(a + i)`라 index는 첫 원소로부터의 offset이고, 첫 원소가 offset 0이라 index가 0부터 시작한다. 시작 주소가 1000인 4바이트 int 5개 배열은 원소 주소가 1000, 1004, 1008, 1012, 1016이고 전체 20바이트다. 원소가 100만 개든 1억 개든 같은 계산 한 번이라 index 접근이 O(1)이고, hash table도 이 성질 위에 만든다.

- 메모리 주소는 1차원이라 C의 `int a[2][3]`은 행을 이어 붙인 row-major 배치다. Java의 다차원 배열은 하위 배열 참조를 원소로 갖는 배열의 배열이라 행마다 별도 객체이고 행 길이도 다를 수 있다.
- 객체를 담는 배열은 대개 객체가 아니라 참조를 원소로 저장한다. Java 참조 타입 배열의 원소는 참조(또는 `null`)이고, CPython `list`는 객체 참조의 연속 배열이다. 참조 칸이 붙어 있어도 객체는 heap 곳곳에 있을 수 있어 원시값 배열만큼의 cache locality는 기대하지 않는다.
- 연관 배열(associative array)은 배열이라는 이름과 달리 key-value 쌍을 저장하는 map ADT다. 같은 key의 쌍은 최대 하나이고 hash table이나 균형 탐색 트리로 구현한다([[Hash-Table]]).

배열 연산의 비용은 끝과 중간이 다르다. index로 읽고 쓰기, 끝에 추가, 끝에서 제거는 O(1)이고, 임의 위치 삽입과 삭제는 뒤 원소를 옮겨야 해 평균 n/2개를 움직이는 O(n)이다. 삭제한 칸을 비워 두면 원소가 연속하지 않게 되어 k번째 원소를 O(1)에 찾는 성질이 깨지므로 반드시 당긴다. 추가 공간 없이 구현하려면 옮기는 방향을 지킨다. 삽입은 끝에서부터 한 칸씩 오른쪽으로 밀어야 덮어쓰지 않고, 삭제는 지운 위치 다음부터 왼쪽으로 당긴다. 구현 오류는 대부분 loop 경계(`len - 1`부터인지 `len`부터인지, `idx`까지인지 `idx + 1`까지인지)에서 나오고, `i >= idx`처럼 한 칸 더 가면 `idx = 0`일 때 `a[-1]`을 읽는다.

### 값을 index로 쓰는 배열

값의 범위가 작으면 값 자체를 index로 삼는 배열이 hash table 역할을 한다.

- **빈도 세기**: 소문자 알파벳 개수는 `freq[c - 'a']++`로 문자열을 한 번만 훑어 O(n)에 센다. 알파벳마다 문자열 전체를 다시 훑으면 O(26n)이다.
- **등장 여부 확인**: 0에서 100 사이 정수 배열에서 합이 100인 두 수가 있는지는 모든 쌍을 보면 O(n²)이다. 앞에서부터 읽으며 `seen[100 - x]`가 켜져 있는지 확인한 뒤 `seen[x]`를 켜면 각 확인이 O(1)이라 전체 O(n)이다. 값의 범위가 크거나 희소하면 배열 대신 hash set을 쓴다.

고정 array는 크기를 미리 정하고, ArrayList, C++ vector, CPython list 같은 dynamic array(resizable array)는 capacity가 부족할 때 더 큰 storage를 할당해 복사한다. append 한 번은 resize 때문에 O(n)일 수 있지만 여러 append에 나누어 계산한 amortized cost는 O(1)이다. C에서 `realloc`으로 키울 때의 실패 처리와 옛 pointer 무효화는 [[Data-Structures-in-C#배열 키우기와 realloc|C로 구현하는 자료구조]]에 있다.

확장 폭이 amortized 비용을 가른다. 꽉 찰 때마다 상수 k칸씩 늘리면 k번 삽입마다 전체 복사가 일어나 삽입당 평균 O(n)이다. k를 크게 잡으면 상수는 줄지만 빈 공간 낭비가 커진다. 크기를 두 배(일정 배수)로 늘리면 n번 삽입하는 동안 복사되는 원소 수가 1 + 2 + 4 + ... < 2n이라 삽입당 amortized O(1)이고, 낭비도 현재 크기의 일정 비율 이하로 유지된다. 구현은 `len`과 할당 크기 `capacity`를 따로 두고, `len == capacity`일 때 두 배 크기의 새 배열에 복사한 뒤 교체한다. amortized O(1)은 모든 삽입이 빠르다는 뜻이 아니라, 확장이 걸린 한 번은 O(n)이지만 여러 번의 합을 나누면 상수라는 뜻이다. 표준 `vector`의 성장 배수(2 또는 1.5 등)는 구현마다 다르다.

JavaScript `Array`는 언어 수준의 dynamic collection이고 engine이 elements kind와 sparsity에 따라 표현을 바꿀 수 있다. 일반 array가 항상 한 형태의 contiguous memory라는 전제로 성능을 단정하지 않는다. [[V8-Array-Internals]]

## 같은 O(n) 순회도 실행 시간은 다르다

배열과 연결 리스트를 한 번씩 순회하면 둘 다 O(n)이지만, 이 표기는 메모리 접근의 상수 비용을 설명하지 않는다. 연속 배열은 같은 cache line에 들어온 이웃 원소를 재사용하기 쉽다. 연결 리스트는 node가 흩어져 있으면 지역성이 나쁘고 다음 주소를 현재 node의 pointer에서 읽어야 한다. Linux 커널 문서도 연결 리스트의 낮은 데이터 지역성을 성능 선택의 주의점으로 든다.

Intel의 캐시 설명에서 사용하는 64바이트 cache line과 4바이트 정수를 가정하면 한 줄에 정수 16개가 들어간다. 배열 시작이 cache line 경계에 맞고 원소가 연속일 때의 예시다. 임의 위치의 첫 원소를 읽으면 다음 15개가 언제나 함께 들어온다는 보장은 아니다. cache line 크기와 접근 지연을 모든 CPU의 고정값으로 외우지 않는다.

성능 비교에서는 원소 수와 배치, 객체 참조의 역참조, 캐시 상태와 순회 외 연산을 함께 맞춘다. 이 문서는 벤치마크를 실행하지 않았으므로 특정 배수의 우위를 제시하지 않는다. 중간 편집이 잦거나 node 위치를 이미 아는 경우의 선택은 [[Linear-Data-Structures-Linked-List|연결 리스트]]의 비용과 함께 판단한다.

## 출처

- 인프런, 감자 강사, [배열](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115670)
- [바킹독의 실전 알고리즘 0x03강, 배열 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=mBeyFsHqzHg)
- [바킹독의 실전 알고리즘 부록 B, 동적 배열 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=SOs_VoefLq8)
- [Princeton Algorithms, Bags, Queues, and Stacks](https://algs4.cs.princeton.edu/13stacks/)
- [ECMAScript Language Specification, Array Exotic Objects](https://tc39.es/ecma262/#sec-array-exotic-objects)
- [BJ.21 배열, 동적배열과 연관배열 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=Hpg6zS0Nq28)
- [배열이 0번째부터 시작하는 이유 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=_5McFoJ3VsQ)
- [cppreference, C array declaration](https://en.cppreference.com/w/c/language/array)
- [cppreference, C member access operators](https://en.cppreference.com/w/c/language/operator_member_access)
- [Python 3.14 FAQ, How are lists implemented in CPython?](https://docs.python.org/3.14/faq/design.html#how-are-lists-implemented-in-cpython)
- [The Java Tutorials, Arrays](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html)
- [Linux Kernel Documentation, Linked Lists in Linux](https://docs.kernel.org/core-api/list.html) — 데이터 지역성과 자료구조 선택
- [Loop Optimizations Where Blocks are Required — Intel](https://www.intel.com/content/www/us/en/developer/articles/technical/loop-optimizations-where-blocks-are-required.html) — 캐시 계층과 공간 지역성 절 대조

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조 목차]]
- [[Linear-Data-Structures-Linked-List|연결 리스트]]
- [[Data-Structures-in-C|C로 구현하는 자료구조]]
- [[Hash-Table|Hash Table]]
- [[V8-Array-Internals|V8 배열 내부 표현]]
- [[Algorithm-Complexity|시간복잡도와 amortized 분석]]

---
tags: [cs, cpp, coding-test, debugging, implementation]
status: done
category: "CS - C++"
aliases: ["C++ Coding Test Workflow", "C++ 코딩 테스트 워크플로"]
verified_at: 2026-09-30
---

# C++ 코딩 테스트 워크플로

코딩 테스트의 안정성은 알고리즘 선택과 구현 규칙을 분리하지 않을 때 높아진다. 큰돌 강사의 강의에서 반복되는 핵심도 제약을 계산하고, 작은 반례를 만들고, 상태와 경계를 일관되게 표현하는 것이다.

## 문제를 코드로 옮기는 순서

1. 입력, 출력과 변하지 않아야 할 조건을 한 문장씩 적는다.
2. 최대 입력에서 단순 풀이의 연산량과 memory를 계산한다.
3. 정점, 상태, 구간 또는 결정 문제로 모델링한다.
4. 알고리즘의 invariant와 종료 조건을 먼저 정한다.
5. index, 자료형, 초기값과 예외 입력을 확정한 뒤 구현한다.
6. sample을 따라가는 데서 끝내지 않고 최소/최대/빈 상태/중복/불가능 입력을 시험한다.

문제 tag에 의존하면 무엇을 적용할지 이미 아는 상태가 된다. 실전과 같은 학습을 원하면 먼저 제약과 구조만으로 후보를 좁히고, 풀이 뒤에 tag를 확인한다.

## 입력과 문자열

token과 줄 입력, 입출력 속도 설정, 입력 끝까지 읽기, 숫자 판별, 소수점 출력, split과 부분 문자열, 문자 빈도와 문자 코드 연산은 [[Cpp-Coding-Test-Workflow-IO-and-Strings|C++ 입출력과 문자열]]로 분리했다.

## Index와 구간 규칙

한 문제 안에서는 다음 약속을 섞지 않는다.

- 배열 index는 0-based 또는 1-based 중 하나를 정한다.
- 구간은 가능하면 `[l, r)`로 표현한다. 길이는 `r - l`이고 빈 구간도 자연스럽다.
- grid는 `(row, column)` 또는 `(y, x)` 중 하나로 통일하고 `dy[i]`, `dx[i]`를 같은 순서로 사용한다.
- 시간은 초처럼 한 단위로 정규화한 뒤 차이를 계산한다.
- 원형 배열은 두 번 이어 붙이거나 modular index를 쓰되 전체 원을 중복 계산하지 않는다.

## 상태와 초기화

- test case마다 container, `visited`, accumulator와 flag를 초기화한다.
- DFS/backtracking에서 공유 상태를 바꿨다면 같은 stack frame에서 반드시 복구한다.
- 전역 변수는 zero initialization이 편리하지만 호출 간 상태가 암묵적으로 공유된다. 재귀 상태는 가능한 parameter/local state로 드러낸다([[Exhaustive-Search-and-Backtracking#대표 실패 원인|전역 좌표가 원복을 어긋나게 하는 예]]).
- 최댓값은 실제 가능한 최솟값보다 작게, 최솟값은 가능한 최댓값보다 크게 초기화한다. 입력이 모두 음수인 경우 `0` 초기화는 틀릴 수 있다.
- `INF`에 값을 더할 때 overflow하지 않도록 도달 가능성을 먼저 검사하고 충분한 범위의 type을 쓴다.

## 계산량과 구현 비용

복잡도는 loop 모양만 보지 않는다. loop 안의 `sort`, `erase`, 문자열 복사와 container mutation 비용까지 합친다. 대략적인 연산 횟수는 가능성을 판단하는 출발점일 뿐 언어, cache, allocation과 시간 제한에 따라 달라지므로 고정된 숫자를 보편 법칙처럼 외우지 않는다.

- 같은 크기 subproblem을 반복하면 memoization/DP 후보인지 본다.
- 모든 조합을 보더라도 제약이 작으면 완전탐색이 가장 명료할 수 있다.
- 값의 범위가 매우 크고 실제 event가 적으면 전체 좌표 배열 대신 정렬, map 또는 coordinate compression을 검토한다.
- 반복적인 `string::erase`나 vector 중간 삭제는 선형 이동을 만들 수 있다. 결과 buffer, stack 또는 양 끝 container로 모델을 바꿀 수 있는지 본다.

## 정수와 실수 계산

- 거듭제곱을 직접 반복하지 않고 exponent를 절반씩 줄이는 binary exponentiation을 쓰면 O(log exponent)이다([[Algorithm-Recursion#분할 정복 거듭제곱|분할 정복 거듭제곱]]). modular multiplication의 중간 곱도 type 범위 안인지 확인한다. 덧셈과 곱셈은 중간마다 나머지를 취해도 되므로 직접 만들 수 없는 큰 수도 나머지만 들고 판정한다([[Number-Theory-Basics#나머지 연산의 성질|나머지 연산의 성질]]).
- n! 끝의 0 개수처럼 결과 전체가 필요 없는 문제는 소인수 2와 5의 개수 등 답을 결정하는 요인만 센다([[Number-Theory-Basics#팩토리얼의 소인수 개수|팩토리얼의 소인수 개수]]).
- 2부터 n까지의 소수를 반복해서 쓸 때는 Eratosthenes sieve로 합성수를 지운다. 각 소수 p의 배수는 `p * p`부터 처리하며 그 곱의 overflow를 확인한다. 원리와 소인수분해, 최대공약수는 [[Number-Theory-Basics|정수론 기초]].
- 매우 긴 정수는 문자열로 비교하거나 자리별 carry 연산을 구현할 수 있다.
- 금액처럼 decimal 단위가 고정되면 floating-point 값을 반복 비교하기보다 입력을 정수 단위로 변환한다. 변환 시 decimal parsing과 rounding 규칙을 명시한다. 실수로 읽었다면 `static_cast<int>(p * 100 + 0.5)`처럼 반올림해 바꾼다. `4.35 * 100`은 double로 434.99999999999994라 그냥 자르면 434가 된다.
- 양수의 올림 나눗셈은 `(a + b - 1) / b`처럼 정수로 계산한다. `ceil(a / b)`는 정수 나눗셈이 먼저 내림해 틀리고, `ceil((double)a / b)`는 `long long` 범위의 큰 값에서 오차가 날 수 있다. 연산 중 1/2이 생기면 가중치를 처음부터 2배로 저장하는 것처럼 정수로 유지할 배율을 찾는다([[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형]]).
- `int`(보통 32비트)는 약 21억(2³¹ - 1), `long long`은 약 9.2 × 10¹⁸까지다. 피보나치 80번째 항처럼 21억을 넘을 수 있으면 처음부터 `long long`을 쓴다. 대입할 변수만 `long long`이어도 `a * 10`의 피연산자가 모두 `int`면 곱셈은 `int`로 계산돼 넘친다. `a`를 `long long`으로 두거나 `10LL`, `(long long)a * 10`처럼 계산 전에 넓힌다.
- 부호 있는 정수 overflow는 C++에서 undefined behavior라 2의 보수로 감겨 음수가 된다고 기대하면 안 된다. 실제로는 흔히 감긴 값이 보이지만, 최적화가 overflow가 없다고 가정해 loop 조건을 바꿀 수 있다. `char s`로 127을 넘겨 세는 loop는 연산 자체는 `int`로 승격돼 계산되지만 결과를 다시 `char`에 담을 때 -128로 감겨(C++20부터 정의된 동작), 종료 조건이 영원히 참이 되는 무한 loop가 된다. 카운터 타입은 도달할 최댓값보다 넓게 잡는다.
- 실수는 IEEE 754 이진 부동소수점이라 `0.1`처럼 이진수로 무한소수인 값은 오차를 안고 저장된다. `0.1 + 0.1 + 0.1 == 0.3`은 거짓이다. 비교는 `std::abs(a - b) < 1e-9`처럼 허용 오차로 하고, 유효 자릿수가 약 7자리인 `float` 대신 약 15자리인 `double`을 쓴다.
- `double`은 2⁵³(약 9 × 10¹⁵)을 넘는 정수를 모두 정확히 표현하지 못해 `10¹⁸`과 `10¹⁸ + 1`이 같은 값이 된다. `long long` 범위의 정수를 `double`로 계산하지 않는다. `int` 범위는 정확하다.
- 문제가 절대 또는 상대 오차 허용을 명시하지 않았다면 실수 없이 정수 연산만으로 푸는 문제일 가능성이 높다.
- 정해진 자릿수로 반올림해 출력하는 값이 정확히는 경계(1.0005를 셋째 자리까지)인데 이진수로 조금 작게 저장되면 `printf("%.3f")`는 1.000을 출력한다. 출력 직전에 `1e-9` 같은 아주 작은 값을 더하는 보정은 이 경우를 막는 임시방편이라, 값의 크기와 부호, 문제의 허용 오차를 확인하고 쓴다. `-1`로 채운 `double` memo의 미계산 판정은 [[Algorithm-DP-Patterns#확률 DP|확률 DP]]처럼 `dp >= 0`으로 한다.
- modulo 값이 음수가 될 수 있는 언어에서는 `((x % m) + m) % m`처럼 대표 범위를 정규화한다.

## 반례를 만드는 축

| 축 | 질문 |
|---|---|
| 크기 | 0개, 1개, 최대 크기에서 유지되는가? |
| 값 | 모두 같음, 모두 음수, 최솟값/최댓값은? |
| 구조 | 연결되지 않음, 한 줄로 편향됨, cycle은? |
| 순서 | 이미 정렬, 역순, 중복 순서는? |
| 도달성 | 답 없음, 시작=도착, 한 경로만 있음은? |
| 경계 | 첫/마지막 index와 구간 끝점은? |
| 겹침 | 두 조각이 한 입력의 같은 부분을 함께 쓰지 않는가? |

와일드카드 `*` 하나가 든 패턴을 앞 조각(prefix)과 뒤 조각(suffix)만 비교하면, 패턴 `ab*ab`와 이름 `ab`처럼 두 조각이 같은 글자를 겹쳐 써서 일치로 잘못 판정한다. 이름 길이가 두 조각 길이의 합 이상인지 먼저 확인한다. 이 검사 없이 `s.substr(s.size() - suf.size())`를 부르면 `size_t` 뺄셈이 감겨 시작 위치가 길이를 넘고 `std::out_of_range`가 던져진다. 제출 전에는 반례를 찾아보고, 크기와 최댓값, 최솟값부터 본다.

오답이 나면 전체 코드를 다시 읽기 전에 최소 실패 입력을 만든다. 예상 상태 전이를 손으로 적고, 실제 값을 필요한 지점에만 출력해 최초로 달라지는 순간을 찾는다. 질문할 때는 문제 링크, 입력, 기대/실제 출력, 최소 재현 코드와 이미 확인한 가설을 함께 제공한다.

## 로컬 환경과 채점 환경의 차이

채점 서버는 대부분 GCC 계열이고, Visual Studio는 MSVC 컴파일러를 쓴다. 로컬에서 되던 코드가 서버에서 안 되거나 그 반대가 되는 지점을 알아 둔다.

- **가변 길이 배열(VLA)**: `int a[n];`처럼 실행 중에 정해지는 크기로 배열을 선언하는 것은 표준 C++이 아니라 GCC 확장이다. GCC에서는 컴파일되지만 MSVC에서는 오류다. 크기가 입력에 따라 달라지면 `std::vector`를 쓰거나 제약의 최댓값으로 전역 배열을 잡는다.
- **`<bits/stdc++.h>`**: 표준 헤더를 한꺼번에 포함하는 GCC(libstdc++) 내부 헤더다. MSVC에는 없어서 쓰려면 직접 파일을 만들어 넣어야 하고, 사용을 막는 시험 환경도 있으므로 `<algorithm>`, `<vector>`, `<queue>`처럼 자주 쓰는 표준 헤더 이름은 외워 둔다.
- **전역 이름 충돌**: 헤더가 전역에 선언한 C 함수와 같은 이름의 전역 변수는 다른 종류의 기호로 다시 선언했다는 컴파일 오류가 된다. `<ctime>`의 `time`, `<cmath>`가 포함하는 `<math.h>`의 Bessel 함수 `j0`, `j1`, `jn`, `y0`, `y1`, `yn`이 대표적이라 좌표 변수 `y1`이나 시각 변수 `time`에서 자주 터진다. GNU/Linux의 g++는 `_GNU_SOURCE`를 항상 정의해 glibc의 이 선언이 보이고, macOS의 Apple clang 21에서도 `int y1;`과 `int time;`은 같은 오류를 낸다. `using namespace std;` 아래 전역 `count`, `next`, `prev`는 `std::count` 등과 모호하다는 오류가 난다. 이상한 컴파일 오류가 나면 변수명 충돌부터 의심하고, `#define`으로 덮기보다 `sy`, `ey`처럼 이름을 바꾸거나 지역 변수로 둔다.
- **제출 언어와 컴파일러 옵션**: 플랫폼마다 C++ 표준 버전과 최적화 옵션이 다르다. 시험 전에 해당 플랫폼에서 한 번 제출해 본다.

## 코딩 테스트용 코드와 제품 코드의 차이

코딩 테스트의 목표는 남이 읽기 좋은 코드가 아니라 제한 시간 안에 정답을 받는 것이다. 필요한 헤더만 골라 포함하고 입력 크기에 딱 맞게 동적 할당한 뒤 해제하는 제품 코드 습관은 여기서 타이핑 비용이 된다. 헷갈리지 않는 범위에서 짧게 쓰고, 제약 최댓값보다 조금 큰 전역 배열을 잡으며, 배열이 필요 없으면 입력을 받자마자 처리한다. 이 습관을 실제 서비스 코드로 가져오지는 않는다.

- 출력 끝의 공백이나 줄바꿈 하나는 대부분의 채점기가 무시하므로 마지막 원소만 따로 처리하는 분기는 필요 없다. 공백 처리가 엄격한 플랫폼인지는 미리 확인한다.
- 100줄 안팎의 코드는 디버거로 따라가기보다 중간값을 출력해 보는 편이 빠를 때가 많다. 제출 전에 디버그 출력은 지운다.
- 30분 넘게 실마리가 없으면 풀이를 찾아보고 배운다. 맞힌 뒤에는 다른 사람의 풀이와 비교한다.

## 제출 전 체크리스트

- [ ] 자료형과 중간 곱/합의 범위를 계산했다.
- [ ] 빈 container에서 `top`, `front`와 `back`을 호출하지 않는다.
- [ ] 모든 test case의 상태를 초기화한다.
- [ ] 재귀의 base case와 복구가 있다.
- [ ] 경계 index와 `[l, r)` 의미가 일관된다.
- [ ] 불가능 상태와 도달하지 못한 정점을 처리한다.
- [ ] sample 외에 직접 만든 반례를 통과한다.
- [ ] 작성 직후 위에서부터 변수명, index, 조건식을 훑었고, 복사해 붙인 블록의 이름(y와 x, ny와 nx)을 모두 바꿨다.
- [ ] 고정 출력 문자열은 문제에서 복사해 붙였다.

## 출처

- 인프런, 큰돌 강사, [강의소개](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100288), [(필독) 알고리즘 교안 공부하는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=124139), [(필독) 문제 풀 때 주의할 점](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=147924), [(필독) 질문하는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123816), [(팁) 재밌게 꾸준하게 문제푸는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100292)
- 인프런, 큰돌 강사, [(팁) 코딩테스트를 준비하는 직장인을 위한 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100946), [(특강) 내가 IT대기업에 합격한 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=135276), [1주차 개념 #10. 구현](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133249), [1주차 개념 #11. 문제푸는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238019), [1-B counting star](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100294)
- 인프런, 큰돌 강사, [1-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100296), [1-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100297), [1-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100298), [1-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100299), [1-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100301)
- 인프런, 큰돌 강사, [1-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100303), [(맞왜틀팁) 출력 | 1-K 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144193), [1-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100306), [1-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100307), [1-O 부연설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=150874)
- 인프런, 큰돌 강사, [2-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100330), [2-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100331), [2-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100332), [2-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100333), [2-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100334)
- 인프런, 큰돌 강사, [2-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100335), [2-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100336), [4-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100384), [4-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100392), [4-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100393)
- 인프런, 큰돌 강사, [5-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100406), [5-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100408), [5-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100411), [5-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100415), [5-U](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100416)
- 인프런, 큰돌 강사, [7-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100976), [7-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100978), [8-V](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101075), [8-W](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101076), [8-Z](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101079)
- 인프런, 큰돌 강사, [2-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100328), [5-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100409), [6-F 그리디를 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152628), [6-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100958), [7-I와 실수형연산의 한계](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100972)
- 인프런, 큰돌 강사, [맞왜틀팁 : 실수를 줄이는 방법 | 히든퀘스트](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144196)

- [바킹독의 실전 알고리즘 0x00강, 오리엔테이션 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=LcOIobH7ues)
- [바킹독의 실전 알고리즘 0x01강, 기초 코드 작성 요령 I — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=9MMKsrvRiw4)
- [cppreference, Arithmetic operators (overflows)](https://en.cppreference.com/w/cpp/language/operator_arithmetic)
- [GCC Manual, Variable Length](https://gcc.gnu.org/onlinedocs/gcc/Variable-Length.html)
- [바킹독의 실전 알고리즘 0x02강, 기초 코드 작성 요령 II — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=6lhVHP8bkPA)
- [C++ working draft, integer conversions](https://eel.is/c++draft/conv.integral)
- [cppreference, `std::basic_string::substr`](https://en.cppreference.com/w/cpp/string/basic_string/substr)
- [libstdc++ FAQ, _XOPEN_SOURCE and _GNU_SOURCE are always defined?](https://gcc.gnu.org/onlinedocs/libstdc++/faq.html#faq.predefined)
- [GNU C Library manual, Special Functions](https://sourceware.org/glibc/manual/latest/html_node/Special-Functions.html)

## 관련 문서

- [[C++(Cpp)|C++ 인덱스]]
- [[Cpp-Coding-Test-Workflow-IO-and-Strings|C++ 입출력과 문자열]]
- [[Cpp-Language-Memory-and-STL|C++ 값과 메모리, STL]]
- [[Number-Theory-Basics|정수론 기초]]
- [[Algorithm-Practice|알고리즘 문제풀이 루프]]
- [[Algorithm-Complexity|시간복잡도와 공간복잡도]]
- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]

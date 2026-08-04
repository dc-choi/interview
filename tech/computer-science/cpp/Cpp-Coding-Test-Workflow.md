---
tags: [cs, cpp, coding-test, debugging, implementation]
status: done
category: "CS - C++"
aliases: ["C++ Coding Test Workflow", "C++ 코딩 테스트 워크플로"]
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

- token 단위 입력은 `operator>>`, 공백을 포함한 한 줄은 `std::getline`을 쓴다.
- `>>` 뒤 바로 `getline`을 호출하면 남은 newline을 읽을 수 있다. `std::getline(std::cin >> std::ws, line)` 또는 명시적 ignore 정책을 정한다.
- 문자열을 자를 때 시작 위치뿐 아니라 남은 길이를 확인한다. `find` 실패 결과인 `std::string::npos`도 분기한다.
- 문자 분류 함수에 plain signed `char`를 바로 넘기지 말고 `unsigned char`로 변환한다.
- 매우 큰 정수의 비교는 leading zero를 정규화한 뒤 문자열 길이와 사전식을 비교하고, 덧셈은 오른쪽부터 carry를 전파한다.

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
- 전역 변수는 zero initialization이 편리하지만 호출 간 상태가 암묵적으로 공유된다. 재귀 상태는 가능한 parameter/local state로 드러낸다.
- 최댓값은 실제 가능한 최솟값보다 작게, 최솟값은 가능한 최댓값보다 크게 초기화한다. 입력이 모두 음수인 경우 `0` 초기화는 틀릴 수 있다.
- `INF`에 값을 더할 때 overflow하지 않도록 도달 가능성을 먼저 검사하고 충분한 범위의 type을 쓴다.

## 계산량과 구현 비용

복잡도는 loop 모양만 보지 않는다. loop 안의 `sort`, `erase`, 문자열 복사와 container mutation 비용까지 합친다. 대략적인 연산 횟수는 가능성을 판단하는 출발점일 뿐 언어, cache, allocation과 시간 제한에 따라 달라지므로 고정된 숫자를 보편 법칙처럼 외우지 않는다.

- 같은 크기 subproblem을 반복하면 memoization/DP 후보인지 본다.
- 모든 조합을 보더라도 제약이 작으면 완전탐색이 가장 명료할 수 있다.
- 값의 범위가 매우 크고 실제 event가 적으면 전체 좌표 배열 대신 정렬, map 또는 coordinate compression을 검토한다.
- 반복적인 `string::erase`나 vector 중간 삭제는 선형 이동을 만들 수 있다. 결과 buffer, stack 또는 양 끝 container로 모델을 바꿀 수 있는지 본다.

## 정수와 실수 계산

- 거듭제곱을 직접 반복하지 않고 exponent를 절반씩 줄이는 binary exponentiation을 쓰면 O(log exponent)이다. modular multiplication의 중간 곱도 type 범위 안인지 확인한다.
- n! 끝의 0 개수처럼 결과 전체가 필요 없는 문제는 소인수 2와 5의 개수 등 답을 결정하는 요인만 센다.
- 2부터 n까지의 소수를 반복해서 쓸 때는 Eratosthenes sieve로 합성수를 지운다. 각 소수 p의 배수는 `p * p`부터 처리하며 그 곱의 overflow를 확인한다.
- 매우 긴 정수는 문자열로 비교하거나 자리별 carry 연산을 구현할 수 있다.
- 금액처럼 decimal 단위가 고정되면 floating-point 값을 반복 비교하기보다 입력을 정수 단위로 변환한다. 변환 시 decimal parsing과 rounding 규칙을 명시한다.
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

오답이 나면 전체 코드를 다시 읽기 전에 최소 실패 입력을 만든다. 예상 상태 전이를 손으로 적고, 실제 값을 필요한 지점에만 출력해 최초로 달라지는 순간을 찾는다. 질문할 때는 문제 링크, 입력, 기대/실제 출력, 최소 재현 코드와 이미 확인한 가설을 함께 제공한다.

## 제출 전 체크리스트

- [ ] 자료형과 중간 곱/합의 범위를 계산했다.
- [ ] 빈 container에서 `top`, `front`와 `back`을 호출하지 않는다.
- [ ] 모든 test case의 상태를 초기화한다.
- [ ] 재귀의 base case와 복구가 있다.
- [ ] 경계 index와 `[l, r)` 의미가 일관된다.
- [ ] 불가능 상태와 도달하지 못한 정점을 처리한다.
- [ ] sample 외에 직접 만든 반례를 통과한다.

## 출처

- 인프런, 큰돌 강사, [강의소개](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100288), [(필독) 알고리즘 교안 공부하는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=124139), [(필독) 문제 풀 때 주의할 점](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=147924), [(필독) 질문하는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123816), [(팁) 재밌게 꾸준하게 문제푸는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100292)
- 인프런, 큰돌 강사, [(팁) 코딩테스트를 준비하는 직장인을 위한 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100946), [(특강) 내가 IT대기업에 합격한 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=135276), [1주차 개념 #10. 구현](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133249), [1주차 개념 #11. 문제푸는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238019), [1-B counting star](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100294)
- 인프런, 큰돌 강사, [1-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100296), [1-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100297), [1-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100298), [1-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100299), [1-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100301)
- 인프런, 큰돌 강사, [1-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100303), [(맞왜틀팁) 출력 | 1-K 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144193), [1-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100306), [1-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100307), [1-O 부연설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=150874)
- 인프런, 큰돌 강사, [2-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100330), [2-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100331), [2-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100332), [2-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100333), [2-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100334)
- 인프런, 큰돌 강사, [2-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100335), [2-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100336), [4-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100384), [4-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100392), [4-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100393)
- 인프런, 큰돌 강사, [5-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100406), [5-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100408), [5-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100411), [5-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100415), [5-U](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100416)
- 인프런, 큰돌 강사, [7-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100976), [7-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100978), [8-V](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101075), [8-W](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101076), [8-Z](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101079)

- [C++ working draft, integer conversions](https://eel.is/c++draft/conv.integral)
- [C++ working draft, basic iostreams](https://eel.is/c++draft/iostreams)
- [cppreference, `std::getline`](https://en.cppreference.com/w/cpp/string/basic_string/getline)
- [cppreference, `std::string::find`](https://en.cppreference.com/w/cpp/string/basic_string/find)

## 관련 문서

- [[C++(Cpp)|C++ 인덱스]]
- [[Cpp-Language-Memory-and-STL|C++ 값과 메모리, STL]]
- [[Algorithm-Practice|알고리즘 문제풀이 루프]]
- [[Algorithm-Complexity|시간복잡도와 공간복잡도]]
- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]

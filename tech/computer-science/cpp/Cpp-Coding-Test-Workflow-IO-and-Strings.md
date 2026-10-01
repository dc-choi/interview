---
tags: [cs, cpp, coding-test, io, string]
status: done
category: "CS - C++"
aliases: ["C++ Coding Test IO and Strings", "C++ 입출력과 문자열", "C++ split", "문자 빈도 카운팅"]
verified_at: 2026-09-30
---

# C++ 코딩 테스트의 입출력과 문자열

알고리즘이 맞아도 입력을 덜 읽거나, 출력 형식이 한 글자 다르거나, 문자열 가공이 O(n²)이 되면 오답이다. [[Cpp-Coding-Test-Workflow|C++ 코딩 테스트 워크플로]]에서 입출력과 문자열 처리를 떼어 정리한다.

## 입력

- token 단위 입력은 `operator>>`, 공백을 포함한 한 줄은 `std::getline`을 쓴다.
- `>>` 뒤 바로 `getline`을 호출하면 남은 newline을 읽을 수 있다. `std::getline(std::cin >> std::ws, line)` 또는 명시적 ignore 정책을 정한다.
- 공백을 포함한 한 줄을 C 방식으로 받던 `gets`는 버퍼 overflow 위험 때문에 C++14에서 제거됐다. `std::getline`을 쓴다.
- 입력 개수가 주어지지 않고 끝까지 이어지면 `while (std::cin >> n)`이나 `while (scanf("%d", &n) == 1)`로 읽는다. `scanf`는 첫 변환 전에 입력이 끝나면 `EOF`를, 형식이 맞지 않으면 0을 반환하고 맞지 않은 입력을 읽지 않은 채 남긴다. 그래서 `!= EOF` 조건은 숫자가 아닌 token을 만나면 같은 자리에서 끝없이 돈다.
- 숫자와 이름이 섞인 질의는 첫 글자를 `std::isdigit(static_cast<unsigned char>(s[0]))`로 가르거나 `std::stoi`로 바꾼다. `atoi`는 변환할 수 없으면 0을 반환하므로 0이 정상 입력일 수 없는 문제에서만 이름 신호로 쓸 수 있고, 결과가 범위를 넘으면 undefined behavior다. `std::stoi`는 변환 실패에 `std::invalid_argument`, 범위 초과에 `std::out_of_range`를 던진다. 앞 공백은 건너뛰고 `12abc`처럼 뒤에 남은 문자는 받아들이며, 멈춘 위치는 두 번째 인자로 받는다.

## 출력과 입출력 속도

- `std::cin`과 `std::cout`만 쓸 때는 `std::ios::sync_with_stdio(false);`와 `std::cin.tie(nullptr);`를 main 첫머리에 둔다. 앞의 것은 C 표준 스트림(`printf`, `scanf`)과의 동기화를 끊고, 뒤의 것은 입력 전마다 `cout` 버퍼를 비우는 동작을 끈다. 입출력이 많을 때 시간 초과를 막는다. 동기화를 끊은 뒤 `printf`와 `cout`을 섞으면 출력 순서가 뒤섞이므로 한쪽만 쓴다.
- `std::endl`은 줄바꿈과 함께 버퍼를 비운다. 채점은 종료 시점의 출력만 보므로 매 줄 flush할 이유가 없고 느려진다. 줄바꿈은 `'\n'`을 쓴다.
- `scanf`와 `printf`는 `std::string`을 직접 다루지 못한다. 섞어 써야 하면 `char` 배열로 받아 `std::string`으로 바꾸고 출력할 때 `c_str()`을 쓴다.
- 소수점 아래 자릿수를 고정하려면 `<iomanip>`를 포함하고 `std::cout << std::fixed << std::setprecision(2)`를 쓴다. `fixed` 없이 `setprecision`만 쓰면 소수점 아래가 아니라 전체 유효 자릿수를 정한다. 실수 오차와 반올림 경계는 [[Cpp-Coding-Test-Workflow#정수와 실수 계산|정수와 실수 계산]]에서 다룬다.
- 불가능할 때 출력하는 문장 같은 고정 문자열은 직접 타이핑하지 말고 문제에서 복사해 붙인다. 대소문자나 공백 하나만 달라도 틀리며, 논리가 맞는데 틀리는 흔한 원인이다.

## 문자열 가공

- 문자열은 `char` 배열보다 `std::string`을 쓴다(`substr`, `find`, `replace`, `erase`, `insert`). 파싱이 아주 복잡하면 문자열 처리가 편한 언어로 푸는 선택지도 있다.
- `s = s + "a"`는 매번 새 문자열을 만들어 대입하므로 길이 n까지 반복하면 O(n²)이다. `s += "a"`나 `push_back`은 덧붙이는 길이만큼만 들어 전체 O(n)이다. 같은 이유로 문자열을 자르며 `s = s.substr(...)`로 계속 줄이는 대신 시작 index만 들고 다닌다. 길이가 수십만이면 이 차이로 시간 초과가 난다.
- 표준 라이브러리에는 문자열을 나눠 vector로 돌려주는 함수가 없다. C++20부터 `std::views::split`으로 범위를 나눌 수 있지만 조각이 subrange라 문자열로 바꿔야 하고(C++23은 `std::ranges::to<std::string>`, 그 전에는 `std::string(sub.begin(), sub.end())`), 채점 환경의 표준 버전도 확인해야 한다. 어디서나 통하는 쪽은 `find(sep, pos)`의 시작 위치 인자로 직접 만드는 것이다. 겹치지 않게 패턴 개수를 셀 때도 찾은 위치에 `p.size()`를 더한 곳부터 다시 찾는다(1만 더하면 `aaaaaaa`에서 `aaa`를 겹쳐 센다).

```cpp
std::vector<std::string> split(const std::string& s, const std::string& sep) {
  std::vector<std::string> ret;
  size_t pos = 0;
  while (true) {
    size_t next = s.find(sep, pos);  // 없으면 std::string::npos
    if (next == std::string::npos) { ret.push_back(s.substr(pos)); break; }
    ret.push_back(s.substr(pos, next - pos));
    pos = next + sep.size();
  }
  return ret;
}
```

- `substr`의 두 번째 인자는 끝 index가 아니라 길이다. 다음 시작 위치를 `sep.size()`만큼 옮기므로 `||` 같은 여러 글자 구분자도 같은 코드로 처리되고, 마지막 구분자 뒤의 조각은 `find`가 실패할 때 따로 넣어야 빠지지 않는다.
- 구분자가 연속되거나 앞뒤에 있으면 빈 문자열 조각이 생긴다. 빈 구분자를 넘기면 `find`가 매번 pos를 돌려줘 loop가 끝나지 않으므로 호출 전에 막는다. 공백으로만 나뉜 token이면 `std::istringstream`과 `>>`가 더 간단하다.
- `substr(pos, len)`은 pos가 문자열 길이를 넘으면 `std::out_of_range`를 던지고, len이 남은 길이보다 길면 끝까지만 자른다. `find` 실패 결과인 `std::string::npos`도 분기한다.
- 문자 분류 함수에 plain signed `char`를 바로 넘기지 말고 `unsigned char`로 변환한다. `unsigned char`로 표현할 수 없고 `EOF`도 아닌 값을 넘기면 undefined behavior다.
- 매우 큰 정수의 비교는 leading zero를 정규화한 뒤 문자열 길이와 사전식을 비교하고, 덧셈은 오른쪽부터 carry를 전파한다.
- 패턴 조각이 한 입력의 같은 글자를 겹쳐 쓰는 반례는 [[Cpp-Coding-Test-Workflow#반례를 만드는 축|반례 축]]에서 다룬다.

## 문자 빈도와 문자 코드

- 개수를 셀 때는 배열과 map을 먼저 떠올린다. key가 작은 정수 범위에 조밀하면 배열이 O(1)이고, 문자열 key이거나 값이 띄엄띄엄 넓으면 배열은 공간을 낭비하므로 map을 쓴다([[Hash-Table|direct-address table]]과 같은 판단).
- ASCII에서 `'A'`는 65, `'a'`는 97이다. 소문자 c의 index는 `c - 'a'`(0~25)라 26칸 배열이면 되고, `'a' + i`로 되돌린다. 97~122를 그대로 index로 쓰면 앞의 97칸을 버린다. 함수 안의 카운팅 배열은 `int cnt[26] = {};`처럼 0을 명시한다([[Cpp-Language-Memory-and-STL#문자열과 Container 선택|지역 배열 초기화]]).
- index 0부터 25까지 순회하며 조건에 맞는 글자를 모으면 정렬 없이 사전순이 된다.
- 팰린드롬 판별은 복사본을 `std::reverse`해 원본과 비교한다. `reverse`는 제자리에서 바꾸므로 원본을 뒤집으면 비교 대상이 사라진다.
- 글자를 재배열해 팰린드롬을 만들 때는 순서가 아니라 글자별 개수만 중요하다. 개수가 홀수인 글자가 두 종류 이상이면 불가능하다(홀수 판정은 `cnt & 1`). 사전순으로 가장 앞선 결과는 앞 절반에 글자를 오름차순으로 개수의 절반씩 놓고, 홀수 글자 하나를 가운데에, 뒤 절반에 앞 절반의 역순을 둔다.
- 알파벳을 13칸 미는 ROT13처럼 범위 안에서 순환하는 이동은 대문자와 소문자를 따로 `base + (c - base + 13) % 26`으로 계산한다. 범위를 넘으면 26을 빼는 방식을 쓰더라도 `char` 변수에 먼저 더해 저장하지 않는다. `'z' + 13`은 135라 signed `char`에 담으면 음수로 감겨 범위 비교가 틀린다. `int`로 계산하고 비교한 뒤 저장한다([[Cpp-Coding-Test-Workflow#정수와 실수 계산|정수 범위와 char 감김]]).

## 출처

- 인프런, 큰돌 강사, [(필수개념) split() 함수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133246), [1주차 개념 #10. 구현](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133249), [1-B counting star](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100294), [1-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100296), [1-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100297)
- 인프런, 큰돌 강사, [1-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100298), [1-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100301), [1-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100303), [(맞왜틀팁) 출력 | 1-K 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144193), [1-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100307)

- [바킹독의 실전 알고리즘 부록 A, 문자열 기초 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=Mj6D3HW_rCw)
- [cppreference, std::ios_base::sync_with_stdio](https://en.cppreference.com/w/cpp/io/ios_base/sync_with_stdio)
- [cppreference, `std::basic_ios::tie`](https://en.cppreference.com/w/cpp/io/basic_ios/tie)
- [cppreference, `std::endl`](https://en.cppreference.com/w/cpp/io/manip/endl)
- [C++ working draft, Iostreams base classes](https://eel.is/c++draft/iostreams.base)
- [cppreference, `std::getline`](https://en.cppreference.com/w/cpp/string/basic_string/getline)
- [cppreference, `std::gets`](https://en.cppreference.com/w/cpp/io/c/gets)
- [cppreference, `scanf`, `fscanf`, `sscanf`](https://en.cppreference.com/w/cpp/io/c/fscanf)
- [cppreference, `std::atoi`](https://en.cppreference.com/w/cpp/string/byte/atoi)
- [cppreference, `std::stoi`](https://en.cppreference.com/w/cpp/string/basic_string/stol)
- [cppreference, `std::fixed`](https://en.cppreference.com/w/cpp/io/manip/fixed)
- [cppreference, `std::string::find`](https://en.cppreference.com/w/cpp/string/basic_string/find)
- [cppreference, `std::basic_string::substr`](https://en.cppreference.com/w/cpp/string/basic_string/substr)
- [cppreference, `std::ranges::split_view`](https://en.cppreference.com/w/cpp/ranges/split_view)
- [cppreference, `std::ranges::to`](https://en.cppreference.com/w/cpp/ranges/to)
- [cppreference, `std::isdigit`](https://en.cppreference.com/w/cpp/string/byte/isdigit)

## 관련 문서

- [[Cpp-Coding-Test-Workflow|C++ 코딩 테스트 워크플로]]
- [[Cpp-Language-Memory-and-STL|C++ 값과 메모리, STL]]
- [[C++(Cpp)|C++ 인덱스]]
- [[String-Matching-KMP|문자열 매칭과 KMP]]
- [[Hash-Table|해시 테이블]]

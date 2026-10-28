---
tags: [cs, fundamentals, programming-language, language-selection, memory-management, type-system, memory-safety]
status: done
verified_at: 2026-10-12
category: "CS - 기초"
aliases: ["Programming Language Landscape", "프로그래밍 언어 지형", "프로그래밍 언어 비교", "언어 선택 기준", "메모리 안전 언어"]
---

# 프로그래밍 언어 지형과 구분 기준

프로그래밍 언어는 인기 순위나 문법보다 처음 풀려던 문제와 그 결과로 굳은 실행 경로, 메모리 관리, 타입 검사 시점, 생태계로 나눠 볼 때 판단에 쓸 수 있다. 한 축에서 얻는 이득은 다른 축의 비용과 함께 오므로 언어 선택은 우열을 가리는 일이 아니라 현재 제약에 맞추는 일이다. 실행 구현의 일반 원리는 [[Compile-and-Runtime|컴파일과 런타임]]에서, 병목 유형은 [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]에서, 언어 교체의 효과와 측정 기준은 아래에서 다룬다.

## 설계 목적과 계보

뒤에 나온 언어는 앞선 언어의 불편을 줄이려는 반작용에서 나온 경우가 많고, 출발점의 목적이 지금의 강점과 비용을 설명한다.

| 언어 | 출발점 | 그 결과 남은 특성 |
|---|---|---|
| Fortran | 1957년 IBM. 그때까지 대부분 기계어나 [[CPU-Datapath-Control-and-Instruction-Cycle\|어셈블리어]]로 짜던 계산 프로그램을 수식에 가까운 표기로 쓰면서, 손으로 짠 프로그램과 비슷한 시간에 실행되게 하기 | 언어 설계보다 효율적인 코드를 만드는 컴파일러를 핵심 과제로 봤다. 당시에는 컴파일한 코드가 효율적일 수 있다는 주장 자체가 불신받았다 |
| COBOL | 1959년 사용자, 제조사와 미국 정부 대표가 모여 개발하기로 한 업무 데이터 처리용 공통 언어. 프로그램을 다른 제조사의 이후 컴퓨터로 옮기는 변환 비용을 줄이려고 기종에 독립적으로 설계했다 | 영어 표기에 가까운 문법, 수치 항목마다 선언하는 10진 자릿수와 소수점 위치 |
| C | 1970년대 초 Unix를 구현할 시스템 언어 | 타입이 없던 BCPL과 B에서 타입 구조를 발전시켰다 |
| C++ | C 방식의 프로그래밍을 지원하면서 추상화 수단을 더하기. 1979년 C with Classes로 시작해 1983년 말부터 C++라는 이름을 썼다 | 데이터 추상화, 객체지향, 제네릭 프로그래밍 |
| Java | 네트워크로 연결된 소비자 기기용 소프트웨어. 여러 하드웨어에서 돌고 전송받은 코드를 안전하게 실행해야 했다 | C, C++와 비슷한 문법에서 복잡하고 안전하지 않은 기능을 덜어 냈고, JVM이 하드웨어와 OS 독립성을 맡는다 |
| C# | .NET 플랫폼의 관리형 객체지향 언어 | C 계열 문법, 컴파일 시점에 정해지는 타입, 런타임의 자동 메모리 관리 |
| JavaScript | Netscape에서 만들어 Navigator 2.0 브라우저에 처음 실린 스크립트 언어 | 범용 프로그래밍 언어로 넓어져 서버와 임베디드에서도 쓰인다 |
| TypeScript | JavaScript 코드에 실행 전 타입 검사를 더하기 | JavaScript의 상위 집합이고 런타임 동작은 바꾸지 않는다 |
| Python | 1990년대 초 네덜란드 CWI에서 ABC의 후속으로 시작 | 동적 타입, 명료한 문법, C나 C++로 확장하는 구조 |
| PHP | 1994년 온라인 이력서의 방문 추적에 처음 쓰인 CGI 도구 묶음(Personal Home Page Tools) | 서버에서 실행해 HTML을 만들어 보내는 웹 개발 중심의 범용 스크립트 언어 |
| Go | 효율적 컴파일, 효율적 실행, 쉬운 프로그래밍을 한 언어에서 얻으려 한 Google 내부의 시도. 2007년 설계를 시작해 2009년 오픈소스로 공개 | 기본으로 런타임을 포함하는 정적 링크 바이너리, GC, `gofmt`로 통일한 코드 형식 |
| Rust | 가비지 컬렉터 없이 메모리 안전성을 보장하기 | 컴파일러가 검사하는 소유권과 대여 규칙 |

계보에서 읽을 판단 포인트는 다음과 같다.

- 메모리를 직접 다루는 C의 위험에 언어마다 다른 답을 냈다. C++는 C 방식의 제어를 유지했고, Java, C#, Go는 메모리 회수를 런타임에 맡겼으며, Rust는 저수준 시스템 프로그래밍을 목표로 두면서 안전성 검사를 컴파일러로 옮겼다.
- TypeScript처럼 기존 언어의 상위 집합으로 설계하면 기존 코드와 라이브러리를 그대로 쓰는 대신 런타임 의미는 원래 언어를 따른다. 타입 검사를 통과해도 외부 입력은 따로 검증한다([[타입스크립트(TS)|TypeScript]]).
- 플랫폼에서 출발한 언어는 플랫폼과 함께 퍼진다. JavaScript는 브라우저에서 서버와 임베디드로, PHP는 개인 홈페이지 도구에서 웹 개발용 범용 스크립트 언어로 넓어졌다.
- 분야의 요구는 언어 기능이 된다. COBOL은 계산 결과가 선언한 소수 자릿수를 넘으면 자르고 ROUNDED를 지정하면 반올림한다(1968년 CODASYL 명세 기준). 금액 계산에서 이진 부동소수점 오차를 피하고 반올림 규칙을 명시하는 원칙을 언어 차원에서 둔 사례다([[Payment-System-Principles|결제 시스템 원칙]]).
- 표현의 자유도도 설계 선택이다. 텍스트 파일을 훑어 정보를 뽑고 보고서를 만드는 데 맞춰 출발한 Perl은 작고 우아한 최소주의보다 쓰기 쉽고 효율적이며 완결된 실용을 앞세우고, 같은 일을 하는 방법이 하나가 아니라는 것을 표어로 삼는다. Python은 명백한 방법이 하나, 가급적 하나만 있어야 한다는 원칙을 두고, Go는 `gofmt`로 코드 형식을 통일한다. 방법이 많은 언어일수록 팀 규약과 리뷰가 일관성을 맡는다.

- 작은 구현은 개념의 핵심을 읽을 수 있는 크기로 드러내는 학습 자료가 된다. 다만 코드 골프의 최소 바이트 구현이 가독성이나 최소 복잡도를 증명하는 것은 아니다. 작은 구현의 존재를 학습 동기로 삼고 읽기 쉬운 판을 공부한다. 언어도 문법, 표준 라이브러리와 표현력을 따로 평가한다. 핵심 문법이 작아도 Forth나 Lisp처럼 표현력이 큰 경우가 있다(아래 Small Programs and Languages의 관점).

## 실행 경로

같은 언어도 구현체마다 실행 방식이 다르므로 대표 구현의 기본 경로로 비교한다. 인터프리터 언어와 컴파일 언어로 고정 분류하지 않는 이유는 [[Compile-and-Runtime|컴파일과 런타임]]에서 다룬다.

| 기본 경로 | 대표 구현 | 배포와 운영에서 드러나는 점 |
|---|---|---|
| 실행 전에 기계어로 컴파일 | C, C++, Rust, Go | 대상 OS와 CPU별로 빌드하고 실행 기계에는 컴파일러가 필요 없다. Go의 gc 툴체인은 기본으로 Go 런타임을 넣은 정적 링크 바이너리를 만든다 |
| 중간 코드를 런타임이 해석하거나 JIT 컴파일 | Java와 Kotlin/JVM(class file과 JVM), C#(IL과 CLR) | 같은 산출물을 플랫폼별 런타임에서 실행한다. JVM은 Java 언어가 아니라 class file 형식만 알기 때문에, JVM을 대상으로 Java 호환 bytecode를 만드는 Kotlin도 같은 런타임과 Java 라이브러리를 쓴다. .NET은 발행 시점에 IL을 기계어로 바꾸는 Native AOT도 제공하는데, 이렇게 발행한 앱은 동적 로딩과 런타임 코드 생성을 쓸 수 없다 |
| 엔진이 bytecode 해석과 여러 단계의 JIT를 섞음 | JavaScript(V8) | 시작 지연과 최고 성능을 실행 계층으로 나눠 다룬다([[V8\|V8 엔진]]) |
| 소스를 bytecode로 컴파일해 실행 | CPython, PHP | CPython은 bytecode를 `.pyc`로 캐시한다. PHP의 OPcache는 컴파일한 bytecode를 공유 메모리에 두어 요청마다 스크립트를 다시 읽고 파싱하지 않게 한다 |
| 다른 언어로 변환 | TypeScript | 타입을 검사한 뒤 지운 JavaScript를 JavaScript 엔진이 실행한다 |

## 메모리 관리 방식

| 방식 | 예 | 얻는 것 | 치르는 것과 주의 |
|---|---|---|---|
| 수동 할당과 해제 | C(`malloc`, `free`) | 할당과 해제 시점을 직접 정한다 | 해제 누락, 중복 해제, 범위를 벗어난 접근을 프로그래머가 막아야 하고, 이 관리가 프로그래머의 시간을 많이 쓰며 해로운 버그의 원인이 되는 경우가 많다([[C-Pointers-and-Dynamic-Memory\|C 포인터와 동적 메모리]]) |
| 자원 수명을 생성자와 소멸자에 묶는 RAII | C++ | 자원 관리 객체가 스코프를 벗어나는 지점에서 해제된다 | 자원 관리 객체 밖에서 직접 쓰는 `new`, `delete`는 누수와 오류의 원인이 되기 쉽다([[Cpp-Language-Memory-and-STL\|C++ 값과 메모리]]) |
| 런타임의 가비지 컬렉터 | Java, C#, Go, JavaScript | 객체를 직접 해제하지 않는다 | GC가 CPU 시간과 메모리를 쓰고(Go는 `GOGC`로 둘 사이의 비율을 조정한다), 도달 가능한 참조를 붙잡아 두면 회수되지 않는다. Go와 주요 JavaScript 엔진은 mark-sweep 계열이고 JVM 명세는 회수 알고리즘을 정하지 않는다([[JVM-GC\|JVM GC]], [[Call-Stack-Heap\|콜 스택과 힙]]) |
| 참조 카운트와 순환 수집 | CPython | 참조 수가 0이 되는 시점에 객체가 해제된다 | 서로를 참조하는 순환은 별도의 순환 GC가 찾아 끊는다 |
| 순환 수집 없는 참조 카운트 | Swift(ARC) | 강한 참조가 남지 않은 클래스 인스턴스가 해제된다. 구조체와 열거형은 값 타입이라 참조 카운트 대상이 아니다 | 두 인스턴스가 서로를 강하게 참조하면 해제되지 않아 메모리 누수가 된다. 관계의 한쪽을 `weak`나 `unowned` 참조로 선언해 순환을 끊는다 |
| 컴파일러가 검사하는 소유권 규칙 | Rust | GC 없이 메모리 안전성을 얻고, 소유자가 스코프를 벗어나면 값이 해제된다. 소유권 검사는 실행 속도를 늦추지 않는다 | 규칙을 어기면 컴파일되지 않아 익숙해지는 데 시간이 든다. `unsafe` 코드와 외부 함수 경계는 프로그래머가 책임지고, 누수 방지는 보장 범위가 아니다 |

## 타입 검사 시점

- Java, C#, Go, Rust는 변수의 타입을 컴파일 시점에 정한다. 잘못된 타입 사용을 실행 전에 찾고, 편집기 같은 도구가 같은 정보를 쓴다.
- JavaScript, Python, PHP는 변수에 담긴 값이 타입을 정한다. 같은 변수에 다른 타입의 값을 넣을 수 있고 타입 오류는 그 연산을 실행할 때 드러난다. JavaScript와 PHP는 연산 문맥에 따라 값을 자동으로 변환하므로 변환 규칙도 알아야 한다([[JavaScript-Expressions-Control-Flow-and-Coercion|JavaScript 표현식과 타입 변환]]).
- 타입 표기가 실행 중 무엇을 하는지는 언어마다 다르다.
  - TypeScript는 검사 뒤 타입을 지우므로 실행되는 JavaScript에 타입 정보가 없다.
  - Python 타입 힌트는 선택이고 런타임이 강제하지 않으며, 타입 검사기와 IDE가 쓴다.
  - PHP는 함수 인자, 반환값, 클래스 속성의 타입 선언을 호출 시점에 검사해 맞지 않으면 `TypeError`를 던진다. 기본 모드는 가능한 경우 스칼라 값을 선언 타입으로 바꾸고, 파일 단위 `declare(strict_types=1)`로 이 변환을 막는다(int 값을 float 선언에 넘기는 경우는 예외).
- null 처리도 타입 검사 시점의 문제다. Java처럼 모든 참조가 null일 수 있으면 null 참조 접근은 실행 중 예외가 된다. Swift의 optional과 Kotlin의 nullable 타입(`String?`)은 값이 없을 수 있는 변수를 타입으로 구분하고, 확인 없이 값처럼 쓰면 컴파일 오류를 낸다. 강제 언래핑(Swift `!`, Kotlin `!!`)은 값이 없을 때 실행 중에 실패하고, Kotlin은 Java 선언의 타입을 null 검사가 완화된 platform type으로 다뤄 그 값에는 Java와 같은 수준의 보장만 남는다.
- 정적 타입 언어에서도 API 응답과 사용자 입력처럼 신뢰 경계를 넘는 데이터는 값의 범위와 형식을 런타임에 검증한다([[Runtime-Validation-Libraries|Runtime 검증 라이브러리]]).

## 플랫폼과 생태계가 좁히는 선택

- 브라우저: HTML은 웹의 핵심 마크업 언어로 문서 구조를 표시하고, CSS는 글꼴과 간격 같은 스타일을 문서에 붙이는 스타일 시트 언어로 표현을 내용에서 분리하며, 상호작용은 스크립트가 더한다([[Declarative-Programming|선언형 프로그래밍]]). JavaScript는 웹 브라우저에 내장된 언어로 가장 잘 알려져 있다. TypeScript는 JavaScript로 바꿔 브라우저에서 실행하고, C/C++와 Rust 같은 언어는 WebAssembly로 컴파일하는 경로를 쓴다([[WebAssembly]]).
- 게임 엔진: Unity는 C# 스크립팅을, Unreal Engine은 C++ 프로그래밍 프레임워크를 제공한다. 엔진을 고르면 주 언어가 따라온다.
- 확장할 제품: WordPress 플러그인은 PHP 파일 하나로 시작할 수 있다. 기존 제품을 확장할 때는 그 제품의 언어 생태계 안에서 고른다.
- 내장 스크립트: Lua는 C 라이브러리로 구현돼 필요한 프로그램에 내장할 수 있는 스크립트 언어다. 확장 언어로서는 main 프로그램 개념 없이 호스트 안에서 실행되고(독립 실행용 `lua` 프로그램도 그런 호스트다), 호스트는 Lua 코드를 실행하고 변수를 읽고 쓰며 C 함수를 등록해 스크립트가 부르게 한다. 핵심 기능은 호스트가 제공하고 설정과 동작은 스크립트로 정하는 구조에 맞는다. Redis도 서버에 내장한 Lua 5.1 인터프리터로 애플리케이션 로직 일부를 서버 안에서 실행한다([[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions]]).
- 인프라 도구: Kubernetes 저장소와 Docker가 만든 Moby 저장소의 코드는 대부분 Go다(2026-10-12 GitHub 언어 통계 기준). 내부 동작을 읽거나 기여하려면 Go를 읽을 수 있어야 한다.
- 데이터와 AI: NumPy는 배열 연산의 반복을 미리 컴파일한 C 코드에서 실행한다. Python이 작성과 연결을 맡고 무거운 계산은 네이티브 라이브러리가 맡는 구조라서, 순수 Python 반복이 병목이면 판단이 달라진다([[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]).
- 데이터 질의: 관계형 DB를 쓰면 애플리케이션 언어와 함께 SQL을 쓴다. SQL은 얻을 결과의 조건을 선언하고, 같은 결과를 내는 여러 실행 방법 가운데 무엇을 쓸지는 DBMS가 정한다. PostgreSQL planner는 가장 빠를 것으로 예상되는 계획을 고르므로 성능은 문장 모양보다 실행 계획으로 확인한다([[Execution-Plan-Basics|실행 계획 기본]], [[Declarative-Programming|선언형 프로그래밍]]).
- 권장 언어의 이동: Android는 2019년 Google I/O에서 Kotlin 우선 개발을 밝혔다. Java로 API를 쓰는 지원은 유지하지만 Jetpack Compose는 Java를 지원하지 않는다. 플랫폼 소유자의 권장 언어가 새 도구와 문서의 지원 범위를 정한다. 이동을 받쳐 주는 것은 기존 언어와의 상호운용이다. Kotlin은 Java 코드를 호출하고 Java에서도 호출되도록 설계돼 프로젝트에 원하는 만큼만 넣을 수 있고, Apple도 Objective-C 앱을 한 번에 다시 쓰지 않고 클래스 단위로 Swift로 옮기는 방법을 안내한다.

## 메모리 안전성 권고

메모리 안전성은 보안 기관의 지침에서도 언어 선택 기준으로 다뤄진다.

- 2023년 12월 미국 CISA, NSA, FBI와 호주, 캐나다, 영국, 뉴질랜드 사이버보안 기관이 함께 낸 The Case for Memory Safe Roadmaps는 C와 C++를 메모리 안전하지 않은 언어의 예로, C#, Go, Java, Python, Rust, Swift를 메모리 안전 언어의 예로 든다. 개발자 교육은 결함을 줄여도 없애지 못하므로 메모리 안전 언어 같은 기술적 통제로 옮겨 가는 동안의 다리로 본다.
- CISA와 FBI의 Product Security Bad Practices v2.0(2025년 1월)은 쓸 수 있는 메모리 안전 언어가 있는데도 핵심 기반시설이나 국가 핵심 기능(NCF)에 쓰일 새 제품군을 C나 C++ 같은 메모리 안전하지 않은 언어로 개발하는 것을 위험한 관행으로 꼽는다. 기존 제품에는 2025년 말까지 메모리 안전 로드맵을 공개하라고 권고하되, 2030년 1월 1일 이전 지원 종료를 발표한 제품은 제외한다. 자발적이고 구속력 없는 지침이다.
- 같은 문서는 새 코드 구성요소부터 메모리 안전 언어로 쓰면서 하드웨어나 컴파일러 통제를 함께 두고, 암호 연산처럼 위험이 큰 구성요소를 차츰 다시 쓰는 경로를 예로 든다. 2025년 6월 CISA는 NSA와의 공동 가이드를 내며 메모리 안전 언어 도입을 이 결함 유형의 가장 포괄적인 완화책으로 설명했다.
- 메모리 안전 언어도 C, C++ 라이브러리를 호출하는 혼합 구조가 한동안 남고, 데이터가 그 경계를 넘을 때는 보장이 제한된다. Rust의 `unsafe`처럼 보호를 우회하는 수단도 있다([[Nodejs-Native-Addons|Node.js Native Addons]]).

## 언어 교체로 얻는 속도의 상한

- 같은 부하에서 한 요청의 지연을 비교할 때, 절반이 그대로 남는 DB 대기라면 나머지를 아무리 빠르게 해도 2배를 넘지 못한다([[Cache-Locality#암달의 법칙 (부분 개선의 상한)|암달의 법칙]]). 이 상한은 요청당 CPU 시간이나 서버 비용의 상한이 아니다. CPU 사용량을 줄이면 DB 대기 비중이 커도 처리량과 비용을 개선할 수 있고, 실제 병목은 부하별로 잰다([[CPU-Bound-Vs-IO-Bound#웹 서버 — I/O 대기가 큰 경우가 많다|웹 서버의 I/O 대기]], [[Latency-Optimization|레이턴시 최적화]]).
- 느린 언어의 무거운 계산은 이미 네이티브 라이브러리가 맡는 경우가 많다(위 데이터와 AI 항목의 NumPy). 마크다운 렌더링에 쓰는 cmark-gfm도 C로 작성한 CommonMark 파싱과 렌더링 라이브러리라, 호출하는 쪽의 언어를 바꿔도 이 구간은 거의 줄지 않는다.
- 같은 CPU 작업에서도 자료구조가 언어보다 큰 차이를 낼 수 있다. 2018년 statemap 렌더러를 Rust로 단순하게 다시 쓴 구현이 신중하게 짠 C 구현보다 약 32% 빨랐는데, 측정에서 차이의 큰 몫은 C의 AVL 트리와 Rust 표준 라이브러리 `BTreeSet`(B-tree)의 캐시 동작 차이였다. 같은 분석은 C에서는 침투형(intrusive) AVL 트리가 쉽고 B-tree는 어렵다는 점을 들어 언어가 손쉬운 설계를 바꾼다고도 짚는다. 한 프로그램의 측정이므로 C와 Rust의 일반적 성능 비교로 쓰지 않는다.
- 실무 경험에서 나온 권고는 프로파일로 핫스팟을 찾고 일을 줄이는 재설계를 먼저 보는 것이다. 느린 외부 호출 캐시, 요청 경로 밖의 백그라운드 처리, 독립 작업의 병렬화, N+1 쿼리를 하나로 합치기, 느린 쿼리 교체, 현재 페이지에 필요 없는 데이터 조회 생략은 언어와 무관하다. 재설계로도 줄지 않는 CPU 핫스팟만 빠른 언어로 옮기고, 이식성이나 유지보수처럼 속도 외의 이유로 언어를 바꾸는 판단은 따로 한다.

## 흔한 오해

- 언어 자체를 인터프리터 언어나 컴파일 언어로 고정한다. 실행 방식은 구현체와 배포 설정이 정한다.
- TypeScript 타입이 런타임 입력을 막는다고 본다. 타입은 컴파일 뒤 지워진다.
- GC 언어에는 메모리 누수가 없다고 본다. 도달 가능한 참조를 계속 붙잡으면 회수되지 않는다.
- Rust 코드면 메모리 문제가 모두 사라진다고 본다. `unsafe` 코드와 C 라이브러리 경계의 정확성은 프로그래머가 책임지고, 누수 방지는 보장하지 않는다.
- 메모리 안전 언어로 바꾸면 보안 문제가 끝난다고 본다. 줄어드는 것은 메모리 안전 결함 유형이고, SQL 삽입 같은 결함은 따로 막는다.

## 판단 질문

- 실행 환경(브라우저, 게임 엔진, 확장할 제품)이 언어를 이미 정했는가
- 병목이 계산인가 대기인가. 계산이면 실행 경로와 네이티브 라이브러리 활용이 중요해진다. 지연 때문에 다시 쓰려면 바뀌는 구간의 시간 비중을, 비용 때문이면 요청당 CPU 시간과 목표 부하의 처리량을 잰다
- GC가 쓰는 CPU와 메모리, GC가 정하는 회수 시점을 감당할 수 있는가, 아니면 정해진 지점의 해제가 필요한가
- 네트워크 입력 처리나 암호 연산처럼 메모리 안전 결함이 치명적인 구성요소가 있는가, 새 구성요소를 메모리 안전 언어로 시작할 수 있는가
- 오류를 작성 중, 빌드, 실행 중 언제 찾아야 하고, 외부 입력의 런타임 검증은 어느 경계에서 하는가
- 배포 단위가 단일 바이너리인가, 런타임 설치나 bytecode 캐시 관리가 필요한가
- 기존 코드베이스를 유지한 채 언어를 옮겨야 하는가. 기존 언어와 상호운용되면 새 코드부터 바꿀 수 있지만, 경계를 넘는 값에는 새 언어의 보장이 약해진다
- 팀이 그 언어의 코드를 읽고 리뷰할 수 있는가. AI가 생성한 코드도 계획과 검증 게이트에서 읽고 판단할 수 있어야 한다([[Harness-Adoption-Ladder|하네스 도입 계단]])

## 출처

- [Every Programming Language Explained in 16 Minutes — Just Explained](https://www.youtube.com/watch?v=uerEG_yigco) — 2026-08-08 업로드, 언어 개관의 출발점이며 연도, 실행 방식, 메모리 관리와 사용처는 아래 1차 출처로 다시 확인함
- [Every Programming Language Explained in 20 Minutes (Part 2) — Just Explained](https://www.youtube.com/watch?v=rQdgPLHE_cg) — 2026-09-13 업로드, 2부 언어 개관의 출발점이며 연도, 설계 목적, 메모리 관리와 상호운용은 아래 1차 출처로 다시 확인함
- [The Development of the C Language — Dennis M. Ritchie](https://www.nokia.com/bell-labs/about/dennis-m-ritchie/chist.html)
- [Bjarne Stroustrup's FAQ — Bjarne Stroustrup](https://www.stroustrup.com/bs_faq.html)
- [The History of FORTRAN I, II, and III — John Backus](https://doi.org/10.1145/960118.808380)
- [CODASYL COBOL Journal of Development 1968 — National Bureau of Standards](https://nvlpubs.nist.gov/nistpubs/Legacy/hb/nbshandbook106.pdf)
- [The Case for Memory Safe Roadmaps — CISA, NSA, FBI 외 공동 기관](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps)
- [Product Security Bad Practices v2.0 — CISA, FBI](https://www.cisa.gov/resources-tools/resources/product-security-bad-practices)
- [New Guidance Released for Reducing Memory-Related Vulnerabilities — CISA](https://www.cisa.gov/news-events/alerts/2025/06/24/new-guidance-released-reducing-memory-related-vulnerabilities)
- [kubernetes/kubernetes — GitHub](https://github.com/kubernetes/kubernetes) — 2026-10-12 언어 통계 기준 Go 약 98%
- [moby/moby — GitHub](https://github.com/moby/moby) — 2026-10-12 언어 통계 기준 Go 약 97%
- [Oracle, JVM Specification Java SE 27, Introduction](https://docs.oracle.com/javase/specs/jvms/se27/html/jvms-1.html)
- [Oracle, JVM Specification Java SE 27, Heap](https://docs.oracle.com/javase/specs/jvms/se27/html/jvms-2.html#jvms-2.5.3)
- [Oracle, Java Language Specification Java SE 27, Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se27/html/jls-4.html)
- [Microsoft Learn, A tour of the C# language](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/overview)
- [Microsoft Learn, What is managed code?](https://learn.microsoft.com/en-us/dotnet/standard/managed-code)
- [Microsoft Learn, Native AOT deployment overview](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [Ecma International, ECMA-262 17th edition (ECMAScript 2026)](https://262.ecma-international.org/17.0/)
- [TypeScript Handbook, TypeScript for the New Programmer](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- [Python, History and License](https://docs.python.org/3/license.html)
- [Python, General Python FAQ](https://docs.python.org/3/faq/general.html)
- [Python, Glossary](https://docs.python.org/3/glossary.html)
- [Python, PEP 20 The Zen of Python](https://peps.python.org/pep-0020/)
- [Perl Documentation, perl](https://perldoc.perl.org/perl)
- [PHP Manual, History of PHP](https://www.php.net/manual/en/history.php.php)
- [PHP Manual, Introduction](https://www.php.net/manual/en/introduction.php)
- [PHP Manual, OPcache](https://www.php.net/manual/en/book.opcache.php)
- [PHP Manual, Type declarations](https://www.php.net/manual/en/language.types.declarations.php)
- [PHP Manual, Type Juggling](https://www.php.net/manual/en/language.types.type-juggling.php)
- [Go, Frequently Asked Questions](https://go.dev/doc/faq)
- [Go, The Go Programming Language Specification](https://go.dev/ref/spec)
- [Go, A Guide to the Go Garbage Collector](https://go.dev/doc/gc-guide)
- [Go, Effective Go](https://go.dev/doc/effective_go)
- [The Rust Programming Language, Hello, World!](https://doc.rust-lang.org/book/ch01-02-hello-world.html)
- [The Rust Programming Language, What Is Ownership?](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html)
- [The Rust Programming Language, References and Borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
- [The Rust Programming Language, Reference Cycles Can Leak Memory](https://doc.rust-lang.org/book/ch15-06-reference-cycles.html)
- [The Rust Programming Language, Unsafe Rust](https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html)
- [C++ Core Guidelines, R.1 and R.11](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [MDN, Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [WHATWG, HTML Living Standard, Introduction](https://html.spec.whatwg.org/multipage/introduction.html)
- [WHATWG, HTML Living Standard, Scripting](https://html.spec.whatwg.org/multipage/scripting.html)
- [W3C, CSS 2.1 Specification](https://www.w3.org/TR/CSS2/)
- [Unity Manual, Introduction to programming in Unity](https://docs.unity.com/en-us/engine/6000.6/manual/scripting/get-started/intro-to)
- [Unreal Engine 5.8 Documentation, Programming with C++](https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine)
- [WordPress Developer Resources, Plugin Handbook Introduction](https://developer.wordpress.org/plugins/intro/)
- [NumPy, What is NumPy?](https://numpy.org/doc/stable/user/whatisnumpy.html)
- [Android Developers, Android's Kotlin-first approach](https://developer.android.com/kotlin/first)
- [Kotlin Documentation, FAQ](https://kotlinlang.org/docs/faq.html)
- [Kotlin Documentation, Null safety](https://kotlinlang.org/docs/null-safety.html)
- [Kotlin Documentation, Calling Java from Kotlin](https://kotlinlang.org/docs/java-interop.html)
- [The Swift Programming Language, The Basics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/)
- [The Swift Programming Language, Automatic Reference Counting](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/)
- [Apple Developer Documentation, Migrating Your Objective-C Code to Swift](https://developer.apple.com/documentation/swift/migrating-your-objective-c-code-to-swift)
- [Lua 5.4 Reference Manual, Introduction](https://www.lua.org/manual/5.4/manual.html#1)
- [Redis Documentation, Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [PostgreSQL 18 Documentation, Planner/Optimizer](https://www.postgresql.org/docs/18/planner-optimizer.html)
- [Small Programs and Languages — ratfactor, Dave Gauer](https://ratfactor.com/cards/pl-small) — 2026-07-28 게시, 2026-10-28 대조. 작은 구현의 학습 가치와 언어 크기의 관점이며 최소 복잡도의 수학적 증명은 아님
- [Software is slow because of bad design, not slow languages — Sean Goedecke](https://seangoedecke.com/software-is-slow-because-of-bad-design-not-slow-languages/) — 2026-10-23 게시. 2배 상한 예시와 재설계 목록의 출발점이며, CRUD의 I/O 비중은 저자 경험에 근거한 주장이고 게시 뒤 덧붙인 반론 요약을 함께 확인함
- [Falling in love with Rust — Bryan Cantrill](https://bcantrill.dtrace.org/2018/09/18/falling-in-love-with-rust/)
- [The relative performance of C and Rust — Bryan Cantrill](https://bcantrill.dtrace.org/2018/09/28/the-relative-performance-of-c-and-rust/)
- [github/cmark-gfm — GitHub](https://github.com/github/cmark-gfm)
- [소프트웨어가 느린 이유는 느린 언어가 아니라 나쁜 설계 때문이다 — GeekNews](https://news.hada.io/topic?id=35893) — 2026-10-24 소개 글, 원문 식별에 사용

## 관련 문서

- [[Compile-and-Runtime|컴파일과 런타임]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
- [[Stack-vs-Heap|스택 vs 힙]]
- [[V8|V8 엔진]]
- [[타입스크립트(TS)|TypeScript]]
- [[WebAssembly]]
- [[Harness-Adoption-Ladder|하네스 도입 계단]]
- [[Declarative-Programming|선언형 프로그래밍]]
- [[Execution-Plan-Basics|실행 계획 기본]]
- [[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions]]
- [[Payment-System-Principles|결제 시스템 원칙]]

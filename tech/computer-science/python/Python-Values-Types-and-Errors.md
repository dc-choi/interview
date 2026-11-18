---
tags: [python, cpython, dynamic-typing, numbers, strings, exceptions, collections]
status: done
verified_at: 2026-11-18
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Python Values, Types and Errors", "Python 값, 타입과 예외", "Python 기본기", "C와 비교한 Python", "EAFP와 LBYL"]
---

# Python 값, 타입과 예외

C에서 Python으로 옮길 때 자주 틀리는 지점은 문법보다 값과 오류를 다루는 계약이다. 아래 동작은 Python 3.15.2 공식 문서와 대조하고 로컬 CPython 3.14.8에서 실행해 확인했다(2026-11-18). 반복문과 함수 정의는 [[Python-Iteration-and-Functions|Python 반복문과 함수]], 모듈과 파일은 [[Python-Modules-and-File-IO|Python 모듈, 명령행과 파일 입출력]]에 나눴다.

## 실행 모델

- `python3 hello.py`는 별도 빌드 없이 실행한다. CPython은 소스를 바이트코드로 컴파일해 가상 머신에서 실행하므로 소스 글자를 한 줄씩 해석하는 방식이 아니다([[Compile-and-Runtime#AOT, interpreter와 JIT|AOT, interpreter와 JIT]]).
- 바이트코드 캐시(`__pycache__/모듈명.cpython-314.pyc`)는 import한 모듈에만 남는다. 명령행에서 직접 실행한 파일은 매번 다시 컴파일하고 결과를 저장하지 않는다. `.pyc`가 줄이는 것은 로딩 시간이지 실행 시간이 아니다.
- 블록은 중괄호가 아니라 들여쓰기로 정한다. 줄 앞 공백으로 들여쓰기 수준을 계산하고 그 수준이 문장의 묶음을 정한다. PEP 8은 한 수준에 공백 4칸을 권한다. 문장 끝에 세미콜론이 필요 없고 주석은 `#`으로 시작한다.
- 조건을 괄호로 감쌀 필요 없이 끝에 콜론을 붙이고, `else if`는 `elif`, `&&`, `||`, `!`는 키워드 `and`, `or`, `not`, 참과 거짓은 대문자로 시작하는 `True`, `False`로 쓴다.
- `main()`을 자동으로 부르지 않는다. 파일의 최상위 문장이 위에서 아래로 실행된다.

## 이름에는 타입이 없다

변수 선언과 타입 표기가 없다. 이름은 객체를 가리키고 타입은 객체가 가진다. 같은 이름에 다른 타입의 값을 다시 묶을 수 있지만, 타입이 다른 값을 암묵적으로 섞지는 않는다([[Programming-Language-Landscape#타입 검사 시점|타입 검사 시점]]).

```python
answer = "42"                 # input()도 언제나 str을 돌려준다
assert int(answer) + 1 == 43  # 변환은 직접 한다
try:
    answer + 1
except TypeError as error:
    assert str(error) == 'can only concatenate str (not "int") to str'
```

- `int("42")`는 C의 캐스트가 아니라 문자열을 해석하는 변환이다. 앞뒤 공백, 부호와 숫자 사이 밑줄은 받고(`int(" -12_345\n") == -12345`), `"3.5"`와 `"cat"`은 `ValueError: invalid literal for int() with base 10`으로 거부한다. float를 int로 바꾸면 소수부를 버린다(`int(-3.5) == -3`).
- `char` 타입이 없다. 한 글자도 길이 1인 `str`이고, 작은따옴표와 큰따옴표는 같은 문자열을 만든다. PEP 8은 둘 중 어느 쪽도 권하지 않고 하나를 정해 일관되게 쓰라고 하며, 문자열 안에 따옴표가 있으면 백슬래시를 피하도록 다른 쪽 따옴표를 쓰라고 한다.
- 이름은 객체를 가리킬 뿐이고 C의 포인터 타입이나 주소 연산은 없다.
- `if`, `for`, `while`은 새 스코프를 만들지 않는다. 이름의 범위를 정하는 블록은 모듈, 함수 본문, 클래스 정의라서 반복문 안에서 대입한 이름도 반복문이 끝난 뒤 같은 함수에서 쓸 수 있다. 어디에도 없는 이름은 `NameError`, 함수 안에서 대입하기 전에 읽은 지역 이름은 `UnboundLocalError`다.

## 숫자: 정수는 넘치지 않고 실수는 근사값이다

| 계산 | C `int` | Python |
|---|---|---|
| `7 / 2` | `3` | `3.5`. 정수끼리 나눠도 `/`는 float |
| `-7 / 2` | `-3` (0 쪽으로 버림) | `-3.5` |
| `-7 // 2` | 해당 연산자 없음 | `-4` (음의 무한대 쪽으로 내림) |
| `-7 % 2` | `-1` | `1` (나누는 수의 부호를 따름) |
| 2의 100제곱 | 범위 초과, signed overflow는 정의되지 않은 동작 | `2 ** 100`은 정확한 31자리 정수 |

- `//`와 `%`는 `x == (x // y) * y + x % y`를 지킨다. `//`를 C 정수 나눗셈의 대체로 쓰면 음수에서 결과가 달라진다. C 쪽 규칙은 [[C-Types-Control-Flow-and-Functions#연산자|C 연산자]]에 있다.
- 정수는 정밀도 제한이 없어 C의 정수 overflow가 생기지 않는다.
- float는 거의 모든 플랫폼에서 IEEE 754 binary64(C의 `double`)다. `0.1 + 0.2 == 0.3`은 거짓이고, `f"{1/3:.50f}"`처럼 자릿수를 늘려 찍으면 2진 근사값의 꼬리(`0.33333333333333331482...`)가 보인다. 원리는 [[C-Types-Control-Flow-and-Functions#값의 범위와 정밀도|C 값의 범위와 정밀도]]와 같다.
- 근사 비교는 `math.isclose()`, 10진 정확성이 필요한 금액은 문자열로 만든 `decimal.Decimal`, 유리수는 `fractions.Fraction`을 쓴다. `Decimal(0.1)`은 이미 오차가 섞인 float를 그대로 옮긴다.

```python
import math
from decimal import Decimal
from fractions import Fraction

assert 0.1 + 0.2 != 0.3 and math.isclose(0.1 + 0.2, 0.3)
assert Decimal("0.1") + Decimal("0.2") == Decimal("0.3")
assert Decimal(0.1) != Decimal("0.1")
assert Fraction(1, 3) * 3 == 1
```

## 문자열은 바꿀 수 없는 객체다

- `str`은 유니코드 코드 포인트의 불변 시퀀스다. `s.upper()`, `s.lower()`, `s.capitalize()`는 원본을 고치지 않고 새 문자열을 돌려주며, `s[0] = "C"`는 `TypeError`다.
- C의 `toupper(c)`처럼 함수에 값을 넘기는 대신 값에 딸린 메서드를 `s.upper()`처럼 점으로 부르고, 문자를 하나씩 돌지 않고 문자열 전체에 적용한다.
- `==`는 내용을 비교한다. C에서 `strcmp()`가 필요했던 비교가 연산자 하나로 된다. `is`는 두 피연산자가 같은 객체인지 보는 연산이라 문자열 비교에 쓰지 않는다. Python 3.8부터 문자열이나 숫자 리터럴에 `is`를 쓰면 `SyntaxWarning`이 난다. CPython에서 우연히 맞을 수 있어도 언어가 보장하지 않기 때문이다.
- `+`는 문자열끼리만 잇고 `"?" * 4`는 반복이다. f-string은 접두사 `f`가 있어야 중괄호 안을 값으로 바꾸고, `f"{z:.2f}"`처럼 콜론 뒤에 형식 지정자를 붙인다.

## 예외: 결과와 실패 신호를 분리한다

C 함수는 `NULL`이나 `-1` 같은 특별한 반환값으로 실패를 알리므로 그 값을 정상 결과로 쓸 수 없고 호출자가 매번 검사해야 한다. Python은 실패를 예외로 따로 전달한다.

```python
def get_int(prompt):
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            pass  # 정수가 아니면 다시 묻는다
```

- `try` 절에서 예외가 나면 남은 문장을 건너뛰고 타입이 맞는 `except` 절을 실행한다. 맞는 절이 없으면 바깥 `try`로 전파되고, 끝내 처리되지 않으면 traceback을 출력하고 멈춘다.
- 보호할 문장만 `try`에 두고 성공한 뒤의 일은 `else` 절에 둔다. `try`를 넓히면 보호하려던 문장이 아닌 곳의 예외까지 잡는다. `finally`는 예외 여부와 관계없이 마지막에 실행된다.
- 잡을 예외는 구체적으로 적는다. `except Exception`은 거의 모든 예외를 잡지만 `sys.exit()`가 일으키는 `SystemExit`와 Ctrl+C의 `KeyboardInterrupt`는 `Exception`이 아닌 `BaseException`의 하위라 잡지 않는다.
- traceback은 마지막 줄에 예외 타입과 메시지가 있고, 그 위에 예외가 난 지점까지의 호출 경로가 가장 최근 호출이 아래로 오게(`most recent call last`) 나열된다.

| 예외 | 흔한 원인 |
|---|---|
| `NameError` | 정의되기 전의 함수나 오타 난 이름을 사용 |
| `TypeError` | 지원하지 않는 타입 조합(`"1" + 2`) |
| `ValueError` | 타입은 맞지만 값이 맞지 않음(`int("cat")`) |
| `KeyError` | dict에 없는 key를 `d[key]`로 조회 |
| `ModuleNotFoundError` | 설치하지 않았거나 다른 환경에 설치한 모듈을 import |

### 먼저 검사할지, 시도하고 처리할지

조건을 `if`로 먼저 확인하는 방식을 LBYL, 일단 시도하고 예외를 처리하는 방식을 EAFP라 한다. 정수 입력 검증에서는 EAFP가 더 정확하다. `str.isnumeric()`과 `isdigit()`은 유니코드 숫자 속성을 보는 메서드라 `int()`가 받는 문자열과 범위가 다르다.

| 입력 | `isnumeric()` | `isdigit()` | `int()` |
|---|---|---|---|
| `"42"` | True | True | `42` |
| `"-5"` | False | False | `-5` |
| `" 42"` | False | False | `42` |
| `"½"` | True | False | `ValueError` |
| `"²"` | True | True | `ValueError` |
| `"٣"` (아랍-인도 숫자 3) | True | True | `3` |

결국 `int()`로 쓸 값이면 `int()`를 시도하고 `ValueError`를 처리한다. 공식 용어집은 여러 스레드가 같은 dict를 바꾸는 환경에서 `if key in mapping:` 검사와 조회 사이에 key가 지워질 수 있다는 LBYL의 경쟁 조건도 지적한다.

## 컬렉션 선택

| 타입 | 성질 | 주의 |
|---|---|---|
| `list` | 순서가 있고 바꿀 수 있다. `append()`로 늘린다 | CPython 구현은 연결 리스트가 아니라 참조의 가변 길이 배열이다([[Linear-Data-Structures-Array#Array와 dynamic array|dynamic array]]). `x in list`는 원소를 차례로 비교한다 |
| `tuple` | 순서가 있고 바꿀 수 없다 | 좌표처럼 묶음 자체가 값일 때 쓴다 |
| `dict` | key와 value의 대응. CPython은 해시 테이블로 구현한다([[Hash-Table|해시 테이블]]) | 3.7부터 삽입 순서를 보장한다. 없는 key의 `d[key]`는 `KeyError`, `key in d`는 key만 검사한다 |
| `set` | 중복 없는 hashable 객체의 모음 | 순서를 보장하지 않는다. 공식 문서가 꼽는 대표 용도가 소속 검사와 중복 제거다 |
| `range` | 시작, 끝, 간격만 저장하는 불변 시퀀스 | 범위가 커져도 메모리 사용량이 같다 |

```python
from collections import Counter

votes = ["Python", "C", "Python", "Scratch", "Python", "C"]
counts = {}
for vote in votes:
    counts[vote] = counts.get(vote, 0) + 1  # 처음 보는 key는 0에서 시작

assert counts == {"Python": 3, "C": 2, "Scratch": 1}
assert sorted(counts) == ["C", "Python", "Scratch"]
assert sorted(counts, key=counts.get, reverse=True) == ["Python", "C", "Scratch"]
assert Counter(votes).most_common(1) == [("Python", 3)]
```

- `counts[vote] += 1`만 쓰면 처음 보는 key에서 `KeyError`가 난다. `in` 검사(LBYL), `try`와 `except KeyError`(EAFP), `dict.get(key, 0)`, `collections.Counter`가 모두 같은 문제를 푼다.
- `sorted(dict)`는 key를 정렬한 새 list다. 값 기준은 `key=counts.get`, 내림차순은 `reverse=True`로 준다. 정렬은 안정적이라 값이 같은 key는 원래 순서를 유지한다.
- 표 형태 데이터는 행마다 dict를 두고 그 list로 다루는 경우가 많다. `csv.DictReader`가 주는 행이 이 형태다. 한 열의 값으로 자주 찾는다면 그 값을 key로 한 dict를 만들어 매번 list를 훑지 않는다.

## 이해 점검

1. `-7 // 2`와 C의 `-7 / 2`는 왜 결과가 다른가?
2. `"½".isnumeric()`이 참인데 `int("½")`가 실패하는 이유와, 정수 입력을 검증하는 방법은?
3. 같은 목록에 소속 검사를 수만 번 하는 코드에서 list를 set으로 바꾸면 무엇이 달라지는가?

## 출처

- [Python Documentation, Built-in Types](https://docs.python.org/3/library/stdtypes.html)
- [Python Documentation, Built-in Functions](https://docs.python.org/3/library/functions.html)
- [Python Documentation, Expressions](https://docs.python.org/3/reference/expressions.html)
- [Python Documentation, Execution model](https://docs.python.org/3/reference/executionmodel.html)
- [Python Documentation, Lexical analysis](https://docs.python.org/3/reference/lexical_analysis.html)
- [Python Documentation, Errors and Exceptions](https://docs.python.org/3/tutorial/errors.html)
- [Python Documentation, Floating-Point Arithmetic: Issues and Limitations](https://docs.python.org/3/tutorial/floatingpoint.html)
- [Python Documentation, Modules, Compiled Python files](https://docs.python.org/3/tutorial/modules.html#compiled-python-files)
- [Python Documentation, Format Specification Mini-Language](https://docs.python.org/3/library/string.html#formatspec)
- [Python Documentation, collections](https://docs.python.org/3/library/collections.html)
- [Python Documentation, Glossary](https://docs.python.org/3/glossary.html) — EAFP, LBYL
- [Python Documentation, Design and History FAQ](https://docs.python.org/3/faq/design.html) — list와 dict의 CPython 구현
- [Python Documentation, What's New In Python 3.8](https://docs.python.org/3/whatsnew/3.8.html) — 리터럴과 `is`의 SyntaxWarning
- [PEP 8, Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [YouTube, Harvard CS50 (2026), Lecture 6: Python](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=47955s)

## 관련 문서

- [[Python-Iteration-and-Functions|Python 반복문과 함수]]
- [[Python-Modules-and-File-IO|Python 모듈, 명령행과 파일 입출력]]
- [[C-Types-Control-Flow-and-Functions|C 자료형, 제어 흐름과 함수]]
- [[Programming-Language-Landscape|프로그래밍 언어 지형]]
- [[Linear-Data-Structures-List-and-Set|List와 Set]]
- [[CS&프로그래밍(CS&Programming)|CS와 프로그래밍]]

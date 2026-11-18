---
tags: [python, modules, packages, pip, venv, sys, file-io, csv]
status: done
verified_at: 2026-11-18
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Python Modules and File IO", "Python 모듈과 패키지", "Python 파일 입출력", "Python csv 모듈", "sys.argv와 sys.exit"]
---

# Python 모듈, 명령행과 파일 입출력

C의 `#include`, `argc`와 `argv`, `fopen()`과 `fclose()`가 하던 일을 Python은 import, `sys` 모듈과 `with` 문으로 처리한다. Python 3.15.2 공식 문서와 대조하고 로컬 CPython 3.14.8에서 실행해 확인했다(2026-11-18).

## 모듈과 패키지

- 모듈은 정의와 문장을 담은 파일이고 파일 이름에서 `.py`를 뺀 것이 모듈 이름이다. 모듈마다 자기 이름공간이 있다. 패키지는 하위 모듈을 담는 모듈이며, 전통적인 형태는 `__init__.py`가 있는 디렉터리다.
- `import csv`는 모듈 이름을 묶어 `csv.reader`처럼 접근하고, `from sys import argv`는 필요한 이름만 현재 이름공간에 묶는다. C 헤더처럼 선언만 들여오는 것이 아니라 처음 import할 때 모듈의 최상위 문장을 실행한다.
- 표준 라이브러리(`sys`, `csv`, `sqlite3` 등)는 설치 없이 import한다. 제3자 패키지는 공개 저장소 PyPI에서 pip로 설치한다. 설치하지 않았거나 지금 실행하는 인터프리터가 아닌 다른 환경에 설치했다면 `ModuleNotFoundError: No module named ...`가 난다.
- 직접 실행할 때와 import할 때 동작을 나누는 `if __name__ == "__main__":` 관용구는 [[Python-Iteration-and-Functions#정의 시점과 main 관용구|정의 시점과 main 관용구]]에 있다.

## 가상 환경에 설치한다

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows PowerShell은 .venv\Scripts\Activate.ps1
python -m pip install <패키지>
```

- 공식 설치 안내는 `python -m pip install`을 기본 명령으로 쓰고 가상 환경 사용을 권한다. 가상 환경은 프로젝트에 필요한 인터프리터와 라이브러리를 담고, 기본으로 다른 가상 환경과 OS에 설치된 Python의 패키지와 격리된다.
- 활성화는 필수가 아니다. `.venv/bin/python`처럼 그 환경의 인터프리터 경로로 바로 실행해도 된다. `python -m pip`는 그 인터프리터로 pip를 실행하므로 설치 대상 환경이 분명하다.
- OS가 관리하는 Python에 pip로 설치하면 패키지 관리자가 쓰는 구성 요소를 바꿀 수 있다. PEP 668은 배포자가 표준 라이브러리 디렉터리에 `EXTERNALLY-MANAGED` 표식 파일을 두면 pip 같은 도구가 그 환경에 기본으로 설치하지 않고 가상 환경을 안내하게 한다. 로컬 Homebrew Python 3.14에도 이 파일이 있었다(2026-11-18 확인).
- 의존 목록을 `requirements.txt`로 남기는 예는 [[Python-Flask-Web#구조와 실행|Flask 구조와 실행]]에 있다.

## 명령행 인자와 종료 코드

```python
import sys

if len(sys.argv) != 2:
    sys.exit("usage: python greet.py NAME")  # stderr에 쓰고 종료 코드 1
print(f"hello, {sys.argv[1]}")
```

- `sys.argv`는 명령행 인자의 list이고 `argv[0]`은 스크립트 이름이다. `python3 greet.py world`의 `sys.argv`는 `['greet.py', 'world']`라서 인터프리터 이름은 세지 않는다. C의 `argc`는 `len(sys.argv)`로 대신한다.
- `sys.exit(0)`은 성공, 0이 아닌 정수는 실패다. 대부분의 시스템은 0부터 127까지만 정의한다. 정수가 아닌 객체를 넘기면 stderr에 출력하고 종료 코드 1로 끝나며, `None`은 0과 같다.
- `sys.exit()`는 `SystemExit` 예외를 일으킨다. 그래서 `finally` 절이 실행되고, `except Exception`은 이 예외를 잡지 않는다. 바깥 코드가 `SystemExit`를 직접 잡으면 종료를 막을 수 있다.

## 파일은 with로 연다

```python
with open("favorites.csv", "a", newline="", encoding="utf-8") as file:
    ...  # 블록을 벗어나면 예외가 나도 닫힌다
```

- `with` 블록을 벗어나면 정상 종료든 예외든 파일이 닫힌다. C에서 `fopen()`마다 `fclose()`를 짝지어야 했던 일을 문법이 맡는다([[C-Standard-IO-and-Files#파일 쓰기|C 파일 쓰기]]).
- mode는 `"r"`(기본, 읽기), `"w"`(내용을 비우고 쓰기), `"a"`(끝에 덧붙이기), `"x"`(파일이 이미 있으면 실패하는 새로 만들기)이고, `"b"`는 바이너리, `"t"`는 텍스트(기본)다.
- `encoding`을 생략한 텍스트 모드는 3.15부터 UTF-8, 이전 버전은 플랫폼의 locale 인코딩이 기본이다. 여러 버전에서 돌릴 코드는 `encoding="utf-8"`을 적는다([[Python-315-Language-Changes|Python 3.15 변경]]).

## csv 모듈

값에 쉼표나 큰따옴표가 섞이면 문자열을 직접 이어 붙인 CSV는 열이 어긋난다. `csv` 모듈은 이런 값을 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓴다.

```python
import csv

with open("favorites.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=["language", "problem"])
    writer.writeheader()
    writer.writerow({"language": "C", "problem": "Hello, World"})

with open("favorites.csv", newline="", encoding="utf-8") as file:
    rows = list(csv.DictReader(file))

assert rows == [{"language": "C", "problem": "Hello, World"}]
```

파일에는 `language,problem`과 `C,"Hello, World"` 두 줄이 기본 dialect `excel`의 줄 끝 `\r\n`으로 저장된다.

- `csv.reader`는 행마다 문자열 list를 돌려주고 타입을 바꾸지 않는다. 숫자 열은 `int()`나 `float()`로 바꾼 뒤 비교하고 정렬한다. 문자열 그대로 정렬하면 `"10"`이 `"9"`보다 앞에 온다.
- reader는 읽은 위치를 기억하는 반복자라 `next(reader)`로 헤더 한 행을 넘기면 이어지는 `for`는 둘째 행부터 받는다.
- `csv.DictReader`는 첫 행을 필드 이름으로 쓰고 결과에서 뺀다. 열을 위치가 아니라 이름으로 읽으므로 스프레드시트에서 열 순서를 바꿔도 코드가 깨지지 않는다.
- `csv.DictWriter`는 `fieldnames`가 필수다. 헤더는 `writeheader()`로 한 번만 쓰고, 덧붙이기 모드로 여러 번 실행하는 프로그램은 헤더를 미리 쓴 파일에 행만 추가한다. `fieldnames`에 없는 key를 넘기면 기본값 `extrasaction="raise"`에 따라 `ValueError`가 난다.
- 파일은 `newline=""`로 연다. 생략하면 따옴표 안의 줄바꿈을 잘못 해석하고, `\r\n`을 쓰는 플랫폼에서는 쓸 때 `\r`이 하나 더 붙는다.
- 열별 개수 세기와 정렬이 늘어나면 CSV를 DB로 옮겨 SQL로 묻는 편이 짧다([[SQLite-Fundamentals#CSV에서 SQL로|CSV에서 SQL로]]).

## 이해 점검

1. `python3 greet.py world`에서 `len(sys.argv)`가 2인 이유와, 인자가 없을 때 종료 코드 1로 끝내는 한 줄은?
2. `except Exception:`으로 감싼 코드 안의 `sys.exit(2)`는 왜 프로그램을 끝내는가?
3. CSV를 `csv.reader`로 읽어 점수를 정렬했더니 10이 9보다 앞에 왔다. 원인과 고칠 위치는?

## 출처

- [Python Documentation, Modules](https://docs.python.org/3/tutorial/modules.html)
- [Python Documentation, Glossary](https://docs.python.org/3/glossary.html) — module, package, regular package
- [Python Documentation, Installing Python Modules](https://docs.python.org/3/installing/index.html)
- [Python Documentation, venv](https://docs.python.org/3/library/venv.html)
- [Python Documentation, sys](https://docs.python.org/3/library/sys.html)
- [Python Documentation, Built-in Functions](https://docs.python.org/3/library/functions.html#open) — `open()`의 mode와 기본 인코딩
- [Python Documentation, csv](https://docs.python.org/3/library/csv.html)
- [PEP 668, Marking Python base environments as “externally managed”](https://peps.python.org/pep-0668/)
- [YouTube, Harvard CS50 (2026), Lecture 6: Python](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=47955s)
- [YouTube, Harvard CS50 (2026), Lecture 7: SQL](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=56926s)

## 관련 문서

- [[Python-Values-Types-and-Errors|Python 값, 타입과 예외]]
- [[Python-Iteration-and-Functions|Python 반복문과 함수]]
- [[C-Standard-IO-and-Files|C 표준 입출력과 파일]]
- [[SQLite-Fundamentals|SQLite 기본기]]
- [[Python-315-Language-Changes|Python 3.15 변경]]
- [[CS&프로그래밍(CS&Programming)|CS와 프로그래밍]]

---
tags: [python, iteration, functions, programming]
status: done
verified_at: 2026-10-09
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Python Iteration and Functions", "Python 반복문과 함수"]
---

# Python 반복문과 함수

반복문은 여러 항목에 같은 작업을 적용하고, 함수는 입력과 결과의 계약을 가진 작업을 이름으로 묶는다. Python 3 공식 문서를 기준으로 데이터 처리에 필요한 기본 동작을 정리한다.

## 값을 순서대로 처리하는 for

`for item in items:`는 반복 가능한 객체에서 값을 하나씩 받는다. 콜론 뒤의 들여쓴 블록이 반복할 작업이다. 목록의 값을 읽는 목적이라면 인덱스를 따로 만들 필요가 없다.

```python
amounts = [2, 4, 6]
doubled = []
for amount in amounts:
    doubled.append(amount * 2)

assert doubled == [4, 8, 12]
assert amounts == [2, 4, 6]
```

순회 중인 컬렉션의 항목을 추가하거나 삭제하면 처리 대상을 추적하기 어려워진다. 원본을 유지해야 하면 위처럼 새 결과 컬렉션을 만든다.

## range의 끝값과 enumerate의 순번

`range(stop)`은 0부터, `range(start, stop, step)`은 지정한 시작과 간격으로 정수를 제공한다. 끝값은 포함하지 않는다. `range`는 정수 목록 전체를 미리 만드는 `list`와 다르다.

```python
assert list(range(5)) == [0, 1, 2, 3, 4]
assert list(range(5, 10)) == [5, 6, 7, 8, 9]
assert list(range(5, 0, -2)) == [5, 3, 1]
assert list(range(0)) == []
```

순번과 값이 함께 필요하면 `enumerate()`를 쓴다. 순번은 기본 0부터 시작하며 `start`로 바꿀 수 있다. `start=1`은 표시용 번호를 바꿀 뿐 원본 목록의 인덱스를 바꾸지 않는다.

```python
columns = ["product", "quantity"]
assert list(enumerate(columns)) == [(0, "product"), (1, "quantity")]
assert list(enumerate(columns, start=1)) == [(1, "product"), (2, "quantity")]
```

## print와 return의 차이

`def`로 함수를 정의하고 `함수명(인자)`로 호출한다. 함수 이름만 적는 것은 호출이 아니다. `print`는 출력하고 `return`은 호출자에게 값을 돌려준다. `return` 없이 끝나거나 값 없이 `return`하면 반환값은 `None`이다.

```python
def show_sum(left, right):
    print(left + right)

def add(left, right):
    return left + right

assert show_sum(2, 3) is None  # 화면에는 5가 출력된다.
assert add(2, 3) == 5
```

다음 계산에 쓸 결과라면 출력만 하지 말고 반환한다. 화면에 숫자가 보였다는 이유로 반환값까지 그 숫자라고 판단하지 않는다.

## 여러 결과와 빈 입력의 계약

`return low, high`는 두 값을 담은 튜플 하나를 반환한다. `low, high = result`는 그 튜플을 풀어 받는 대입이다.

아래 함수의 입력은 유한한 숫자들로 이루어진 리스트다. 빈 리스트에서는 최소값과 최대값을 정의하지 않으므로 `ValueError`로 거부한다. 평균도 빈 입력을 0으로 취급하지 않는다. 이 오류 정책은 예시에서 선택한 계약이다.

```python
def bounds(values):
    if not values:
        raise ValueError("빈 리스트의 범위는 정의하지 않습니다")
    return min(values), max(values)

def mean(values):
    if not values:
        raise ValueError("빈 리스트의 평균은 정의하지 않습니다")
    return sum(values) / len(values)

low, high = bounds([15, 78, 30])
assert (low, high) == (15, 78)
assert high - low == 63
assert mean([2, 4, 6]) == 4
assert bounds([7]) == (7, 7)

for operation in (bounds, mean):
    try:
        operation([])
    except ValueError:
        pass
    else:
        raise AssertionError("빈 입력을 거부해야 합니다")
```

기본값을 지정하지 않은 `min([])`과 `max([])`도 `ValueError`를 발생시킨다. 내장 함수 이름인 `min`, `max`, `sum`, `list`를 변수나 사용자 함수 이름으로 재사용하면 같은 이름의 내장 함수에 접근하기 어려워지므로 목적을 나타내는 이름을 쓴다.

## 이해 점검

1. `range(2, 7, 2)`의 값과 반복 횟수를 실행 전에 설명할 수 있는가?
2. `show_sum()`의 출력과 반환값은 왜 다른가?
3. 빈 데이터에서 평균 0을 반환하면 실제 평균 0인 데이터와 어떻게 구분할 것인가?

## 출처

- [Python Documentation, More Control Flow Tools](https://docs.python.org/3/tutorial/controlflow.html)
- [Python Documentation, Built-in Functions](https://docs.python.org/3/library/functions.html)
- [Python Documentation, Tuples and Sequences](https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences)

## 관련 문서

- [[CS&프로그래밍(CS&Programming)|CS와 프로그래밍]]

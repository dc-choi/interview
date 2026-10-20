---
tags: [python, tkinter, gui, event-loop]
status: done
verified_at: 2026-10-20
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Python Tkinter GUI", "파이썬 GUI와 이벤트 루프"]
---

# Python Tkinter GUI

`tkinter`는 Python에서 Tcl/Tk를 사용하는 GUI 모듈이다. 배포본에 따라 빠질 수 있는 선택적 모듈이므로 Python 설치만으로 사용 가능하다고 단정하지 않는다.

## 위젯, 배치와 이벤트를 나눈다

`Tk()`가 루트 창을 만들고, `Frame`이 하위 위젯을 묶는다. `Label`은 설명, `Entry`는 입력, `Listbox`는 목록을 표시한다. 위젯을 생성한 뒤 `pack()`이나 `grid()`로 배치하고 `mainloop()`로 이벤트를 처리한다.

버튼의 `command`에는 나중에 호출할 함수를 넘긴다. `command=add_item()`처럼 괄호를 붙이면 버튼 생성 시 함수를 실행하므로 `command=add_item`과 다르다.

```python
import tkinter as tk

root = tk.Tk()
root.title("목록 입력")
root.geometry("400x240")

form = tk.Frame(root)
form.pack(fill="x", padx=12, pady=12)
entry = tk.Entry(form)
entry.pack(side="left", fill="x", expand=True)
items = tk.Listbox(root)
items.pack(fill="both", expand=True, padx=12, pady=12)

def add_item():
    value = entry.get().strip()
    if not value:
        return
    items.insert(tk.END, value)
    entry.delete(0, tk.END)

tk.Button(form, text="추가", command=add_item).pack(side="right")
root.mainloop()
```

이 예제는 메모리상의 목록 입력만 다룬다. DB 저장 성공을 표시하는 예제는 아니다.

## pack의 expand와 fill

| 옵션 | 역할 |
|---|---|
| `side` | `left`, `right`, `top`, `bottom` 중 배치할 변 |
| `expand=True` | 부모의 남는 공간을 배치 영역에 배분 |
| `fill="x"` / `"y"` / `"both"` | 배정된 영역 안에서 위젯을 해당 방향으로 늘림 |
| `padx`, `pady` | 위젯 바깥의 가로, 세로 여백 |

`expand=True`만으로 위젯 자체가 가로 전체를 채우지는 않는다. 남는 공간의 배분과 위젯의 늘어남을 따로 지정한다. `up`과 `down`은 `side`의 유효한 값이 아니다.

## 오래 걸리는 작업과 화면 갱신

이벤트 핸들러가 오래 실행되면 다른 이벤트 처리가 막힌다. 긴 계산은 타이머로 나누거나 별도 작업 스레드로 옮긴다. DB 연동에 적용할 때도 느린 조회를 버튼 콜백에서 끝까지 기다리지 않도록 설계하고, 결과의 성공과 실패를 받은 뒤 화면을 갱신한다. 스레드 간 Tk 호출에는 이벤트 루프와 Tcl/Tk 빌드 조건이 있으므로 임의의 스레드에서 안전하다고 가정하지 않는다.

예제는 공식 API와 문법을 대조했으며 GUI 표시와 DB 연결은 실행 검증하지 않았다.

## 이해 점검

1. `expand=True`와 `fill="x"` 중 하나를 빼면 무엇이 달라지는가?
2. 버튼 콜백에 느린 DB 조회를 넣으면 다른 클릭 처리가 왜 늦어지는가?

## 출처

- [Python Documentation, tkinter](https://docs.python.org/3/library/tkinter.html)
- [Tcl/Tk 8.6 Manual, pack](https://www.tcl-lang.org/man/tcl8.6/TkCmd/pack.htm)

## 관련 문서

- [[Python-Iteration-and-Functions|Python 반복문과 함수]]
- [[SQL-Fundamentals|SQL 기본기]]

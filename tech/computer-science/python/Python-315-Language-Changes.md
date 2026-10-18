---
tags: [python, lazy-import, immutable, encoding, profiling]
status: done
verified_at: 2026-10-16
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Python 3.15", "Python 3.15 언어 변경"]
---

# Python 3.15: 로딩 시점, 불변 값과 관측

Python 3.15는 2026-10-09 공개된 버전이다. 문법과 내장 타입의 변경, 기본 인코딩, 실행 성능은 각각 다른 호환성 문제를 만든다.

## 지연 임포트의 의미

`lazy import module`은 모듈을 처음 사용하는 시점까지 로딩을 미룬다. 시작할 때 쓰지 않는 의존성의 비용을 줄일 수 있다. 대신 모듈 초기화의 부작용과 임포트 오류도 최초 사용 시점으로 옮겨진다.

로딩 시 등록되는 플러그인이나 초기화에 의존하는 코드는 별도로 검증한다. 지연 임포트는 지원되는 위치와 문법에 제약이 있으므로 기존 임포트를 무차별 치환하지 않는다.

## 불변 매핑과 표식 값

- `frozendict`는 생성 뒤 항목을 바꿀 수 없는 매핑이다. `dict`의 하위 타입이 아니며 키와 값이 hashable일 때 hashable이다. 내부 값의 깊은 불변성을 자동으로 보장하지는 않는다.
- `sentinel`은 값 없음 같은 특별한 상태를 다른 정상 값과 구분하는 표식이다. `None`이 정상 데이터일 때 별도 표식이 유용하다.
- 컴프리헨션은 `*`와 `**` 언패킹을 지원한다. 표현을 짧게 만드는 것과 읽기 쉬운지는 따로 판단한다.

## UTF-8 기본값과 이전

`encoding`을 생략한 파일 I/O의 기본값은 UTF-8이다. 외부 파일 계약이 다른 인코딩이면 명시적으로 지정한다. 이전 Python 버전도 지원한다면 UTF-8 파일에도 `encoding="utf-8"`을 적어 환경 차이를 줄인다.

## 성능과 관측

실험적 JIT의 pyperformance 기하평균 개선은 x86-64 Linux의 표준 인터프리터 대비 7~8%, AArch64 macOS의 꼬리 호출 인터프리터 대비 11~12%다. 비교 기준이 다르며 개별 workload의 개선 보장이 아니다. Tachyon은 실행 중 프로세스를 관측하는 샘플링 프로파일러다.

## 이전 체크포인트

- 시작 시간과 첫 요청 지연을 각각 측정한다.
- 임포트 오류와 초기화 순서 변경을 확인한다.
- 파일 인코딩과 `isinstance(value, dict)` 같은 타입 가정을 점검한다.
- 의존성의 3.15 지원과 네이티브 확장 배포를 확인한다.

2026-10-10 GeekNews 입력의 기능과 성능 비교 조건을 공식 What’s New와 대조했다. 이 저장소의 Python 환경을 업그레이드하거나 예제 실행을 하지는 않았다.

## 출처

- [Python 3.15 Documentation, What’s new in Python 3.15](https://docs.python.org/3.15/whatsnew/3.15.html)
- [PEP 810, Explicit lazy imports](https://peps.python.org/pep-0810/)

## 관련 문서

- [[Python-Iteration-and-Functions|Python 반복문과 함수]]
- [[Compile-and-Runtime|컴파일과 런타임]]

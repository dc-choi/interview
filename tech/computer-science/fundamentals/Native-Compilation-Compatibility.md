---
tags: [compiler, aot, bun, turbopython, compatibility]
status: done
verified_at: 2026-10-16
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Native Compilation Compatibility", "네이티브 컴파일과 호환성", "Bun AOT", "TurboPython"]
---

# 네이티브 컴파일: 배포 단위와 언어 계약

실행 파일을 만든다는 말만으로 소스 전체가 네이티브 명령으로 바뀌었다고 판단할 수 없다. 런타임 패키징, 바이트코드 사전 생성과 네이티브 AOT를 나누어 본다.

## 세 가지 산출물

| 방식 | 빌드에서 하는 일 | 확인할 경계 |
| --- | --- | --- |
| 런타임 포함 실행 파일 | 코드와 실행 엔진을 한 파일로 묶는다 | 엔진 의존성, OS와 ISA |
| 바이트코드 사전 생성 | 파싱과 일부 준비 작업을 빌드로 옮긴다 | VM 버전, 실행 중 JIT |
| 네이티브 AOT | 실행 전에 기계어를 생성한다 | 동적 기능, ABI와 의미 보존 |

## Bun의 구분

Bun 공식 문서의 `bun build --compile`은 번들과 Bun 런타임을 실행 파일에 포함한다. `--bytecode`는 JavaScriptCore 바이트코드를 미리 만든다. 두 옵션을 네이티브 AOT의 증거로 사용하지 않는다.

2026-10-11 GeekNews 입력은 `--compile --aot` 실험, TypeScript 타입 정보 활용과 정적으로 결정하지 못한 값의 런타임 검증을 소개한다. 2026-10-16 확인한 `oven-sh/WebKit` PR #743에는 AOT 구현과 검증 작업이 존재하지만 제목은 WIP다. 공식 일반 실행 파일 문서와 이 실험을 구분한다. 정식 CLI 제공 버전, 지원 플랫폼과 전체 TypeScript 의미의 보장은 추가 확인 대상이다.

## TurboPython의 다른 언어 계약

TurboPython은 Python 문법에 정적 타입과 소유권 규칙을 적용하고 C++를 거쳐 네이티브 산출물을 만든다. CPython 호환 런타임을 제거하는 대신 동적 기능과 패키지 호환성에 제약을 둔다.

- `Own[T]`는 소유권을 호출자나 저장 위치로 넘기는 데 쓰인다.
- 객체가 해제된 뒤 남는 참조를 막도록 수명을 검사한다.
- 리스트는 객체 자체를 소유하므로 CPython 리스트의 참조 공유와 복사 및 이동 의미가 다르다.
- CPython용 `numpy`, `requests` 같은 패키지를 그대로 가져올 수 없다. 의존성의 이식 범위를 확인해야 한다.

공식 프로젝트는 `tpy-lang.org`, 배포명은 `tpy-lang`이다. 같은 이름의 별도 `turbopython` 패키지와 혼동하지 않는다. 2026-10-13 입력의 C++ 변환, GC 없는 소유권과 `Own` 설명을 공식 사이트에서 대조했다.

## 평가 절차

1. 오류, 숫자 범위, 객체 별칭과 외부 라이브러리 동작을 같은 입력으로 비교한다.
2. 시작 시간, 정상 상태 처리량, 메모리와 실행 파일 크기를 따로 잰다.
3. 동적 코드, 플러그인과 FFI를 사용하는 경로를 먼저 시험한다.
4. 컴파일러 버전과 목표 OS/ISA를 고정한다.

문서와 개발 PR만 대조했으며 두 컴파일러를 빌드하거나 성능을 재현하지 않았다.

## 출처

- [Bun, Single-file executable](https://bun.com/docs/bundler/executables)
- [WIP #743 — GitHub, oven-sh/WebKit](https://github.com/oven-sh/WebKit/pull/743)
- [TurboPython](https://tpy-lang.org/)

## 관련 문서

- [[Compile-and-Runtime|컴파일과 런타임]]
- [[Python-315-Language-Changes|Python 3.15 언어 변경]]

---
tags: [compiler, aot, bun, turbopython, compatibility, dotnet, readytorun]
status: done
verified_at: 2026-11-16
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Native Compilation Compatibility", "네이티브 컴파일과 호환성", "Bun AOT", "TurboPython", "ReadyToRun", "x86-64-v2"]
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

## 실행 하한과 사전 컴파일 대상

런타임이 시작할 수 있는 최소 CPU 기능과, 미리 만든 기계어가 가정하는 CPU 기능은 따로 정해진다. .NET 11 런타임 문서(2026-11-12 갱신, GA 기준)는 둘을 JIT/AOT 최소 요구와 ReadyToRun(R2R) 대상으로 나눠 적는다. 아래는 문서 대조이며 실제 장비에서 실행해 보지는 않았다.

| 아키텍처와 OS | JIT/AOT 최소 요구 | R2R 대상 |
|---|---|---|
| x86/x64 (Apple, Linux, Windows) | `x86-64-v1`에서 `x86-64-v2`로 상향 | Windows와 Linux는 `x86-64-v2`에서 `x86-64-v3`로, Apple은 그대로 |
| Arm64 Windows | `armv8.0-a`에 LSE 추가 | `armv8.2-a + RCPC` |
| Arm64 Linux | `armv8.0-a` 그대로 | `armv8.0-a + LSE` |
| Arm64 Apple | Apple M1 그대로 | 그대로 |

- 최소 요구에 못 미치는 CPU에서는 .NET 11이 실행되지 않고 `The current CPU is missing one or more of the baseline instruction sets.` 같은 메시지를 낼 수 있다. `x86-64-v2`는 `CMOV`, `CX8`, `SSE`, `SSE2`에 `CX16`, `POPCNT`, `SSE3`, `SSSE3`, `SSE4.1`, `SSE4.2`를 더한 수준이며, 문서는 Windows 11이 이 수준을 요구하고 Windows 10이 공식 지원하는 x86/x64 CPU도 모두 갖췄다고 적는다.
- R2R은 Microsoft가 AOT의 한 형태로 부르지만 IL과 같은 코드의 기계어를 함께 담고 JIT를 대체하지 않는다. 다른 어셈블리에 정의된 제네릭, 네이티브 interop, 대상 장비에서 안전하다고 증명하지 못한 하드웨어 intrinsic, 리플렉션이나 LINQ의 동적 메서드는 실행 중 JIT가 맡고, 계층형 컴파일은 자주 쓰는 R2R 메서드를 JIT 코드로 바꾼다. 그래서 R2R 대상에 못 미치는 지원 장비에서는 실패 대신 시작할 때 JIT 부담이 늘 수 있다.
- 상향 이유로 문서는 오래된 하드웨어 지원이 키우는 코드베이스 복잡도, AOT가 기본으로 맞춰야 하는 최소 공통분모의 성능 손해, OS 하드웨어 요구와의 정렬을 든다.
- 런타임을 올리기 전에 실제 장비와 VM이 노출하는 CPU 기능을 최소 요구와 대조한다(적용 제안).

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
- [Microsoft Learn, What's new in .NET 11 runtime](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime) — 2026-11-16 최소 하드웨어 요구와 R2R 대상 표, 실패 메시지, 상향 이유 대조
- [Microsoft Learn, ReadyToRun deployment overview](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run) — R2R에 IL이 함께 남는 이유, JIT가 계속 맡는 경우와 계층형 컴파일
- [.NET 11 런타임의 새로운 기능 — GeekNews](https://news.hada.io/topic?id=36957)

## 관련 문서

- [[Compile-and-Runtime|컴파일과 런타임]]
- [[Python-315-Language-Changes|Python 3.15 언어 변경]]
- [[Version-Upgrade-Difficulty|버전 업그레이드의 난이도 구조]] — 런타임 업그레이드가 올리는 플랫폼 하한

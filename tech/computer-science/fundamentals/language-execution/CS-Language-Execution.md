---
tags: [cs, fundamentals, programming-language, compile, runtime, rust]
status: index
category: "CS - 기초"
aliases: ["CS Language and Execution", "언어와 실행 모델"]
---

# 언어와 실행: 컴파일, 런타임, 호환성

소스 코드가 실행되기까지의 경로와 언어마다 다른 설계 선택을 다룬다. 언어 지형에서 구분 기준을 잡고, 컴파일과 런타임 모델, 다른 플랫폼에서의 실행으로 넓힌 뒤 Rust의 소유권과 건전성을 사례로 읽는다.

## 목차

- [x] [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준 (설계 목적과 계보, 대표 구현의 실행 경로, 메모리 관리 방식, 타입 검사 시점, 플랫폼과 생태계, 메모리 안전성 권고)]] — 언어 교체의 지연 상한과 CPU 비용, 작은 구현을 읽는 학습
- [x] [[Language-Adoption-Signals|프로그래밍 언어 채택 지표 읽는 법]] — 설치 기반과 신규 채택의 구분, Linux Binder의 C 구현 교체 사례, 조사마다 다른 측정 대상, 순위와 증가율, 선호와 사용률, 언어가 맡는 층, 전망을 베팅으로 읽기
- [x] [[Compile-and-Runtime|컴파일과 런타임 (의사코드와 알고리즘, 네이티브, 매니지드, 인터프리터)]]
- [x] [[Native-Compilation-Compatibility|네이티브 컴파일과 호환성 (런타임 포함 실행 파일, 바이트코드 사전 생성, 네이티브 AOT, Bun AOT 실험과 TurboPython 소유권, .NET 11의 CPU 하한과 ReadyToRun 대상)]]
- [x] [[Emulation-and-Compatibility-Layers|다른 플랫폼용 프로그램 실행 (에뮬레이터, Wine과 Proton 호환 계층, Rosetta 명령어 변환, 셰이더 변환, TBDR 최적화와 이식 판단, 브라우저 안 Linux의 커널과 사용자 공간 분담)]]
- [x] [[Rust-Ownership-and-Borrowing|Rust 소유권과 대여]] — 소유권 세 규칙과 이동, 참조 규칙과 데이터 경쟁, 대여 중 push가 막히는 이유, Option과 Result, never 타입, 할당자 지정과 DropGuard, 이터레이터의 zero-cost 범위, 빌드 프로파일과 미사용 의존성 경고
- [x] [[Rust-Soundness-and-Lifetime-Boundaries|Rust 건전성과 수명 계약]] — 공변 필드 대입과 Drop, unsafe 계약, Miri 검사와 건전성 증명의 차이
- [x] [[Rust-Abstraction-Choices|Rust의 추상화 선택과 비용]] — 열거형, 제네릭과 트레이트 객체의 디스패치 시점, derive 매크로와 리플렉션 부재, 부모 참조의 Weak와 아레나, TypeScript 대응
- [x] [[Zig-Safety-and-C-Interop|Zig의 안전 장치와 C 연동]] — errdefer와 error union, 빌드 모드별 안전 검사, 할당자 인자와 누수 시험, C 빌드 통합, 1.0 이전의 변경 비용

## 관련 문서

- [[기초(Fundamentals)|컴퓨터기초(Fundamentals)]]
- [[CS-Computer-Architecture|컴퓨터 구조: 논리회로, 메모리, CPU]]

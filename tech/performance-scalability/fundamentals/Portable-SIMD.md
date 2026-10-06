---
tags: [performance, simd, vectorization, portability, go]
status: done
verified_at: 2026-10-06
category: "성능&확장성(Performance&Scalability)"
aliases: ["Portable SIMD", "이식성 있는 SIMD", "벡터 폭 독립 설계"]
---

# 이식성 있는 SIMD

SIMD는 한 명령으로 여러 데이터 원소에 같은 연산을 적용한다. 벡터의 각 원소 자리를 lane이라 하며, 벡터 폭과 원소 크기가 처리할 원소 수를 결정한다. 예를 들어 256비트 벡터에는 32비트 원소 8개가 들어간다. 이것만으로 프로그램 전체가 8배 빨라지는 것은 아니다.

## 폭을 코드에 고정하지 않기

벡터 폭 독립 설계는 논리적 연산과 실제 벡터 길이를 분리한다. 루프의 진행량을 상수 4나 8로 고정하지 않고 선택한 벡터 타입의 길이에 맞춘다.

- **자동 벡터화**: 컴파일러가 일반 루프에서 벡터 연산을 만든다.
- **아키텍처별 intrinsics**: 특정 명령 집합을 직접 다루며 지원 환경을 관리한다.
- **이식 가능한 SIMD API**: 여러 환경에 공통인 연산을 표현하고 구현이 하드웨어 명령이나 에뮬레이션에 연결한다.

소스 이식성과 바이너리 호환성은 구분한다. x86과 ARM에서 같은 소스를 빌드할 수 있다는 사실은 같은 기계어 바이너리가 두 환경에서 실행된다는 뜻이 아니다.

## Go 1.27의 두 실험 패키지

2026-10-06 공식 릴리스 노트와 패키지 문서 기준이다. 두 패키지 모두 빌드 시 `GOEXPERIMENT=simd`로 활성화하는 실험 기능이며 안정 API로 가정하지 않는다.

| 패키지 | 범위 |
|---|---|
| `simd` | 아키텍처와 벡터 크기에 독립적인 타입, 여러 환경에서 지원하거나 에뮬레이션하기 쉬운 연산 집합 |
| `simd/archsimd` | 아키텍처별 SIMD 연산, Go 1.27에서 amd64와 arm64 NEON, WebAssembly 지원 |

`simd`는 하드웨어 명령 또는 순수 Go 에뮬레이션으로 동작한다. 벡터 길이는 최소 128비트이며 같은 프로그램 실행 안에서는 모든 벡터의 비트 길이가 같다. 지원된다는 사실을 모든 CPU에서 하드웨어 가속된다는 뜻으로 읽지 않는다.

## 끝에 남는 원소

원소가 103개이고 한 벡터가 8개를 처리하면 96개 뒤에 7개가 남는다. 남은 데이터를 처리할 때도 배열 경계를 지켜야 한다. 예를 들어 Go `simd`의 `LoadFloat32sPart`는 부분 벡터와 읽은 원소 수를, `StorePart`는 저장한 원소 수를 반환한다. 사용하는 연산에 맞게 유효 원소 범위를 관리한다.

## 배포와 측정

C++ Highway는 공통 SIMD 소스로 정적 또는 동적 dispatch를 선택할 수 있다. 동적 dispatch는 같은 실행 플랫폼에서 지원되는 명령 집합을 골라 쓰는 방식이다. 배치 처리, SoA 데이터 배치와 정렬을 고려하면 벡터 연산의 이점을 살릴 수 있다.

다음은 도입 시 확인할 질문이다.

1. 실제 병목이 벡터화 가능한 연산인가, 데이터 공급과 메모리 이동인가?
2. 짧은 입력과 나머지 원소에서도 스칼라 기준 결과와 일치하는가?
3. 배포 CPU에서 지원되는 경로와 fallback을 확인했는가?
4. 데이터 준비 비용까지 포함해 시간과 할당량을 비교했는가?

어셈블리 제거 자체가 안전성이나 속도의 증거는 아니다. 추상화가 줄이는 플랫폼별 유지보수와 실제 측정 결과를 함께 판단한다. 이 문서는 문서 대조 결과이며 실행 벤치마크는 아니다.

## 출처

- [Go 1.27 Release Notes — The Go Programming Language](https://go.dev/doc/go1.27)
- [Go Packages, simd](https://pkg.go.dev/simd)
- [Highway: Efficient and performance-portable vector software — Google](https://github.com/google/highway)

## 관련 문서

- [[CPU-Bound-Vs-IO-Bound|CPU와 I/O 병목]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
- [[WebAssembly|WebAssembly의 SIMD와 호출 경계]]

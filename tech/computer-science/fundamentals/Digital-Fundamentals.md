---
tags: [cs, digital, bit, encoding]
status: done
category: "CS - 기초"
aliases: ["디지털 기초", "비트와 진법", "정수 표현과 엔디언"]
verified_at: 2026-08-04
---

# 디지털 기초: 비트, 진법, 정수 표현

컴퓨터는 비트열 자체에 숫자, 문자, 명령어라는 의미를 붙이지 않는다. 같은 비트열도 해석 규칙과 비트 폭에 따라 값이 달라진다. 따라서 값을 볼 때는 **비트 폭, 부호 여부, 인코딩, 바이트 순서**를 함께 확인해야 한다.

## 비트, 바이트, 워드

- **비트(bit)**: 0 또는 1 한 상태를 표현하는 최소 정보 단위다.
- **바이트(byte)**: 8비트다.
- **워드(word)**: CPU가 자연스럽게 처리하는 데이터 폭을 가리키지만 ISA와 문맥에 따라 뜻이 달라진다.
- **주소 공간**: 주소 비트 수뿐 아니라 주소 단위, ISA, MMU, 운영체제 제약에 의해 정해진다.

32비트 CPU라는 말도 레지스터, ALU, 주소 폭이 모두 반드시 32비트라는 뜻은 아니다. 전체 64비트 주소를 구현했다고 해서 실제로 `2^64`바이트 메모리를 장착할 수 있다는 뜻도 아니다.

## 진법과 변환

위치 기수법에서 각 자릿값은 밑(base)의 거듭제곱이다.

```text
101101₂ = 1×2⁵ + 0×2⁴ + 1×2³ + 1×2² + 0×2¹ + 1×2⁰ = 45₁₀
```

- 10진수에서 2진수로: 2로 반복해 나눈 나머지를 역순으로 읽는다.
- 2진수에서 16진수로: 오른쪽부터 4비트씩 묶는다.
- 16진수 한 자리는 4비트와 정확히 대응한다. `0xF4 = 1111 0100₂`다.
- 최상위 비트는 MSB, 최하위 비트는 LSB다.

16진수는 주소, 메모리 덤프, 비트 마스크처럼 긴 비트열을 짧고 경계가 보이게 표현할 때 유용하다.

## 고정 폭 정수

`n`비트가 표현할 수 있는 비트 패턴은 `2^n`개다.

| 해석 | 범위 |
|---|---|
| 부호 없는 정수 | `0`부터 `2^n - 1` |
| 2의 보수 부호 있는 정수 | `-2^(n-1)`부터 `2^(n-1) - 1` |

### 2의 보수

음수 `-x`의 고정 폭 표현은 `x`의 모든 비트를 뒤집고 1을 더해 구한다.

```text
8비트 5     = 0000 0101
비트 반전   = 1111 1010
1 더하기    = 1111 1011 = -5
```

2의 보수를 쓰면 같은 가산기로 덧셈과 뺄셈을 처리할 수 있다. 다만 MSB가 1이면 음수라는 해석은 **부호 있는 2의 보수로 읽을 때만** 성립한다. 같은 `1111 1011`도 부호 없이 읽으면 251이다.

### 캐리와 오버플로

캐리와 부호 있는 오버플로는 다른 조건이다.

| 예시 | 결과 | 의미 |
|---|---|---|
| 8비트 unsigned `255 + 1` | `0`, carry 1 | 부호 없는 범위 초과 |
| 8비트 signed `127 + 1` | `-128`, overflow | 같은 부호의 두 피연산자에서 결과 부호가 바뀜 |
| 8비트 signed `-1 + 1` | `0`, carry 1 | 부호 있는 오버플로는 아님 |

범위를 벗어났을 때 하위 비트만 남길지, 플래그를 기록할지, 예외를 만들지는 ISA와 언어의 규칙이다. 오버플로가 항상 인터럽트를 발생시키는 것은 아니다. 예를 들어 RISC-V RV32I 정수 덧셈은 오버플로 결과의 하위 XLEN 비트를 남기고 별도 산술 예외를 만들지 않는다.

## 엔디언

엔디언은 여러 바이트로 된 값을 메모리의 연속 주소에 배치하는 순서다. 비트열 `0x12345678`을 주소 `A`부터 저장하면 다음과 같다.

| 주소 | Big-endian | Little-endian |
|---|---:|---:|
| `A` | `12` | `78` |
| `A+1` | `34` | `56` |
| `A+2` | `56` | `34` |
| `A+3` | `78` | `12` |

- Big-endian은 가장 큰 자릿값의 바이트를 낮은 주소에 둔다.
- Little-endian은 가장 작은 자릿값의 바이트를 낮은 주소에 둔다.
- 파일/네트워크 프로토콜은 바이트 순서를 명시해야 한다. 호스트 메모리 순서를 그대로 전송한다고 가정하면 이식성이 깨진다.
- UTF-8의 코드 단위는 한 바이트이므로 UTF-16/UTF-32 같은 바이트 순서 문제는 없다.

## 저장 용량 표기

SI 접두사와 이진 접두사를 구분한다.

| 표기 | 바이트 수 |
|---|---:|
| 1 kB | `10^3` |
| 1 MB | `10^6` |
| 1 GB | `10^9` |
| 1 KiB | `2^10 = 1,024` |
| 1 MiB | `2^20` |
| 1 GiB | `2^30` |

## 문자 인코딩

- **ASCII**: 7비트 코드로 `U+0000`부터 `U+007F`에 대응하는 문자와 제어 문자를 표현한다.
- **Unicode**: 문자에 코드 포인트를 부여하는 표준이다.
- **UTF-8**: Unicode 스칼라 값을 1바이트에서 4바이트로 인코딩하며 ASCII 범위는 같은 1바이트 값을 유지한다.

문자 수와 바이트 수는 같지 않다. UTF-8에서 `A`는 1바이트, 현대 한글 음절 `가`는 3바이트지만, 사용자에게 보이는 한 글자가 여러 코드 포인트로 구성될 수도 있다.

## 이미지의 비트 표현

래스터 이미지는 픽셀마다 색상 채널 값을 저장한다. 24비트 RGB는 보통 R/G/B 채널에 각 8비트를 쓰며, 32비트 RGBA는 알파 채널을 더한다. BMP, PNG, JPEG 같은 형식은 같은 픽셀 정보를 저장하고 압축하는 규칙이 서로 다르다.

## 면접 체크포인트

- `n`비트 signed/unsigned 범위를 계산할 수 있는가
- carry와 signed overflow를 예로 구분할 수 있는가
- 2의 보수로 뺄셈을 덧셈 회로에 재사용하는 이유를 설명할 수 있는가
- 엔디언이 값의 의미가 아니라 바이트 배치 순서라는 점을 설명할 수 있는가
- 문자 수, 코드 포인트 수, UTF-8 바이트 수를 구분할 수 있는가

## 출처

- 인프런, 널널한 개발자 강사, [1비트와 디지털](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128238), [4비트와 16진수 그리고 진법변환](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128239), [16진수 표기가 사용되는 예](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128240), [외워야 할 단위 체계와 숫자](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128241), [컴퓨터가 글자를 다루는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128243), [컴퓨터가 사진을 다루는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128244)
- 인프런, 감자 강사, [10진법과 2진법](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277215), [16진법](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277224)
- 인프런, 감자 강사, [빅 엔디안과 리틀 엔디안](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277632), [오버플로우와 인터럽트](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277637), [음수](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277641)
- [Unicode Standard 17.0, UTF-8](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-2/)
- [NIST, Prefixes for binary multiples](https://physics.nist.gov/cuu/Units/binary.html)
- [RISC-V RV32I Base Integer Instruction Set](https://docs.riscv.org/reference/isa/unpriv/rv32.html)

## 관련 문서

- [[CPU-and-Arithmetic|CPU와 산술논리연산]]
- [[Sequential-Logic-and-Memory|순차 논리회로와 메모리]]
- [[CPU-Datapath-Control-and-Instruction-Cycle|CPU 데이터패스와 명령어 사이클]]

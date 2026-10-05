---
tags: [cs, digital, bit, encoding]
status: done
category: "CS - 기초"
aliases: ["디지털 기초", "비트와 진법", "정수 표현과 엔디언"]
verified_at: 2026-10-05
---

# 디지털 기초: 비트, 진법, 정수 표현

컴퓨터는 비트열 자체에 숫자, 문자, 명령어라는 의미를 붙이지 않는다. 같은 비트열도 해석 규칙과 비트 폭에 따라 값이 달라진다. 따라서 값을 볼 때는 **비트 폭, 부호 여부, 인코딩, 바이트 순서**를 함께 확인해야 한다.

예를 들어 16진수 바이트열 `48 49 21`은 ASCII 문자로 읽으면 `HI!`, RGB 픽셀 하나로 읽으면 R=72, G=73, B=33, 24비트 big-endian 부호 없는 정수로 읽으면 4,737,313이다.

## 비트, 바이트, 워드

- **비트(bit)**: 0 또는 1 한 상태를 표현하는 최소 정보 단위다.
- **바이트(byte)**: 8비트다.
- **워드(word)**: CPU가 자연스럽게 처리하는 데이터 폭을 가리키지만 ISA와 문맥에 따라 뜻이 달라진다.
- **주소 공간**: 주소 비트 수뿐 아니라 주소 단위, ISA, MMU, 운영체제 제약에 의해 정해진다.

회로는 비트를 전압 대역으로 구분한다. 같은 전압 범위를 10단계로 나누는 대신 두 대역으로만 나누면 대역 사이 간격을 넓게 잡을 수 있어 잡음이 섞여도 0과 1을 가르기 쉽다 ([[CPU-and-Arithmetic|CPU와 산술논리연산]]).

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

`n`비트가 표현할 수 있는 비트 패턴은 `2^n`개다. 반대로 서로 다른 값 `k`개를 구분하려면 최소 `⌈log₂ k⌉`비트가 필요하다. ASCII의 128개 부호는 7비트, Unicode 코드 공간의 1,114,112개 코드 포인트는 21비트가 필요하다.

| 해석 | 범위 |
|---|---|
| 부호 없는 정수 | `0`부터 `2^n - 1` |
| 2의 보수 부호 있는 정수 | `-2^(n-1)`부터 `2^(n-1) - 1` |

### 2의 보수

음수 `-x`의 고정 폭 표현은 `x`의 모든 비트를 뒤집고 1을 더해 구한다. 비트만 뒤집은 값이 1의 보수이고, 거기에 1을 더한 값이 2의 보수다.

```text
8비트 5     = 0000 0101
비트 반전   = 1111 1010   (1의 보수)
1 더하기    = 1111 1011 = -5   (2의 보수)
```

2의 보수를 쓰면 같은 가산기로 덧셈과 뺄셈을 처리할 수 있다. 다만 MSB가 1이면 음수라는 해석은 **부호 있는 2의 보수로 읽을 때만** 성립한다. 같은 `1111 1011`도 부호 없이 읽으면 251이다.

0이 아닌 `x`와 `-x`의 비트열을 n비트 덧셈기로 더하면 `2^n`이 되고, 폭 밖으로 나간 carry를 버리면 0만 남는다. 변환 결과를 이 덧셈으로 검산할 수 있다.

```text
  0000 1001   (9)
+ 1111 0111   (-9)
-----------
1 0000 0000   → 8비트에 남는 값은 0000 0000
```

부호 있는 2의 보수 비트열을 10진수로 읽는 방법은 둘이다.

- MSB가 1이면 같은 연산(비트 반전 후 1 더하기)으로 절댓값을 구하고 그 결과를 부호 없는 수로 읽는다. `1011 0011`은 `0100 1101`(77)이 되므로 -77이다.
- MSB의 자릿값을 `-2^(n-1)`로 두고 나머지 비트는 평소처럼 더한다. `1011 0011 = -128 + 32 + 16 + 2 + 1 = -77`이다.

부호와 크기(sign-magnitude) 방식은 `1000 0000`, 1의 보수 방식은 `1111 1111`이 음의 0이 되어 0을 나타내는 패턴이 두 개다. 덧셈에서도 부호와 크기 방식은 부호를 따로 비교해야 하고, 1의 보수 방식은 MSB 밖으로 넘친 carry를 최하위 비트에 다시 더해야 한다(end-around carry). 2의 보수는 0이 하나뿐이라 남는 패턴 하나가 음수 쪽에 배정되고 범위가 `-128`부터 `127`처럼 비대칭이 된다.

가장 작은 음수는 절댓값을 같은 폭에 담을 수 없다. 8비트 `1000 0000`(-128)에 비트 반전과 1 더하기를 하면 다시 `1000 0000`이 나오고, 이 결과를 부호 없이 읽은 128이 절댓값이다. Java도 정수를 2의 보수로 다루므로 `-Integer.MIN_VALUE`는 예외 없이 `Integer.MIN_VALUE` 그대로이고(JLS 15.15.4) `Math.abs(Integer.MIN_VALUE)`도 음수를 반환한다(`Math.abs` API). 이 넘침을 오류로 다뤄야 하면 Java 15부터 제공되는 `Math.absExact`처럼 `ArithmeticException`을 던지는 API를 쓴다.

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

`KB`, `MB` 같은 표기는 문맥마다 기준이 다르다. SI 접두사 kilo의 기호는 소문자 `k`라 대문자 K를 쓴 `KB`는 SI 접두사 표기가 아니고, `MB`도 메모리 제조사는 보통 `2^20`바이트, 저장장치 제조사는 `10^6`바이트의 뜻으로 써 왔다. 용량과 quota 계약에는 `kB`와 `KiB`처럼 기준이 드러나는 표기를 쓰거나 바이트 수를 함께 적는다.

## 문자 인코딩

- **ASCII**: 7비트 코드로 `U+0000`부터 `U+007F`에 대응하는, 제어 문자를 포함한 128개 부호를 표현한다. `A`는 65(`0x41`, `100 0001₂`), `B`는 66이다.
- **Unicode**: 문자에 코드 포인트를 부여하는 표준이다. 코드 공간은 `U+0000`부터 `U+10FFFF`까지다.
- **UTF-8**: Unicode 스칼라 값을 1바이트에서 4바이트로 인코딩하며 ASCII 범위는 같은 1바이트 값을 유지한다.

저장하고 전송하는 바이트열은 인코딩이 정한다. UTF-32는 코드 단위 값이 코드 포인트 값과 같지만, UTF-16은 보충 평면 문자를 서로게이트 쌍으로, UTF-8은 ASCII 밖 문자를 여러 바이트로 나눠 코드 포인트와 다른 값을 담는다. 기쁨의 눈물 이모지(FACE WITH TEARS OF JOY)는 코드 포인트 `U+1F602`(128,514)이고 UTF-32로는 `0001F602`, UTF-16으로는 서로게이트 쌍 `D83D DE02`, UTF-8로는 `F0 9F 98 82` 4바이트다. 받는 쪽은 바이트열을 코드 포인트로 디코딩한 뒤 글꼴의 글리프로 그린다. Unicode는 문자만 정하고 글리프 모양은 글꼴 제작사가 정하므로 같은 이모지도 운영체제와 글꼴마다 다르게 보일 수 있다.

문자 수와 바이트 수는 같지 않다. UTF-8에서 `A`는 1바이트, 현대 한글 음절 `가`는 3바이트지만, 사용자에게 보이는 한 글자가 여러 코드 포인트로 구성될 수도 있다.

## 이미지의 비트 표현

래스터 이미지는 픽셀마다 색상 채널 값을 저장한다. 24비트 RGB는 보통 R/G/B 채널에 각 8비트를 쓰며, 32비트 RGBA는 알파 채널을 더한다. BMP, PNG, JPEG 같은 형식은 같은 픽셀 정보를 저장하고 압축하는 규칙이 서로 다르다.

## 소리와 영상의 비트 표현

PCM은 소리 같은 아날로그 신호의 크기를 일정한 간격으로 표본화하고 각 표본을 정해진 비트 수의 값으로 양자화한다. 압축하지 않은 PCM의 초당 바이트 수는 `표본화 주파수 × 채널 수 × 표본 비트 수 ÷ 8`이므로 44.1kHz, 16비트, 2채널이면 초당 176,400바이트, 1분에 약 10.6MB다. MIDI는 파형 대신 어떤 음을 언제 어떤 세기로 연주할지를 담는다. Note On 메시지는 채널 번호를 담은 상태 바이트 뒤에 7비트 음 번호와 7비트 세기를 붙인 3바이트이고, 소리는 받는 쪽 신시사이저가 만든다.

영상은 프레임이라 부르는 이미지를 연속으로 보여 주는 표현이다. 채널당 8비트인 1920×1080 RGB 프레임 하나는 6,220,800바이트이고, 초당 30프레임이면 압축 전 데이터가 초당 186,624,000바이트(약 1.49Gbit/s)다. 저장과 전송 크기는 코덱의 압축이 정하지만 재생 중 메모리와 처리량은 디코딩한 프레임 크기와 프레임 속도로 계산한다.

## 면접 체크포인트

- `n`비트 signed/unsigned 범위를 계산할 수 있는가
- carry와 signed overflow를 예로 구분할 수 있는가
- 2의 보수로 뺄셈을 덧셈 회로에 재사용하는 이유를 설명할 수 있는가
- 1의 보수와 2의 보수의 차이, 2의 보수가 0을 하나만 갖는 이점을 설명할 수 있는가
- 8비트 `1000 0000`이 -128인 이유와 그 절댓값을 같은 폭에 담지 못하는 결과(`Math.abs(Integer.MIN_VALUE)`)를 설명할 수 있는가
- 엔디언이 값의 의미가 아니라 바이트 배치 순서라는 점을 설명할 수 있는가
- 문자 수, 코드 포인트 수, UTF-8 바이트 수를 구분할 수 있는가
- 코드 포인트, 인코딩된 바이트열과 글리프를 구분해 같은 이모지가 기기마다 다르게 보이는 이유를 설명할 수 있는가
- PCM 오디오와 압축 전 영상의 초당 데이터량을 계산할 수 있는가

## 범위, 바이트와 실제 저장 크기

정수 범위를 넘으면 조용한 wrap, exception, undefined behavior처럼 언어 계약에 따라 다른 결과가 생긴다. 작은 값 아래로 벗어남을 integer underflow로 부르는 경우와 floating-point 값이 0에 가까워지는 underflow는 구분한다. 비교자를 a-b로 구현하면 overflow로 순서가 뒤집힐 수 있어 관계 비교나 표준 comparator를 쓴다.

2^8=256, 2^16=65,536, 2^24=16,777,216은 bit 폭의 기준값이다. TB/PB/EB는 각각 10^12/10^15/10^18 B, TiB/PiB/EiB는 2^40/2^50/2^60 B다. 1 TB를 GiB로 환산하면 약 931.3 GiB이며 디스크가 사라진 것이 아니라 단위가 다르다. 경보와 quota의 단위를 먼저 맞춘다.

ASCII 문자 '1'은 0x31이고 수치 1을 한 byte 정수로 쓰면 0x01이다. 공백 0x20과 CR/LF도 저장 byte다. CRLF와 LF 차이는 shell 실행이나 protocol parsing에 영향을 주며 byte 수 제한과 문자 수 제한을 구분한다. 한글 byte 수는 인코딩과 실제 code point에 따라 달라져 한글은 항상 2 byte라는 규칙은 없다.

RGB 8 bit 채널 세 개는 pixel당 3 B, RGBA는 4 B다. 디코딩 buffer 크기는 가로×세로×채널 byte로 산정한다. 1024×768 RGBA는 정확히 3 MiB이고 4000×3000은 약 45.8 MiB다. 압축 파일이 작아도 decode memory는 크므로 입력 pixel 수와 동시 처리량을 제한한다. 무손실은 원래 값을 복원하고 손실은 정보를 버려 크기를 줄이는 방식이다.

## 출처

- 인프런 보충 강의: [컴퓨터가 연산하는 과정](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128248)

- 인프런, 널널한 개발자 강사, [1비트와 디지털](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128238), [4비트와 16진수 그리고 진법변환](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128239), [16진수 표기가 사용되는 예](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128240), [외워야 할 단위 체계와 숫자](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128241), [컴퓨터가 글자를 다루는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128243), [컴퓨터가 사진을 다루는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128244)
- 인프런, 감자 강사, [10진법과 2진법](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277215), [16진법](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277224)
- 인프런, 감자 강사, [빅 엔디안과 리틀 엔디안](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277632), [오버플로우와 인터럽트](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277637), [음수](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277641)
- YouTube, 쉬운코드, [컴퓨터 양의 정수 표현 방법](https://www.youtube.com/watch?v=P6s_66Ta72s), [컴퓨터 음의 정수 표현 방법](https://www.youtube.com/watch?v=oMX8305gTmQ), [10000000 십진수 변환 해설](https://www.youtube.com/watch?v=6-6x6s5Rme8)
- 부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), [2진법](https://www.boostcourse.org/cs112/lecture/118997), [정보의 표현](https://www.boostcourse.org/cs112/lecture/118998)
- [Unicode Standard 17.0, Chapter 2 General Structure](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-2/)
- [Unicode Character Database 17.0, UnicodeData.txt](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt)
- [IETF RFC 20, ASCII format for Network Interchange](https://www.rfc-editor.org/rfc/rfc20)
- [NIST, Prefixes for binary multiples](https://physics.nist.gov/cuu/Units/binary.html)
- [NIST, Metric (SI) Prefixes](https://www.nist.gov/pml/owm/metric-si-prefixes)
- [Microsoft Learn, WAVEFORMATEX structure (mmeapi.h)](https://learn.microsoft.com/en-us/windows/win32/api/mmeapi/ns-mmeapi-waveformatex)
- [Library of Congress, Linear Pulse Code Modulated Audio (LPCM)](https://www.loc.gov/preservation/digital/formats/fdd/fdd000011.shtml)
- [MIDI Association, Summary of MIDI 1.0 Messages](https://midi.org/summary-of-midi-1-0-messages)
- [MIDI Association, About MIDI Part 1: Overview](https://midi.org/about-midi-part-1overview)
- [RISC-V RV32I Base Integer Instruction Set](https://docs.riscv.org/reference/isa/unpriv/rv32.html)
- [Java SE 26 Language Specification, 15.15.4 Unary Minus Operator](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.15.4)
- [Java SE 26 API, Math.abs와 Math.absExact](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Math.html)

## 관련 문서

- [[CPU-and-Arithmetic|CPU와 산술논리연산]]
- [[Sequential-Logic-and-Memory|순차 논리회로와 메모리]]
- [[CPU-Datapath-Control-and-Instruction-Cycle|CPU 데이터패스와 명령어 사이클]]
- [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기 (16진수 덤프 해석 예시)]]
- [[Java-Character-Encoding-and-Charset|Java 문자 인코딩과 Charset (charset별 바이트 수)]]
- [[JavaScript-Numbers-Strings-and-Regular-Expressions|JavaScript 숫자, 문자열과 정규표현식 (UTF-16 code unit과 grapheme)]]

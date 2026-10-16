---
tags: [cs, cpu, boolean-algebra, combinational-circuit, alu]
status: done
category: "CS - 기초"
aliases: ["CPU와 연산", "불 대수와 조합 논리회로", "ALU"]
verified_at: 2026-08-04
---

# CPU와 산술논리연산

불 함수를 게이트로 구현하고, 게이트를 조합해 가산기와 선택 회로를 만들며, 이들을 묶어 ALU를 만든다. 이 계층을 이해하면 CPU 연산을 거대한 블랙박스가 아니라 작은 계약의 조합으로 볼 수 있다.

## 불 대수와 논리 게이트

불 변수는 0/1 두 값을 갖는다. 불 함수는 식, 진리표, 회로라는 세 표현을 오갈 수 있다.

| 연산 | 출력이 1인 조건 | 대표 역할 |
|---|---|---|
| NOT | 입력이 0 | 반전 |
| AND | 모든 입력이 1 | 조건 결합, carry 생성 |
| OR | 하나 이상이 1 | 조건 합성 |
| XOR | 1인 입력이 홀수 개(두 입력이면 서로 다름) | 합의 현재 자리 계산 |
| NAND | AND 결과의 반대 | 범용 게이트 |

NAND만으로 NOT, AND, OR를 만들 수 있으므로 모든 불 함수를 구성할 수 있다.

```text
NOT A   = A NAND A
A AND B = NOT(A NAND B)
A OR B  = (NOT A) NAND (NOT B)
```

### 식 단순화

회로에서 같은 기능을 더 적은 게이트와 더 짧은 경로로 표현하려면 불 대수 법칙을 쓴다.

- 항등: `A AND 1 = A`, `A OR 0 = A`
- 멱등: `A AND A = A`, `A OR A = A`
- 보수: `A AND NOT A = 0`, `A OR NOT A = 1`
- 흡수: `A OR (A AND B) = A`
- 드 모르간: `NOT(A AND B) = NOT A OR NOT B`
- 드 모르간: `NOT(A OR B) = NOT A AND NOT B`

진리표에서 출력이 1인 각 행의 입력 조건을 AND 항으로 만들고 이들을 OR로 합치면 논리식을 얻는다. 카르노 맵은 인접한 `1`을 `1, 2, 4, 8...`개 단위로 묶어 변하지 않는 변수만 남기는 시각적 단순화 도구다. 입력이 많아지면 자동 논리 합성 도구를 사용한다.

## 조합 논리회로

조합회로의 출력은 현재 입력만으로 정해진다. 이전 상태를 기억하지 않는다.

### 멀티플렉서

MUX는 여러 입력 중 선택 신호가 가리키는 하나를 출력한다. `s`개의 선택 비트로 최대 `2^s`개 입력을 고를 수 있다. ALU의 연산 결과 선택, 레지스터 입력 선택처럼 데이터 경로를 전환하는 데 쓴다.

### 디코더

`n`비트 입력을 받아 최대 `2^n`개 출력 중 하나를 활성화한다. 명령어 opcode 해석, 레지스터/메모리 행 선택에 활용한다. MUX가 여러 데이터 중 하나를 출력으로 모은다면 디코더는 한 코드를 여러 선택선 중 하나로 펼친다.

### 트라이스테이트 버퍼

트라이스테이트 출력은 0, 1뿐 아니라 회로에서 전기적으로 분리된 high impedance 상태를 가질 수 있다. 여러 장치가 버스를 공유할 때 한 장치만 버스를 구동하도록 enable로 제어한다. 두 장치가 서로 다른 값을 동시에 구동하면 버스 경합이 발생하므로 제어 신호의 상호 배타성이 중요하다.

## 가산기

### 반가산기

두 비트 `A`, `B`를 더한다.

```text
Sum   = A XOR B
Carry = A AND B
```

이전 자리의 carry 입력을 받을 수 없으므로 최하위 자리 외에는 그대로 쓰기 어렵다.

### 전가산기

`A`, `B`, 이전 자리 carry인 `Cin`을 더한다. 반가산기 두 개와 OR 게이트로 구성할 수 있다.

```text
Sum  = A XOR B XOR Cin
Cout = (A AND B) OR (Cin AND (A XOR B))
```

전가산기를 비트 수만큼 연결하면 다비트 가산기가 된다. 단순 ripple-carry 구조에서는 각 자리의 carry가 다음 자리로 전파되므로 비트 폭이 커질수록 지연이 누적된다.

## 뺄셈과 시프트

`A - B`는 고정 폭에서 `A + NOT(B) + 1`로 계산할 수 있다. ALU는 B 입력 반전과 초기 carry를 선택해 가산기를 덧셈과 뺄셈에 재사용한다.

왼쪽 시프트는 넘친 비트를 버리지 않는다는 전제에서 `2^k` 곱셈과 대응한다. 오른쪽 시프트는 다음을 구분해야 한다.

- 논리 시프트: 빈 상위 비트를 0으로 채운다.
- 산술 시프트: 부호 있는 값을 위해 기존 부호 비트를 복제한다.

시프트가 모든 곱셈/나눗셈을 대체하지는 않는다. 부호, 반올림, 오버플로 규칙까지 확인해야 한다.

## ALU와 플래그

ALU는 데이터 입력과 연산 선택 신호를 받아 산술/논리 결과를 낸다. 내부에서 여러 연산을 계산한 뒤 MUX로 하나를 선택하거나 선택 신호로 필요한 경로만 활성화할 수 있다.

| 플래그 | 의미 | 주의점 |
|---|---|---|
| Z, zero | 결과의 모든 비트가 0 | 조건 분기에 사용 가능 |
| C, carry | 최상위 자리의 carry out | unsigned 연산에 주로 사용 |
| V, overflow | signed 결과가 표현 범위를 벗어남 | carry와 같지 않음 |
| N, negative | 결과의 최상위 비트 | 2의 보수 signed 해석에서 의미 |

플래그의 종류와 갱신 규칙은 ISA마다 다르다. 어떤 ISA는 전역 플래그 레지스터 대신 비교/분기 명령으로 조건을 계산한다.

## 회로 검증 순서

1. 입력과 출력의 비트 폭, 의미를 먼저 정한다.
2. 작은 진리표나 불 함수로 계약을 적는다.
3. 하위 회로를 조합하고 가능한 모든 작은 입력 조합을 테스트한다.
4. 경계값인 0, 최댓값, 부호 전환점, carry/overflow를 따로 검증한다.
5. 조합 경로 지연과 버스 경합처럼 값만 비교해서 놓치는 조건도 확인한다.

## 면접 체크포인트

- NAND가 범용 게이트인 이유를 구성식으로 보일 수 있는가
- MUX와 디코더의 방향과 용도를 비교할 수 있는가
- 반가산기와 전가산기의 차이를 설명할 수 있는가
- carry와 signed overflow를 구분할 수 있는가
- ALU, 레지스터, 제어장치가 각각 무엇을 담당하는가

## 회로를 구성하는 규칙

XOR은 1인 입력 수가 홀수일 때 1이므로 1 XOR 1 XOR 1도 1이다. `x XOR x=0`, `x XOR 0=x`로 toggle과 parity를 만든다. AND/OR/XOR에는 결합법칙이 있지만 NAND/NOR를 연속 연결한 것은 다입력 게이트와 다르다. NAND에서 A=1,B=1,C=0이면 `(A NAND B) NAND C=1`, `A NAND (B NAND C)=0`이다. XNOR은 XOR 반전이라는 이름이며 이 이항 연산은 결합법칙을 만족한다. AND는 OR/XOR 위로, OR는 AND 위로 분배되지만 OR가 XOR 위로 분배되는 것은 아니다.

NAND 4개로 XOR을 만들려면 N1=A NAND B, N2=A NAND N1, N3=B NAND N1, 출력=N2 NAND N3으로 둔다. 2입력 MUX는 `(A AND NOT S) OR (B AND S)`다. 입력 m개에는 ceil(log2 m) 선택 bit가 필요하고, 4입력 MUX는 앞단 2개와 뒷단 1개의 2입력 MUX로 만든다. data 폭은 bit별 MUX를 복제하고 선택선을 공유한다. Decoder는 선택값과 enable을 AND하므로 enable이 0이면 어떤 word도 쓰지 않는다.

카르노 맵의 축은 00,01,11,10처럼 인접 칸에서 한 bit만 바뀌는 Gray 순서다. 양 끝도 이웃이며 직사각형 1/2/4/8개 묶음을 겹쳐 쓸 수 있다. 묶음에서 변하지 않는 변수만 남긴다. 출력 0인 행을 생략하는 것과 입력이 발생하지 않거나 결과가 무관한 don't-care는 다르다.

전기 신호의 0/1은 logic family의 입력 전압 대역이며 모든 회로가 0V/5V를 쓰거나 같은 threshold를 갖지는 않는다. High impedance Z는 0도 unknown 값도 아니며 bus driver가 연결을 놓는 상태다. 여러 driver가 같은 버스를 반대로 구동하면 전류와 신호 경합이 생긴다.

## 산술 결과와 저장 시점

뺄셈은 B의 각 bit를 SU와 XOR하고 초기 carry를 SU로 주어 덧셈기를 공유할 수 있다. n bit의 `A+NOT B+1=A-B+2^n`에서 carry-out은 unsigned A>=B의 no-borrow다. 8 bit에서 0-1은 FF와 C=0, 1-1은 00과 C=1,Z=1이다. 이 해석은 해당 회로의 계약이며 다른 ISA의 carry 관례로 일반화하지 않는다. 조합 ALU 출력은 입력이 바뀌면 다시 계산되므로 조건 분기에 필요한 flag는 지정된 FI edge에 별도 register에 저장한다.

곱셈을 반복 덧셈, 나눗셈을 반복 뺄셈으로 구현할 수 있지만 반복 횟수가 값에 비례한다. shift-and-add 같은 bit 단위 전략과 hardware 연산기는 비용을 줄이는 다른 선택이다. n bit 왼쪽 shift는 폭 밖 bit를 버리고 오른쪽 shift는 signed 반올림 규칙을 확인한다. 0으로 나누기의 결과는 ISA/언어별 계약이므로 분모를 경계에서 검증한다. chip 손상을 일반적인 실패 결과로 설명하지 않는다.

## 출처

- 인프런 보충 강의: [비트 마스킹](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135781)
- 인프런 보충 강의: [XOR 게이트](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278064), [8비트 2입력 MUX(feat.터널 사용법)](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278070), [8비트 4입력 MUX](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278084), [8비트 8입력 MUX](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278687), [8비트 16입력 MUX](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278688), [4비트 디코더](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278696), [RAM](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=280414), [컴퓨터 만들기 개요](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279244), [ALU 업그레이드](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=280425), [진리표를 변환하는 방법](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277208), [불 함수](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277207), [AND 게이트](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277698), [불 대수를 활용할 수 있는 방법](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277644), [NAND 게이트](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277659), [컴퓨터 조립하기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=280426), [어셈블리 언어 프로그래밍 - 곱하기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281079), [어셈블리 언어 프로그래밍 - 나누기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281080)

- 인프런, 널널한 개발자 강사, [디지털 회로와 덧셈](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128245), [컴퓨터가 뺄셈하는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128246), [CPU가 곱하고 나누는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128247)
- 인프런, 감자 강사, [불 연산](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=276833), [불 대수의 성질과 법칙](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277193), [카르노 맵](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=277210)
- 인프런, 감자 강사, [1비트 2입력 MUX](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278065), [3비트 디코더](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278695), [컨트롤 버퍼](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=278697)
- 인프런, 감자 강사, [반 가산기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279245), [전 가산기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279246), [산술논리연산장치](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279247)
- [Logisim-evolution User Guide](https://mbaillif.github.io/Logisim-evolution-documentation/en/html/guide/index.html)
- [Logisim-evolution Multiplexer Reference](https://mbaillif.github.io/Logisim-evolution-documentation/en/html/libs/plexers/mux.html)

## 관련 문서

- [[Digital-Fundamentals|디지털 기초]]
- [[Sequential-Logic-and-Memory|순차 논리회로와 메모리]]
- [[CPU-Datapath-Control-and-Instruction-Cycle|CPU 데이터패스와 명령어 사이클]]
- [[Math-Logic-For-Programming|프로그래밍에 필요한 수학과 논리]]

---
tags: [cs, cpu, datapath, control-unit, isa, instruction-cycle, assembly]
status: done
category: "CS - 기초"
aliases: ["CPU 데이터패스", "제어장치와 명령어 사이클", "기계어와 어셈블리어"]
verified_at: 2026-08-04
---

# CPU 데이터패스, 제어장치, 명령어 사이클

CPU는 값을 이동하고 계산하는 **데이터패스**와, 매 순간 어떤 이동/연산을 허용할지 정하는 **제어장치**로 나눠 볼 수 있다. ISA는 소프트웨어가 보는 명령어 계약이고, 데이터패스와 제어장치는 그 계약을 구현하는 하드웨어다.

## ISA와 마이크로아키텍처

| 층 | 정하는 것 | 예시 |
|---|---|---|
| ISA | 명령어, 레지스터, 데이터형, 주소 지정, 관찰 가능한 동작 | ADD, LOAD, JUMP의 의미 |
| 마이크로아키텍처 | ISA를 실제로 실행하는 내부 구조 | 단일 사이클, 다중 사이클, 파이프라인 |
| 회로 구현 | 게이트, 플립플롭, 타이밍, 물리 배치 | ALU, register file, 제어 신호 |

같은 ISA도 서로 다른 데이터패스와 파이프라인으로 구현할 수 있다. 교육용 8비트 CPU의 opcode 폭, 레지스터 수, 제어 핀은 그 CPU의 설계 선택이지 모든 컴퓨터의 공통 규칙이 아니다.

## 데이터패스 구성 요소

- **PC, program counter**: 현재 또는 다음에 가져올 명령어 주소를 보관한다.
- **IR, instruction register**: 가져온 명령어를 실행하는 동안 보관한다.
- **MAR, memory address register**: 메모리 접근 주소를 보관하는 교육용 데이터패스 구성 예다.
- **범용/작업 레지스터**: 피연산자와 중간 결과를 보관한다.
- **ALU**: 산술, 논리, 비교 연산을 수행한다.
- **플래그/상태 레지스터**: zero, carry 같은 조건을 저장할 수 있다.
- **버스와 MUX**: 어느 값을 어느 입력으로 보낼지 선택한다.
- **메모리 인터페이스**: 주소, read/write, 데이터 신호를 연결한다.

공유 버스 구조는 배선 수를 줄이지만 한 번에 한 장치만 구동하도록 제어해야 한다. MUX 기반 구조는 선택 경로가 명시적이지만 입력 수가 늘면 선택 회로도 커진다.

## 제어장치

제어장치는 opcode, 현재 단계, 플래그를 입력으로 받아 레지스터 load, 버스 output enable, ALU operation, 메모리 read/write, PC increment/load 같은 제어 신호를 만든다.

- **hardwired control**: 디코더와 논리회로로 제어 신호를 직접 만든다.
- **microprogrammed control**: 명령어의 세부 단계를 제어 메모리의 microinstruction으로 표현한다.

스텝 카운터와 opcode 디코더를 조합한 교육용 제어장치는 각 시간 단계와 명령어에 맞는 제어선을 활성화하는 hardwired control의 한 형태다.

## Fetch, decode, execute

개념적 명령어 사이클은 세 단계로 설명할 수 있다. 실제 CPU는 단계를 겹치거나 더 잘게 나눌 수 있다.

### 1. Fetch

```text
MAR <- PC
IR  <- Memory[MAR]
PC  <- PC + instruction_length
```

명령어 주소를 메모리에 제시하고, 읽은 명령어를 IR에 저장하며, PC를 다음 순차 주소로 갱신한다. 구현에 따라 여러 동작이 한 사이클에 겹치거나 MAR 없이 바로 주소를 낼 수 있다.

### 2. Decode

명령어 비트에서 opcode, 레지스터 번호, immediate, 주소 필드를 해석한다. 명령어 형식은 디코딩 회로의 복잡도와 표현 가능한 피연산자 범위를 함께 결정한다.

### 3. Execute

| 명령 종류 | 대표 데이터 이동 |
|---|---|
| immediate load | `R <- immediate` |
| memory load | `R <- Memory[address]` |
| store | `Memory[address] <- R` |
| arithmetic | `Rdst <- ALU(Ra, Rb)` |
| jump/branch | 조건에 따라 `PC <- target` |
| output/halt | 외부 장치 전달 또는 실행 정지 |

각 행은 하나의 기계 명령이 내부에서 수행할 수 있는 micro-operation의 요약이다. 메모리 지연과 데이터패스 제약 때문에 여러 클럭 단계가 필요할 수 있다.

## 명령어 형식

교육용 8비트 CPU는 상위 4비트를 opcode, 하위 4비트를 주소/immediate로 나눌 수 있다. 그러면 opcode 16개와 4비트 피연산자를 표현하지만 주소 범위와 상수 범위도 작아진다.

상용 ISA는 명령어 폭, opcode, 레지스터 지정자, immediate 배치를 서로 다르게 설계한다. 예를 들어 RISC-V RV32I는 기본 명령어가 32비트이고 여러 형식을 사용하며, `pc`가 현재 명령어 주소를 보관한다. 이 사례를 모든 ISA의 규칙으로 일반화하면 안 된다.

## 기계어, 어셈블리어, 어셈블러

- **기계어**: ISA가 정의한 명령어 비트 인코딩이다.
- **어셈블리어**: 기계 명령과 피연산자를 mnemonic, 레이블 등으로 표현한다.
- **어셈블러**: 어셈블리 소스를 기계어와 재배치 정보가 담긴 오브젝트로 변환한다.
- **링커**: 여러 오브젝트의 심볼 주소를 정하고 재배치를 적용해 실행 가능한 이미지를 만든다.

기계 명령과 mnemonic이 대응하더라도 소스 한 줄이 항상 기계 명령 하나인 것은 아니다. pseudo-instruction은 다른 실제 명령으로 확장될 수 있고, label/directive는 명령을 만들지 않으며, macro는 여러 명령을 만들 수 있다. RISC-V의 `mv rd, rs`도 실제로 `addi rd, rs, 0`으로 표현되는 assembler pseudo-instruction이다.

## 분기, 플래그, 인터럽트

### 분기

조건 분기는 비교 결과나 상태를 보고 PC를 목표 주소로 바꾼다. zero/carry 플래그를 쓰는 ISA도 있고, 비교와 분기를 한 명령에 결합하는 ISA도 있다.

### 예외와 인터럽트

- **예외(exception)**: 현재 명령 실행과 동기적으로 발생한다. 잘못된 명령, 접근 오류 등이 예다.
- **인터럽트(interrupt)**: 타이머/I/O처럼 실행 흐름 외부 사건으로 비동기적으로 도착한다.

일반적으로 CPU는 현재 실행 위치와 필요한 상태를 보존하고 핸들러 주소로 제어를 옮긴 뒤, 처리 후 복귀한다. 정확한 우선순위, 저장 상태, 벡터 방식은 ISA와 시스템에 따라 다르다. 정수 오버플로가 항상 예외/인터럽트가 되는 것은 아니다.

## 파이프라인과 캐시로 확장

- **파이프라인**: 여러 명령의 fetch/decode/execute 단계를 겹쳐 처리량을 높인다. 의존성, 분기, 자원 충돌을 다뤄야 한다.
- **캐시**: 자주 접근할 가능성이 높은 메모리 블록을 CPU 가까이에 두어 평균 접근 지연을 줄인다.
- **RISC/CISC**: 명령어 수만으로 단순 이분하지 않는다. 인코딩, 실행 모델, 구현 방식은 현대 CPU에서 서로 영향을 주고받는다.

## 추적 디버깅 순서

1. PC가 예상한 명령어 주소를 가리키는지 본다.
2. IR의 비트가 의도한 opcode/operand로 decode되는지 본다.
3. 각 단계에서 활성화된 제어 신호를 기록한다.
4. 버스 구동자가 하나인지, 레지스터가 올바른 에지에 load되는지 확인한다.
5. ALU 결과와 플래그, 메모리 read/write 주소를 함께 추적한다.

## 면접 체크포인트

- ISA와 마이크로아키텍처를 구분할 수 있는가
- 데이터패스와 제어장치의 책임을 나눠 설명할 수 있는가
- fetch/decode/execute를 레지스터 전송 수준으로 추적할 수 있는가
- PC, IR, MAR, ALU, 플래그의 역할을 연결할 수 있는가
- 어셈블리 소스 한 줄과 기계 명령이 항상 1대1이 아닌 이유를 설명할 수 있는가
- 예외와 인터럽트의 동기/비동기 차이를 설명할 수 있는가

## 출처

- 인프런, 널널한 개발자 강사, [컴퓨터가 연산하는 과정](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128248)
- 인프런, 감자 강사, [중앙 처리 장치](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=276752), [명령어](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=280428), [프로그램 카운터](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=280866)
- 인프런, 감자 강사, [명령어 인출](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281027), [명령어 실행 - ADD](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281069), [제어 장치 조립](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281076)
- 인프런, 감자 강사, [기계어 프로그래밍](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281077), [어셈블러와 어셈블리어](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281078), [상용 컴퓨터](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281081)
- [RISC-V RV32I Base Integer Instruction Set](https://docs.riscv.org/reference/isa/unpriv/rv32.html)

## 관련 문서

- [[CPU-and-Arithmetic|CPU와 산술논리연산]]
- [[Sequential-Logic-and-Memory|순차 논리회로와 메모리]]
- [[Digital-Fundamentals|디지털 기초]]
- [[Compile-and-Runtime|컴파일과 런타임]]

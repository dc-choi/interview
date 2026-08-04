---
tags: [cs, sequential-circuit, latch, flip-flop, register, memory]
status: done
category: "CS - 기초"
aliases: ["순차 논리회로", "래치와 플립플롭", "레지스터와 RAM"]
verified_at: 2026-08-04
---

# 순차 논리회로와 메모리

조합회로가 현재 입력을 계산한다면 순차회로는 이전 상태까지 반영한다. CPU의 레지스터, 프로그램 카운터, RAM은 값을 기억하는 순차회로와 이를 선택하는 조합회로를 함께 사용한다.

## 상태와 피드백

| 구분 | 출력 결정 요인 | 예시 |
|---|---|---|
| 조합 논리회로 | 현재 입력 | 가산기, MUX, 디코더 |
| 순차 논리회로 | 현재 입력과 저장된 상태 | 래치, 플립플롭, 레지스터, 카운터 |

순차회로는 출력 일부를 입력으로 되먹임해 상태를 유지한다. 실제 회로에는 전파 지연이 있으므로 피드백을 아무렇게나 연결하면 진동하거나 불안정한 값이 생길 수 있다. 클럭과 저장 소자는 상태 변경 시점을 통제한다.

## 래치와 플립플롭

- **래치**: enable이 활성화된 레벨 동안 입력 변화가 상태에 반영되는 level-sensitive 소자다.
- **플립플롭**: 상승/하강 에지 같은 특정 순간의 입력을 저장하는 edge-triggered 소자다.

두 용어를 혼용하기도 하지만 타이밍 모델이 다르므로 회로를 읽을 때 활성 레벨과 트리거 에지를 확인한다.

| 소자 | 입력 | 핵심 동작 |
|---|---|---|
| SR latch | Set, Reset | 설정/초기화로 1비트 상태를 유지한다. 특정 동시 입력은 구현에 따라 금지 상태가 된다. |
| D latch | Data, Enable | Enable이 활성화된 동안 D를 따라가고 비활성화되면 마지막 값을 유지한다. |
| D flip-flop | Data, Clock | 지정된 클럭 에지의 D를 저장한다. |
| JK flip-flop | J, K, Clock | 설정/초기화에 더해 두 입력 활성 시 토글 동작을 제공한다. |

### 타이밍 조건

클럭 에지 직전과 직후에 입력이 충분히 안정되어야 한다.

- **setup time**: 에지 전에 입력이 안정되어야 하는 최소 시간
- **hold time**: 에지 후에도 입력을 유지해야 하는 최소 시간
- 조건을 어기면 출력이 한동안 0/1로 확정되지 않는 metastability가 발생할 수 있다.

동기식 설계는 저장 소자 사이의 조합 경로가 다음 클럭 에지 전에 안정되도록 클럭 주기를 정한다.

## 레지스터

여러 개의 1비트 저장 소자를 같은 클럭과 제어선으로 묶으면 다비트 레지스터가 된다.

```text
if reset: Q <- 0
else if clock edge and write_enable: Q <- D
else: Q 유지
```

- 데이터 폭은 저장 소자의 개수로 정한다.
- write enable은 값을 갱신할지 유지할지 결정한다.
- output enable은 공유 버스에 값을 내보낼지 결정할 수 있다.
- 여러 레지스터와 읽기/쓰기 선택 회로를 묶으면 register file을 만들 수 있다.

프로그램 카운터도 레지스터의 한 종류다. 보통 다음 명령어 주소로 증가하지만 분기/점프 때는 새 주소를 적재한다.

## RAM을 회로로 보기

RAM은 주소로 여러 저장 위치 중 하나를 선택한다.

```text
주소 a비트 -> 2^a개 word 선택
데이터 d비트 -> word 하나의 폭
총 저장 비트 -> 2^a × d
```

예를 들어 주소 4비트, 데이터 8비트인 메모리는 `16 × 8 = 128`비트, 즉 16바이트를 저장한다. 데이터 폭이 8비트일 때만 word 수와 바이트 수가 같다.

### 쓰기 경로

1. 주소 디코더가 대상 word를 고른다.
2. write enable과 클럭 조건이 맞으면 입력 데이터를 해당 word에 저장한다.
3. 다른 word는 기존 상태를 유지한다.

### 읽기 경로

선택된 word를 MUX나 버스 구조로 출력한다. 읽기가 주소 변경 즉시 반영되는지, 클럭 에지에 맞춰 나오는지는 메모리 인터페이스 설정과 구현에 따라 다르다.

## 메모리 계층

저장 장치는 하나의 RAM 덩어리가 아니다.

| 계층 | CPU와의 거리 | 일반적 역할 |
|---|---|---|
| 레지스터 | CPU 내부 | 현재 연산의 피연산자와 상태 |
| 캐시 | CPU 내부/인접 | 자주 접근하는 메모리 블록 |
| 주기억장치 | 시스템 메모리 | 실행 중인 코드와 데이터 |
| 보조기억장치 | I/O 장치 | 장기 보관 |

레지스터, 캐시, 주기억장치는 용량, 지연 시간, 비용의 균형점이 다르다. SRAM/DRAM이라는 회로 구현 차이와 캐시/RAM이라는 시스템 역할을 같은 분류로 혼동하지 않는다.

## 설계 검증 질문

- reset은 동기식인가 비동기식인가
- 저장은 상승 에지, 하강 에지, 활성 레벨 중 언제 일어나는가
- read/write가 동시에 활성화되면 이전 값과 새 값 중 무엇이 보이는가
- enable이 비활성일 때 출력은 유지, 0, high impedance 중 무엇인가
- 주소 폭과 데이터 폭으로 실제 용량을 올바르게 계산했는가

## 면접 체크포인트

- 조합회로와 순차회로의 차이를 상태 관점에서 설명할 수 있는가
- 래치와 플립플롭의 타이밍 차이를 설명할 수 있는가
- 레지스터와 RAM을 저장 소자, 디코더, MUX로 분해할 수 있는가
- setup/hold 위반과 metastability의 관계를 설명할 수 있는가
- 주소 폭, word 수, 데이터 폭, 총 바이트를 구분할 수 있는가

## 출처

- 인프런, 널널한 개발자 강사, [컴퓨터가 기억공간을 관리하는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128249)
- 인프런, 감자 강사, [조합 논리회로와 순차 논리회로](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279248), [SR Latch](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279634), [D Latch](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279635)
- 인프런, 감자 강사, [클럭과 플립플롭](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279637), [레지스터](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=279638), [RAM](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=280414)
- [Logisim-evolution Register Reference](https://mbaillif.github.io/Logisim-evolution-documentation/en/html/libs/mem/register.html)
- [Logisim-evolution RAM Reference](https://mbaillif.github.io/Logisim-evolution-documentation/en/html/libs/mem/ram.html)

## 관련 문서

- [[CPU-and-Arithmetic|CPU와 산술논리연산]]
- [[CPU-Datapath-Control-and-Instruction-Cycle|CPU 데이터패스와 명령어 사이클]]
- [[Digital-Fundamentals|디지털 기초]]

---
tags: [cs, cpu, assembly, control-unit]
status: done
category: "CS - 기초"
aliases: ["Educational CPU Programs", "교육용 CPU 프로그램과 제어"]
---

# 교육용 CPU의 제어와 반복 프로그램

8 bit data, 4 bit 주소, 누산기 A와 보조 입력 B를 가진 단순 CPU를 기준으로 명령을 register 전송으로 추적한다. 다음 표의 신호명과 opcode는 이 교육 설계의 예시이며 다른 ISA의 규칙이 아니다.

## 단계별 제어

xO는 해당 장치가 bus를 구동하는 output enable, xI는 bus 값을 적재하는 input enable이다. MI는 MAR, II는 IR, AI/BI는 A/B, RI는 RAM write, EO는 ALU output, FI는 flag 저장이다. CO는 PC 출력, CE는 PC 증가, J는 PC jump 적재다. 한 단계에서 bus driver는 하나여야 한다.

공통 fetch는 Step0의 CO,MI로 MAR에 PC를 넣고 Step1의 RO,II,CE로 RAM 명령을 IR에 넣으면서 PC를 증가시킨다. PC 증가는 내부 경로라 RAM의 bus 전송과 공존한다.

| 명령 | Step2 | Step3 | Step4 |
|---|---|---|---|
| LOADA | IO,MI | RO,AI | 없음 |
| ADD | IO,MI | RO,BI | EO,AI,FI |
| SUB | IO,MI | RO,BI | EO,AI,SU,FI |
| STOREA | IO,MI | AO,RI | 없음 |
| LOADI | IO,AI | 없음 | 없음 |
| JMP | IO,J | 없음 | 없음 |
| JMPC/JMPZ | 조건 flag가 1이면 IO,J | 없음 | 없음 |
| OUT | AO,OI | 없음 | 없음 |
| HLT | clock 정지 | 없음 | 없음 |

IR 하위 operand를 MAR에 넣은 다음 RAM을 읽는다. ADD는 B를 적재한 뒤 ALU가 안정된 값을 다음 단계에 A로 적재한다. RO와 EO를 함께 켜면 bus를 다투므로 단계를 나눈다.

Hardwired control은 opcode decoder와 step decoder의 출력을 AND해 micro-operation을 고르고, 같은 제어 신호를 사용하는 단계들을 OR로 합친다. 조건 분기는 flag도 AND 조건에 넣는다. NOP은 fetch 외에 아무 제어도 켜지 않게 설계할 수 있다. 고정 step counter면 유휴 단계도 소비하지만 early reset 설계는 그렇지 않으므로 실제 clock 수는 회로에서 확인한다.

## 시험 결과를 확정한 뒤 저장

8 bit 뺄셈을 A+NOT(B)+1로 계산하면 C=1은 unsigned borrow가 없다는 뜻이다. 곱셈을 반복 덧셈으로 구현할 때 승수를 먼저 1 줄여 보고 C=1일 때만 줄어든 승수를 저장하고 결과에 피승수를 더한다. 5×4는 결과 5,10,15,20을 거쳐 승수 0에서 다음 시험 뺄셈이 borrow를 내 종료한다.

나눗셈은 피제수에서 제수를 시험으로 빼고 C=1일 때만 차이를 저장하고 몫을 1 늘린다. 7÷3은 7→4→1, 몫 0→1→2이며 다음 1-3이 borrow라 종료한다. 실패한 차이를 memory에 쓰지 않아 기존 값 1이 나머지로 남는다. 이 회로는 같을 때도 C=1이라 zero flag의 추가 검사는 >= 조건에 필요 없다.

## 경계와 비용

- 제수가 0이면 빼도 감소하지 않아 무한 반복한다. 실행 전에 거부한다.
- 곱이 255를 넘는데 carry를 검사하지 않으면 하위 8 bit만 남는다.
- 부호 있는 표시가 음수여도 unsigned borrow 판정은 다르다. 200-3의 197은 signed 표시에서 음수지만 borrow가 없다.
- 반복 수가 승수나 몫의 값에 비례하므로 bit 수에 비례하는 shift 기반 연산과 비용이 다르다.
- 명령과 data가 16 byte를 공유하므로 배치와 jump 대상, HLT 뒤 data 접근을 함께 검증한다.

## 출처

- [인프런, 감자 강사, 명령어 인출](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281027)
- [인프런, 감자 강사, 제어 장치 조립](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281076)
- [인프런, 감자 강사, 어셈블리 언어 프로그래밍, 곱하기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281079)
- [인프런, 감자 강사, 어셈블리 언어 프로그래밍, 나누기](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281080)

## 관련 문서

- [[CPU-Datapath-Control-and-Instruction-Cycle|ISA, 데이터패스와 처리량]]
- [[CPU-and-Arithmetic|ALU와 carry]]
- [[Sequential-Logic-and-Memory|register와 timing]]

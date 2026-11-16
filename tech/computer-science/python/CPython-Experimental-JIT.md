---
tags: [python, cpython, jit, pep, governance]
status: done
verified_at: 2026-11-17
category: "CS&프로그래밍(CS&Programming)"
aliases: ["CPython JIT", "CPython 실험적 JIT", "PEP 744", "PEP 836"]
---

# CPython 실험적 JIT과 PEP 거버넌스

CPython의 실험적 JIT은 바이트코드를 더 작은 연산(uop)으로 나눈 경로를 기계어로 바꿔 실행하는 컴파일러다. 기술적으로 동작하는 코드가 main에 들어 있어도, 지원 기능이 되려면 PEP 절차로 공동체와 Steering Council의 결정을 받아야 한다. 2026년 기한 안에 수락된 PEP가 없으면 main에서 빠질 수 있는 상황이 된 사례는 오픈소스에서 코드 병합과 장기 유지 합의가 다른 단계임을 보여 준다.

## 동작 원리

- **copy-and-patch**: 인터프리터를 생성하는 것과 같은 DSL에서 템플릿 JIT를 만든다. 빌드할 때 LLVM으로 각 uop를 기계어 조각으로 컴파일해 템플릿을 만든다(PEP 744). 실행 중에는 미리 만든 조각(stencil)을 복사하고 런타임 정보로 빈 자리를 채운다(CPython InternalDocs).
- **LLVM 의존은 빌드 시점뿐**: 템플릿을 만들 때 LLVM이 필요하고 런타임 의존성은 없다. PEP 744는 빌드 시간이 3~60초 늘어난다고 적는다. PEP 836은 빌드 시점 LLVM 의존을 바꾸지 않는다고 밝히고(제거는 기각한 안), 한 Python 릴리스 동안 특정 LLVM 버전 하나에 묶이는 배포 문제를 과제로 들었다.
- **기본은 꺼짐**: PEP 744는 JIT을 기본 빌드 구성에 넣지 않는다고 적는다. PEP 836은 공식 Windows, macOS 바이너리가 JIT을 빌드해 넣되 기본으로 끈 상태로 배포하고 사용자가 `PYTHON_JIT=1`로 켤 수 있다고 설명한다.
- **버전 흐름(PEP 836의 정리)**: 3.12에서 바이트코드 DSL과 uop, 3.13에서 trace 기반 최적화기와 copy-and-patch 백엔드, 3.14에서 리팩터링, 3.15에서 trace 기록 방식의 재작성이 들어갔다. PEP 836은 3.15의 Tier 1 플랫폼 성능 향상을 기하평균 약 4~12%로 적는다. 3.15 공식 수치와 비교 기준은 [[Python-315-Language-Changes|Python 3.15 변경]]을 본다.

## Informational PEP와 Standards Track PEP

PEP 744는 Informational PEP이고 상태가 Draft로 남아 있다. Informational PEP는 설계 배경과 지침을 설명하는 문서로, 기능을 지원 대상으로 받아들이는 결정 절차가 아니다. PEP 744는 JIT이 실험 딱지를 떼는 조건으로 하나 이상의 주요 플랫폼에서 의미 있는 속도 향상(현실적으로 5% 안팎), 큰 혼란 없는 빌드와 배포, Steering Council이 켜는 편이 낫다고 판단하는 것을 들었다.

2026-06-05 Steering Council은 JIT을 지원되는 비실험 기능으로 다룰 근거를 담은 Standards Track PEP를 요청했다.

- 해당 PEP가 받아들여질 때까지 새 기능, 최적화와 성능 작업을 main에 넣지 말라고 했다. 버그와 보안 수정은 계속할 수 있다.
- PEP가 다룰 질문으로 장기 유지 부담(JIT을 다루지 않는 유지보수자 포함), free-threading, 프로파일러와 디버거 호환성, 성능 목표, 플랫폼 범위와 메모리 같은 측정 지표와 일정, 다른 JIT(CinderX, Numba, PyTorch)와의 관계, 현재 구조의 안정성을 들었다.
- 6개월 안에 그런 PEP가 수락되지 않으면 JIT 코드를 main에서 빼고 저장소 밖에서 개발해야 한다고 했다. 같은 날 위원회 구성원은 이 기한을 고정 마감이 아니라 첫 목표로 설명하며 연장 요청이 가능하다고 덧붙였다.

## PEP 836의 제안과 철회

PEP 836(JIT Go Brrr, 2026-07-02 작성, 대상 3.16)은 약 2년 반의 단계별 목표를 걸고 JIT을 main에 유지하는 경로를 제안했다.

- 3.16 첫 베타까지: method 기반 frontend 전환, free-threading 호환, 프로파일러와 디버거 테스트 보강, 배포 방안 개선, GIL 빌드 기준 5% 이상 향상 유지(퇴행 방지 하한)
- 3.17 첫 베타까지: free-threading 빌드에서 JIT을 켠 경우 pyperformance 기하평균 20% 이상 향상, main 유지의 최소 목표
- 3.17 첫 RC까지: 호환성 검토
- 비실험 기능이 되어도 기본 활성화는 Release Manager의 별도 승인이 필요하다

2026-09-21 Steering Council은 PEP가 요청한 질문에 대부분 답했고 크게 빠진 부분은 없다고 하면서도 10개 항목의 보완 의견을 냈다. 모두가 수락을 막는 기준은 아니라고 밝혔다. 메모리 영향 서술은 모호하고 낙관적이며, 보안은 충분히 다뤄지지 않은 영역이라고 했다. 마지막 반년에 몰아 둔 호환성 검토는 너무 늦으며 계속 진행해야 한다고 했다.

2026-10-19 저자 측은 현재 안을 끌고 갈 개인적 여력이 없다며 PEP 836을 철회했다. 기술 방향(free-threading 지원, method 기반 frontend)은 여전히 지지하며 참조 구현을 공개해 철회된 PEP에서 링크하겠다고 했다. PEP는 Steering Council에 결정을 요청하는 단계까지 가지 않았고, 위원회 구성원은 이후 PEP 836에 대해 어떤 결정도 내린 적이 없다고 밝혔다.

## 현재 상태 (2026-11-17 확인)

- 2026-10-29 시점 위원회 구성원 개인 의견으로는 철회 뒤 JIT에 대한 추가 결정이 없었다.
- 토론 참여자들은 6개월 기한을 2026-12-05로 계산하고, 그때까지 다른 PEP가 수락되지 않으면 main에서 제거된다고 적는다. 3.14와 3.15의 JIT은 버그 수정을 계속 받는다는 설명도 같은 참여자의 글이다. 다른 참여자는 같은 날 기한에 유연성과 연장의 여지가 있다고 덧붙였다. 제거 시점과 방식은 위원회의 공식 공지로 확인하지 못했다.
- 관측은 엇갈린다. 위원회 구성원은 JIT이 취소되지도 PEP 836이 거절되지도 않았다고 했고, 다른 참여자는 CPython 저장소에서의 JIT 작업은 멈췄다고 답했다.
- 2026-11-17 기준 CPython main에는 JIT 코드(`Tools/jit`)가 남아 있다.
- 3.16은 2026-11-10 alpha 2까지 나왔고 alpha 3은 2026-12-15, 첫 베타는 2027-05-04 예정이다(PEP 826). 12월 초는 alpha 단계다.

## 판단 기준

- **기능 사용**: 이미 배포된 3.13~3.15에서 JIT을 켜 쓰는 것은 해당 버전의 지원 범위 문제다. 지원 기능으로 수락되거나 main 잔류가 공식 결정되기 전에는 3.16 이후 CPython 본체의 JIT을 전제로 성능 계획을 세우지 않는다. 성능 목표는 JIT 없는 인터프리터 기준으로 측정한다.
- **오픈소스 채택**: 병합되었고 공식 바이너리에 포함되었다는 사실은 지원 약속이 아니다. 실험 표시, 결정 문서의 종류(Informational 대 Standards Track)와 상태, 유지보수자 수를 함께 본다.
- **유지 부담의 범위**: 위원회가 JIT 작업자가 아닌 유지보수자의 부담, 보안, 호환성을 먼저 물었다는 점은 큰 내부 기능의 비용이 구현 팀 밖에서도 발생한다는 뜻이다. 사내 플랫폼에 실험 기능을 넣을 때도 해제 조건과 기한을 처음부터 정해 둔다.

## 출처

- [PEP 744, JIT Compilation](https://peps.python.org/pep-0744/)
- [PEP 836, JIT Go Brrr: The Path to a Supported JIT Compiler for CPython](https://peps.python.org/pep-0836/)
- [PEP 826, Python 3.16 Release Schedule](https://peps.python.org/pep-0826/)
- [PEP 1, PEP Purpose and Guidelines](https://peps.python.org/pep-0001/)
- [CPython, InternalDocs: The JIT](https://github.com/python/cpython/blob/main/InternalDocs/jit.md)
- [An announcement from the Steering Council regarding the JIT project — Python Discourse](https://discuss.python.org/t/an-announcement-from-the-steering-council-regarding-the-jit-project/107638)
- [PEP 836: JIT Go Brrr: The Path to a Supported JIT Compiler for CPython — Python Discourse](https://discuss.python.org/t/pep-836-jit-go-brrr-the-path-to-a-supported-jit-compiler-for-cpython/108010)

## 관련 문서

- [[Python-315-Language-Changes|Python 3.15 변경]]
- [[Compile-and-Runtime|컴파일과 런타임]]
- [[Native-Compilation-Compatibility|네이티브 컴파일과 호환성]]

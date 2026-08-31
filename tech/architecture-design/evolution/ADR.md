---
tags: [architecture, evolution, adr, decision, documentation]
status: done
category: "Architecture - 진화"
aliases: ["ADR", "Architecture Decision Record", "아키텍처 결정 기록"]
---

# ADR (Architecture Decision Record)

ADR은 되돌리기 어려운 결정 하나를 **왜 그렇게 정했는지, 결정 당시의 맥락과 함께** 남기는 짧은 기록이다. Nygard의 원 제안은 한두 페이지 분량을 기준으로 삼고, 결정을 어떻게 구현했는지가 아니라 왜 내렸는지에 초점을 둔다.

목적은 문서량을 늘리는 것이 아니라 **미래의 재검토 비용을 줄이는 것**이다. 왜가 남아 있으면 나중에 합류한 사람이 결정을 뒤집기 전에 무엇을 감수한 선택이었는지 확인할 수 있고, 같은 논쟁을 처음부터 다시 하지 않아도 된다. AWS Prescriptive Guidance는 이 효과를 두고 결정 과정에 없던 아키텍트가 나중에 그 결정을 임의로 뒤집는 것을 막는다고 표현한다.

## 무엇을 ADR로 남기는가

AWS 가이드는 아키텍처적으로 유의미한 결정을 다섯 갈래로 정리한다. 구조(마이크로서비스 같은 패턴), 비기능 요구(보안, 고가용성, 내결함성), 의존성(컴포넌트 결합), 인터페이스(API와 공개 계약), 구축 기법(라이브러리, 프레임워크, 도구와 프로세스).

실무에서는 여기에 두 가지 필터를 더 건다.

- **되돌리기 비용이 큰가** — 서비스 경계, 데이터 소유권, 외부에 공개한 계약, 저장소 선택처럼 나중에 무르는 데 분기 단위가 드는 것. 가역성 판별 자체는 [[One-Way-vs-Two-Way-Door|One-Way Door vs Two-Way Door]]의 체크리스트를 쓴다.
- **실재하는 대안이 있었나** — 사실상 선택지가 하나뿐이었다면 기록할 판단이 없다. 버릴 수 있었던 대안이 있어야 왜가 성립한다.

모든 결정을 ADR로 만들면 의식이 되어 아무도 읽지 않는다. 반대로 두 조건을 만족하는 결정을 빠뜨리면 그 자리에 [[Technical-Debt|의도 부채]]가 쌓인다.

## 최소 구조

Nygard의 원형은 제목, 상태, 맥락, 결정, 결과 다섯 항목이다. AWS는 최소 요건을 맥락, 결정, 결과 셋으로 줄인다. 실무에서 쓸 만한 형태는 다음 다섯이다.

1. **맥락(Context)** — 당시의 기술적, 조직적 제약을 중립적으로 서술한다. 그때 몰랐던 것과 확인하지 못한 가정도 같이 적어야 나중에 판단의 품질을 재구성할 수 있다.
2. **검토한 선택지** — 각 대안을 버린 이유까지 적는다. 이유 없이 나열된 대안 목록은 결론을 장식할 뿐이다.
3. **결정(Decision)** — 능동태 완결 문장으로 쓴다. Nygard는 We will 형태를, AWS는 should 같은 완곡어를 피한 명령형을 권한다.
4. **결과(Consequences)** — 결정 이후의 맥락. Nygard는 긍정적인 것만이 아니라 모든 결과를 적으라고 명시한다. 감수하기로 한 비용이 빠지면 그 ADR은 사후 홍보문이다.
5. **재검토 조건** — 어떤 신호가 관측되면 이 결정을 다시 연다. 원형 템플릿에는 없지만, 이 항목이 없으면 낡은 결정이 규칙으로 굳는다.

도구나 인프라 도입 판단은 같은 뼈대를 표로 압축해도 된다.

| 항목 | 적을 내용 |
|---|---|
| 해결할 문제 | 현재 무엇이 아픈지, 재현 가능한 증상과 규모 |
| 기존 대안 | 지금 스택으로 버티는 안을 포함해 버린 이유 |
| migration 비용 | 전환 작업, 병행 운영 기간, 학습 비용, 되돌림 비용 |
| 관측 지표 | 도입 효과를 판정할 지표와 측정 위치 |
| 되돌릴 조건 | 어떤 값이 어느 기간 유지되면 철회하는지 |

## 상태와 수명

상태는 proposed에서 시작해 accepted로 가고, 나중에 superseded 또는 deprecated가 된다. AWS의 프로세스는 리뷰 결과 rejected도 상태로 남기며, 거부 사유를 적어 같은 논의가 반복되지 않게 한다.

핵심 규칙은 **accepted된 ADR을 고쳐 쓰지 않는 것**이다. 판단이 바뀌면 새 ADR을 쓰고 옛 ADR의 상태를 superseded로 바꾼 뒤 결정 로그에 그대로 남긴다. 기록을 덮어쓰면 결정 시점의 정보 상태가 사라지고, 남는 것은 지금 알고 있는 것으로 재구성한 사후 합리화뿐이다.

수명도 다르다. 테크스펙은 구현이 끝나면 역할이 끝나지만 ADR은 시스템이 살아 있는 동안 남는다. 큰 설계를 테크스펙으로 논의한 뒤 핵심 결정만 ADR로 요약해 보관하는 흐름은 [[Tech-Spec-Writing-Review-Process|테크스펙 리뷰 프로세스]]에 정리돼 있다.

## 저장 위치와 운영

- **코드와 같은 저장소에 둔다.** Nygard는 `doc/arch/adr-NNN.md`를, 관행은 `docs/adr/NNNN-제목.md`를 쓴다. Thoughtworks Technology Radar는 2017년 11월 lightweight ADR을 Adopt로 올렸고(2018년 5월판에도 Adopt 유지), 위키나 웹사이트가 아니라 소스 관리에 저장해 코드와 동기화된 상태를 유지하라고 권했다. 위키에만 두면 코드와 갈라져 죽는다. AWS 가이드는 중앙 접근성만 확보되면 git과 위키 둘 다 허용하는 절충안을 제시하는데, 버전 관리 관점에서는 git 쪽이 유리하다.
- **번호는 불변이다.** 순차 증가하고 재사용하지 않는다. 폐기된 결정도 번호를 비우지 않고 상태만 바꾼다.
- **제목은 검색 가능한 명사구로.** 결정 내용이 제목에서 드러나야 로그를 훑는 것만으로 프로젝트 맥락이 잡힌다.
- **결정을 만든 PR과 함께 리뷰한다.** AWS는 코드 리뷰에서 ADR 위반을 발견하면 리뷰어가 해당 ADR 링크를 걸어 수정을 요청하는 흐름을 제시한다. ADR 소유자를 정해 유지와 전파 책임을 남기는 것도 같은 가이드의 권장 사항이다.
- **굳은 결정은 실행 규칙으로 승격한다.** ADR을 근거 원본으로 두고, 반복 검증이 필요한 부분은 repository instruction, 테스트, [[Architecture-Fitness-Functions|fitness function]]으로 옮긴다. 사람이 매번 문서를 기억해서 지키는 구조는 오래 못 간다.

## 문서군에서의 자리

| 문서 | 답하는 질문 | 시점 | 수명 |
|---|---|---|---|
| RFC, PRD | 왜 만드는가, 범위는 어디까지인가 | 착수 전 | 범위 확정까지 |
| 테크스펙 | 어떻게 구현하는가 | 구현 전 | 구현 완료까지 |
| ADR | 내린 결정의 왜와 감수한 비용 | 결정 시점 | 영구 |
| 런북 | 장애와 운영 상황에서 무엇을 하는가 | 운영 중 | 절차가 유효한 동안 |

테크스펙과 ADR의 상세 대비는 [[Tech-Spec-Writing-Review-Process|테크스펙 리뷰 프로세스]], RFC 구조는 [[RFC-Writing|RFC 작성법]]에 있다. 결정 자체를 내리는 절차는 [[Tech-Decision|기술 의사결정]]이 담당하고, ADR은 그 결과를 기록하는 형식과 운영을 맡는다.

## ADR이 실제로 막는 것

- **의도의 증발** — 왜가 어디에도 없으면 안전한 변경 판단이 불가능해진다. [[Technical-Debt|기술 부채]] 문서가 근거 누락(missing rationale)으로 부르는 상태이며, 처방이 곧 포착이다.
- **사후 확증 편향과 재논쟁** — 지금 아는 정보로 과거 결정을 평가하면 대부분 틀려 보인다. 결정 시점의 제약이 기록돼 있어야 판단의 질과 결과의 운을 분리할 수 있다. 관련 편향은 [[Cognitive-Biases-Programming|프로그래밍 인지 편향]]에 정리돼 있다.
- **스레드에 갇힌 결정** — 비동기, 분산 팀에서 합의가 채팅 스레드와 회의록에만 남으면 그 자리에 없던 사람은 접근할 수 없다. 결정 로그는 이 정보를 검색 가능한 형태로 옮긴다.
- **AI 보조 작업의 반복 발견 비용** — 세션마다 같은 제약을 다시 알아내는 대신 결정을 참조하게 한다. [[AI-Assisted-Legacy-Onboarding|AI 레거시 온보딩]]의 Record 단계가 새로 확인한 규칙만 repository instruction, ADR, test에 남기라고 하는 이유다.

## 흔한 실패

- 결정을 먼저 내리고 나중에 형식만 채워 넣기 (기록은 남지만 왜는 없음)
- 대안 없이 결론만 적어 선택의 폭이 있었다는 사실 자체가 사라짐
- 결과 항목에 장점만 적어 감수한 비용이 은폐됨
- 재검토 조건 누락으로 낡은 결정이 손댈 수 없는 규칙처럼 굳음
- 모든 PR에 ADR을 강제해 의식이 되고 결국 아무도 읽지 않음
- 위키에만 두어 코드와 갈라진 문서 무덤이 됨
- ADR을 설계 토론 자리로 오용해 테크스펙을 대체하려 함
- accepted된 ADR을 조용히 수정해 결정 시점의 판단이 사라짐

## 면접 체크포인트

- ADR로 남길 결정과 남기지 않을 결정을 가르는 기준
- 결과(consequences)에 부정적 영향까지 적어야 하는 이유
- 기존 ADR을 수정하지 않고 superseded 처리하는 이유
- 테크스펙, RFC, ADR, 런북의 역할과 수명 차이
- 재검토 조건이 없는 ADR이 만드는 부채
- 결정 로그를 코드 저장소에 두는 것과 위키에 두는 것의 차이

## 출처

- [Documenting Architecture Decisions — Cognitect, Michael Nygard](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Architectural Decision Records (ADRs) — ADR GitHub organization](https://adr.github.io/)
- [Lightweight Architecture Decision Records — Thoughtworks Technology Radar](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
- [AWS Prescriptive Guidance, Architectural decision record process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)
- [AWS Prescriptive Guidance, Best practices for using architectural decision records](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/best-practices.html)

## 관련 문서

- [[Tech-Spec-Writing-Review-Process|테크스펙 리뷰 프로세스와 ADR의 차이]]
- [[Tech-Decision|기술 의사결정 프레임워크]]
- [[One-Way-vs-Two-Way-Door|가역성 판별]]
- [[Technical-Debt|기술 부채와 의도 부채]]
- [[Architecture-Fitness-Functions|아키텍처 fitness function]]
- [[RFC-Writing|RFC 작성법]]
- [[AI-Assisted-Legacy-Onboarding|AI 레거시 온보딩]]
- [[Cognitive-Biases-Programming|프로그래밍 인지 편향]]

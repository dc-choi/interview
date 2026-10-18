---
tags: [palantir, pipeline, project, release]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry pipeline project와 release"]
---

# Pipeline의 Project와 release 경계

Project는 목적, 출력 계약, 권한과 운영 책임을 함께 나누는 단위다. API가 명확하고 작은 소유 팀이 조율할 수 있도록 범위를 정한다. Project와 repository의 1:1은 기본 설계 권고이며, Marking 제거의 별도 보안 검토 경계처럼 합리적인 예외가 있다.

## 출력에서 거꾸로 설계한다

운영 객체와 소비 workflow가 요구하는 schema, refresh, end-to-end 지연, 품질과 권한을 먼저 정한다. 그다음 source와 변환을 선택한다. Source의 갱신 빈도보다 엄격한 freshness는 downstream schedule만 늘려 해결할 수 없다. 2시간 주기에 1시간 30분 build가 들어맞는지도 장애 여유를 포함해 검토한다.

논리적 단계는 다음과 같이 분리한다. 모든 조직에 이 다섯 종류를 강제하는 규격은 아니다.

| 단계 | 책임과 안정적인 출력 |
|---|---|
| Data Connection | 원천 연결, sync와 SNAPSHOT/APPEND 선택, source 접근 책임 |
| Datasource Project | 원천별 raw 보존, 일관된 clean schema, 초기 민감정보 최소화 |
| Transform Project | source 간 결합, 공통 metric과 재사용 dataset |
| Ontology Project | 운영 객체에 맞춘 canonical 데이터 계약 |
| Workflow Project | 승인된 데이터를 활용하는 UI, 분석과 모델 |

Raw→clean은 가능하면 원천 table/file과 1:1로 대응하고 naming/type/오류 처리 기준을 안정화한다. Source timestamp나 numeric 형식이 불안정하면 STRING으로 가져와 명시적으로 parse한다. 숫자로 보이는 ID는 산술 대상이 아니면 STRING을 택해 선행 0과 긴 식별자를 보존한다. Timezone은 source에서 UTC로 정규화하고 표시와 저장 의미를 구분한다.

Datasource의 `/raw`, 선택적 `/processed`, `/clean`, Transform의 `/data/output`, Ontology의 `/data/ontology`처럼 소비할 출력을 쉽게 찾게 한다. `/analysis`, `/scratchpad`, `/documentation`을 운영 출력과 구분한다. Workflow의 주요 application은 접근하기 쉬운 위치에 두고 공통 객체의 우회 복제보다 Ontology 확장을 검토한다.

## 품질 실패 정책은 명시적인 선택이다

잘못된 데이터를 차단해 이전 유효 output을 유지할지, 최신성을 유지하며 경보할지 SLA와 업무 위험으로 결정한다. Health check를 추가했다는 사실과 publication을 막는 gate의 존재는 다르다. 기본 size/duration 추세와 별도 검증 dataset을 통해 domain invariant를 확인할 수 있다.

단위 테스트는 작은 로직을 독립적으로 검증한다. 전체 build output을 직접 검증해야 sample preview와 실제 데이터의 차이를 찾을 수 있다. Circular dependency 검사는 작성 중 branch 범위이며 다른 branch에만 존재하는 writeback과 결합되는 순환은 merge checks에서 드러날 수 있다.

잘못된 transaction을 수정할 때 resource를 지웠다 같은 위치에 다시 만드는 대신 적절한 SNAPSHOT으로 overwrite한다. Dataset RID와 연결된 downstream 의존성까지 고려한다. 이 원칙은 실수한 데이터의 보존 의무나 삭제 정책을 대체하지 않는다.

## Branch와 release는 데이터 계약을 포함한다

여러 repository가 하나의 product를 구성하면 동일 branch 이름으로 fallback을 맞추는 방식이 유용하다. Feature branch에 실제 입력 데이터가 있는지, 다른 branch override가 있는지 확인해야 code branch만 만든 상태를 end-to-end 격리로 오해하지 않는다.

Protected master, 통합용 develop과 feature branch, release manager 승인, maintenance window는 가능한 운영 패턴이다. 제시된 GitFlow 변형이나 예시 요일이 제품의 필수 실행 계약은 아니다. Feature branch에서 실제 build와 schema/health 변화, 소비자 검토를 마친 뒤 production code와 data의 반영을 각각 확인한다.

Column 이름/type 변경은 downstream API 변경으로 다룬다. 새 field를 먼저 제공하고 소비자에게 이전 기간을 준 뒤 옛 field를 제거한다. Upstream schema 변화가 Ontology에 불필요하게 새어 나오지 않도록 변환 경계에서 안정화한다. Affected datasets와 schema diff를 release 검토에 포함한다.

Language bundle upgrade도 feature cycle에서 CI와 실제 build를 실행하고 merge한다. 배포 뒤 열린 feature branch에 변경을 다시 반영한다. 공유 library는 semantic version을 고정해 critical pipeline이 새 major를 의도적으로 채택하게 할 수 있다. 공통 로직을 공유하되 SLA가 다른 경우 dataset과 schedule까지 강제로 공유할 필요는 없다.

## 운영 책임은 사람 이름보다 역할로 남긴다

Datasource owner/developer는 원천 품질과 sync, agent administrator는 연결 실행 환경, pipeline developer는 변환과 공통 객체, release/operations manager는 배포와 건강 상태, compliance 역할은 목적과 접근 범위를 책임진다. 작은 팀에서는 한 사람이 여러 역할을 맡을 수 있다.

Project 설명에는 목적과 primary output, repository에는 설계와 변환 설명, dataset에는 provenance/schema/운영 요청 경로를 둔다. 주석은 이유와 제약을 설명하고 옛 code나 작성자/날짜는 Git 이력에 맡긴다. 문서와 경보가 처음 작성자 외의 유지보수자에게도 실행 가능한지 확인한다.

## 출처

- [Palantir, Building production pipelines](https://www.palantir.com/docs/foundry/building-pipelines/building-production-pipeline)
- [Palantir, Recommended project and team structure](https://www.palantir.com/docs/foundry/building-pipelines/recommended-project-structure)
- [Palantir, Development best practices](https://www.palantir.com/docs/foundry/building-pipelines/development-best-practices)
- [Palantir, Branching and release process](https://www.palantir.com/docs/foundry/building-pipelines/branching-release-process)
- [Palantir, Pipeline security](https://www.palantir.com/docs/foundry/building-pipelines/security-overview)

## 관련 문서

- [[Palantir-Branching-and-Packaging-Boundaries|Branch와 packaging]]
- [[Palantir-Pipeline-Markings-and-Declassification|Marking 제거와 승인]]
- [[Palantir-Pipeline-Schedule-Resolution|Schedule의 실행 범위]]

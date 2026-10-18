---
tags: [palantir, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Scenario의 격리, 수명과 병합 계약

Scenario는 업무 사용자가 what-if 변경을 비교하는 sandbox다. Builder가 전체 workflow를 개발하는 global branch와 목적이 다르다. 기능은 beta이고 OSDK API는 experimental이므로 enrollment 지원을 확인한다.

## 현재 데이터 위의 변경이며 과거 snapshot이 아니다

Scenario는 main 또는 global branch의 최신 상태 위에 10분마다 자동 rebase된다. 임의 rebase와 주기 변경은 지원하지 않는다. 과거 시점 데이터 보관이나 재현 가능한 snapshot으로 사용하면 안 된다.

기본 수명은 31일이다. 만료하면 변경과 backing scenario object도 삭제된다. Persisted scenario의 Timestamp expiration property로 시점을 조정할 수 있지만 현재 시점에서 31일을 넘길 수 없다. 저장했다는 이유로 영구 감사 기록이 되는 것은 아니다. 장기 보존이 필요하면 별도 정책이 필요하다.

Temporary scenario의 metadata는 현재 세션에만 존재한다. Workshop 세션을 끝내면 사라진다. Persisted scenario는 Ontology Scenario interface를 구현하는 object에 metadata를 저장하고 Scenario Reference를 primary key로 사용한다.

## 읽기와 쓰기의 context를 함께 지정한다

Workshop에서는 Scenario Manager의 active scenario를 Object Table의 Load Data from Scenario와 Action의 Apply to Scenario 양쪽에 연결한다. Summary로 변경을 확인하고 chart의 layer별 scenario를 비교한다. Scenario 전용 설정이 없는 Metric Card도 object set aggregation variable의 scenario를 지정할 수 있다. 화면만 scenario를 읽고 Action이 main에 쓰지 않도록 연결을 확인한다.

일반 함수는 scenario context로 읽고 수정한다. AIP Logic은 호출하는 nested Logic을 포함해 staged writes를 활성화해야 한다. Scenario 안의 Action 기준과 main 변경 기준은 execution context로 구분할 수 있다.

## 승인과 병합

Scenario object의 Created By, Status, Reviewed By와 Reviewed At을 업무에 맞춰 두고 object security policy와 Action submission criteria로 통제한다. 그룹 이름보다 안정적인 group ID를 사용하고 type definition 접근 권한도 확인한다. Only allow edits via actions를 설정해 상태 전이를 Action으로 제한한다.

Draft 제출, In review 승인/거절과 main 병합은 각각 허용 주체와 현재 상태를 검사한다. Apply Scenario rule을 가진 merge Action은 지정한 object/link type의 staged edits를 단일 Ontology transaction으로 적용한다. Action 크기 제한이 적용되며 외부 시스템까지 원자적으로 반영된다는 뜻은 아니다.

## OSDK 버전과 API 경계

| 경로 | 확인한 계약 |
| --- | --- |
| TypeScript | `@osdk/client` 2.27.0 이상, matching generated SDK, `unstable-do-not-use` import |
| Python | 2.209.0 이상, edited entity 열거는 2.221.0 이상, `AllowBetaFeatures` context |
| Create | 서버 호출로 새 scenario 생성, base client의 branch를 사용 |
| Attach | 기존 RID로 client 구성, TypeScript `withScenario` 자체는 network call 없음 |
| Query/Action | scenario client를 통해 호출해야 scenario context 적용 |
| Merge | main client로 merge Action 호출, scenario client 또는 RID 전달 |

Scenario 내 batch Action, scenario 중첩과 transaction 결합은 지원하지 않는다. Edited entity 열거 결과는 API name과 primary key만 있는 sparse identifier다. 실제 속성은 scenario client로 다시 읽고 삭제된 객체는 없을 수 있다. Iterator는 pagination과 primary key 중복 제거를 처리한다.

Edited link API는 many-to-many만 반환한다. One-to-many 변경은 foreign key를 소유한 object type의 edited objects에서 확인한다. 따라서 link 목록만으로 모든 관계 변경을 조사했다고 판단하면 안 된다.

## 출처

- [Palantir, merge-scenario](https://www.palantir.com/docs/foundry/ontology/merge-scenario)
- [Palantir, osdk-scenario](https://www.palantir.com/docs/foundry/ontology/osdk-scenario)
- [Palantir, overview-ontology-scenario](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)
- [Palantir, persisted-scenario](https://www.palantir.com/docs/foundry/ontology/persisted-scenario)
- [Palantir, temporary-scenario](https://www.palantir.com/docs/foundry/ontology/temporary-scenario)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.

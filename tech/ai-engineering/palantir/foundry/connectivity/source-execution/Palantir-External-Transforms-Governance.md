---
tags: [palantir, transforms, security, integration]
status: done
verified_at: 2026-11-25
category: "AI엔지니어링(AIEngineering)"
---

# 외부 연산의 export 통제와 이전

Source 기반 external transform은 Python transform에서 외부 시스템을 호출한다. UI의 connector나 capability가 부족할 때 사용자 정의 수집과 export를 구현하는 경로이며, virtual table을 읽는 transform도 원천에 접근하므로 외부 연산에 해당한다.

## 실행과 설정

Foundry worker Source를 가져와 `@external_systems`에 선언한다. Agent worker와 outbound application 인증 Source는 지원하지 않는다. REST Source에 여러 domain이 있으면 코드로 가져올 수 없으므로 필요한 domain마다 Source를 나눈다. Source의 code import 허용 설정과 Source Editor 권한이 필요하다.

`transforms-external-systems` library를 사용하며, lightweight 실행도 지원한다. Source에서 자격 증명, egress와 exportable markings를 중앙 관리한다. 변경은 다음 build 시작 때 적용되고 이미 실행 중인 build에는 적용되지 않는다. 즉시 반영이라는 설명을 실행 중 credential 폐기 보장으로 해석하지 않는다.

## 사설망 원천 연결

Agent worker Source는 쓸 수 없지만 사설망이나 on-premise 원천에 닿는 경로가 막힌 것은 아니다. Source를 Direct connection runtime(현재 Foundry worker 개념에 통합된 명칭)으로 만들고, network connectivity 설정에서 Agent proxy egress policy를 만들어 경유할 Data Connection agent를 고른 뒤 code import를 허용한다. 실행 위치를 정하는 worker 종류와 네트워크 경로를 정하는 egress policy를 구분해서 판단한다.

이 경로에는 조건이 있다. Agent proxy policy는 Rubix에서 실행되는 enrollment에서만 쓸 수 있고, virtual table과 OIDC 인증은 지원하지 않으며, external transform의 preview는 VS Code에서만 지원한다. 사설망 원천의 virtual table은 이 경로로 읽을 수 없다. 지원 표면의 전체 목록은 [[Palantir-Network-Egress-and-Private-Connectivity|네트워크 egress와 사설 연결]]과 [[Palantir-Agent-Proxy-and-Migration|Agent proxy와 이전]]에서 본다.

공식 예시는 PostgreSQL을 Spark sidecar 안의 Flask API로 조회하지만, 같은 문서는 더 단순한 경우에는 sidecar가 필요 없을 수 있다고 적는다. 이 문서의 해석으로는 sidecar가 별도 container 의존성이 필요할 때의 선택지이지 사설망 연결의 필수 조건은 아니다.

## 읽기에도 필요한 export 승인

외부 연결과 Foundry 데이터가 같은 job에 존재하면 실제 코드가 내보내지 않더라도 유출 가능성이 생긴다. 따라서 dataset, media set, stream 입력과 해당 Source의 virtual table 사용에도 `Enable exports to this source`를 켜야 한다.

Source에 허용할 security markings와 Organizations를 지정한다. Export는 Foundry 내부 marking 통제 밖으로 데이터가 나가는 행위이므로 해당 marking을 제거할 권한이 필요하다. 외부 시스템의 접근 제어와 보존 책임은 별도로 남는다.

## Legacy 경로에서 이전

Legacy external transform은 `@use_external_systems`에 egress policy, credential과 `ExportControl`을 직접 선언한다. Repository의 ISO 설정과 SECURE 모드를 사용하며, 추가 개발은 기대하지 않지만 지원이 종료된 상태는 아니다.

이전할 때 기존 credential, egress, security/Organization markings를 Source로 옮기고 code import를 허용한다. Decorator와 credential 참조를 바꾼 다음 branch에서 build를 검증한다. 이전 완료 후에 legacy repository 설정을 해제한다. 자동 이전 경로는 없으며 한 transform에 두 decorator를 혼용할 수 없다. 필요하면 transform을 나눈다.

Legacy 문서는 Foundry 입력을 사용하는 외부 transform을 Preview helper로 미리 볼 수 없다고 명시한다. 이 제한을 현재 모든 실행 환경에 자동 적용하지 않는다. 외부 incremental 작업의 cursor/state도 개발자가 명시적으로 저장해야 하며, Foundry 입력 transaction 추적만으로 외부 API의 증분 상태가 복원되지는 않는다.

## 예제 코드의 적용 한계

메모리 버퍼링 예시는 첫 row 크기로 이후 row를 추정한다. 뒤의 row가 훨씬 크면 설정한 threshold가 실제 메모리 상한이 되지 않는다. Arrow 변환 중 추가 메모리도 고려한다. 이는 예제 코드에서 도출한 한계다.

문서의 Spark sidecar Flask 예시는 `request`를 사용하지만 import하지 않는다. 여러 네트워크 예시는 timeout이나 오류 처리가 생략되어 있다. 예시를 그대로 배포 가능한 구현으로 취급하지 않고 인증, 재시도와 중복 외부 효과를 검증한다. CSV 출력 dataset 생성과 실제 외부 export 역시 별도 단계다.

## 출처

- [Palantir, External transforms](https://www.palantir.com/docs/foundry/data-connection/external-transforms)
- [Palantir, External transforms, legacy](https://www.palantir.com/docs/foundry/data-connection/external-transforms-legacy)
- [Palantir, Configure egress](https://www.palantir.com/docs/foundry/administration/configure-egress) — Agent proxy egress policy의 지원 표면과 미지원 workflow
- [Palantir, Data Connection core concepts](https://www.palantir.com/docs/foundry/data-connection/core-concepts) — Direct connection과 Foundry worker의 관계, Rubix 조건

## 관련 문서

- [[Palantir-Source-Identity-and-Code|Source와 세션 자격 증명]]
- [[Palantir-Data-Connection-Permissions|권한과 비밀 접근]]
- [[Palantir-Data-Connectivity|데이터 연결]]
- [[Palantir-Network-Egress-and-Private-Connectivity|네트워크 egress와 사설 연결]]
- [[Palantir-Agent-Proxy-and-Migration|Agent proxy와 이전]]

Source 기반과 legacy 문서 및 예제를 대조했다. 2026-11-25에는 Data Integration 경로(`data-integration/external-transforms`, `external-transforms-source-based`)에서 수집한 본문과 다시 대조했다. 이 경로는 위 External transforms와 같은 본문을 내보내는 별칭이다. 실제 이전과 build는 수행하지 않았다.

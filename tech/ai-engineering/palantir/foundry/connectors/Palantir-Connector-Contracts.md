---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Foundry 커넥터의 기능, 인증과 실행 경계

커넥터는 원본 시스템과 Foundry 사이의 연결, credential과 네트워크 계약을 묶는다. 기능 지원은 source별 capability 표에서 exploration, batch/streaming sync, incremental, file/table/streaming export와 virtual table을 각각 확인한다. 이름이 같은 저장소라도 JDBC driver, 파일 전송과 virtual 접근은 다른 계약이다.

이 문서들은 확인일의 공개 Palantir 계약을 정리한 것이다. 실제 enrollment에서 연결, 권한이나 원본 데이터의 보존을 시험한 결과는 아니다. Beta는 enrollment에서 보이지 않을 수 있고 개발 중 기능이 바뀔 수 있다. Sunset/legacy export task는 신규 export capability와 분리한다.

## 네트워크와 자격증명

직접 연결은 Foundry의 egress policy와 원본의 ingress 허용을 모두 맞춘다. agent 연결은 agent가 목적지 IP/port에 도달하고 원본이 agent의 연결을 받아야 한다. 비공개망이면 Foundry worker와 agent proxy 조합을 먼저 검토하고 legacy agent worker 제약을 확인한다.

DNS policy만으로 원본 권한이 생기지 않는다. OAuth token endpoint, API endpoint, staging object storage, catalog와 인증서 검증에 필요한 경로가 서로 다를 수 있다. 조건부 domain을 전부 허용하기보다 실제 auth mode, region과 저장소 경로에 맞춘다.

추출 계정의 read 권한, export의 write 권한과 source 사용 권한을 나눈다. bearer token을 다른 제품의 token이라고 간주하지 않는다. client credentials, 사용자 위임 OAuth, 서비스 계정, workload federation과 instance identity는 서로 대체 가능한 이름이 아니다.

## 처리 결과와 복구

파일 sync는 파일 보존이며 테이블 schema 적용이 아닐 수 있다. streaming 메시지도 기본 raw payload와 schema-registry 해석이 다르다. incremental의 비교식은 JDBC의 엄격한 `>`와 Salesforce/Slack/SAP의 `>=`처럼 다르므로 경계 중복과 지연 데이터를 따로 검토한다.

문서에 복구 자동화가 명시되지 않았으면 export 재시도를 exactly-once 보장으로 해석하지 않는다. 외부 코드 예제는 실제 호출, 페이지 끝까지 순회, token refresh, 오류 전파와 결과 readback을 검증한 구현이 아니다. 실패를 빈 목록으로 바꾸는 예제는 부분 수집을 성공으로 오인할 수 있다.

Source에 exports를 켜고 export를 만드는 단계와 외부 코드에서 직접 HTTP write를 호출하는 단계는 별개다. Foundry의 export markings/승인 조건과 외부 시스템의 쓰기 권한을 함께 적용한다.

## source별 driver 계약 읽기

[[Palantir-Driver-Reference]]의 표는 mandatory/recommended 속성, 기본값, capability와 조건부 egress를 source별로 연결한다. 필수 속성도 auth mode에 따라 대안 관계일 수 있으므로 모든 credential 필드를 동시에 채우지 않는다. `—`는 자동 생성 credential이 있다는 뜻이 아니다.

드라이버의 전체 property 설명은 각 source 페이지가 링크한 해당 버전의 CData 매뉴얼로 확인한다. 문서가 목록에 있다는 사실만으로 원본 제품의 현재 서비스 제공이나 계정에서의 사용 가능성을 보장하지 않는다.

## 출처

- [Palantir, generic](https://www.palantir.com/docs/foundry/available-connectors/generic)
- [Palantir, custom-jdbc-sources](https://www.palantir.com/docs/foundry/available-connectors/custom-jdbc-sources)
- [Palantir, filesystem](https://www.palantir.com/docs/foundry/available-connectors/filesystem)

## 관련 문서

- [[Palantir-Connectors]]
- [[Palantir-Driver-Reference]]

---
tags: [palantir, gotham, revdb, identity, security]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gotham RevDB 식별, 변경과 resolution"]
---

# Gotham RevDB 식별, 변경과 resolution

RevDB 객체는 Object Type의 한 인스턴스이며, 속성은 여러 값과 여러 원천을 가질 수 있다. 객체 식별, 속성 값의 식별과 원천을 구분해야 안전하게 변경할 수 있다. 아래는 2026-10-16 공개 API 계약이며 실제 데이터 변경은 시험하지 않았다.

## 객체와 속성의 식별 범위

| 값 | 의미 |
|---|---|
| Object `primaryKey` | Gotham API에서 객체를 조회하고 변경하는 식별자 |
| `objectType` | Object Type URI인 API 이름 |
| `propertyType` | 속성의 의미를 나타내는 Property Type URI |
| `propertyId` | 특정 객체 속성 값을 변경하거나 삭제할 때 쓰는 식별자 |
| `security` 안의 SecurityKey | 같은 응답의 보안 상세 정보를 찾는 키 |

일반 객체 응답의 `properties`는 Property Type별 값 배열이다. 개별 값을 변경하려면 상세 속성 조회에서 `propertyId`를 확보한다. `propertyType`을 개별 값의 ID로 쓰지 않는다. SecurityKey도 응답 밖에서의 안정성이나 의미가 보장되지 않으므로 장기 권한 ID로 저장하지 않는다.

PropertyValue의 JSON 표현도 타입에 따라 다르다. Decimal과 Long은 문자열, Double과 Integer는 숫자, Date는 날짜 문자열, Timestamp는 UTC offset date-time 문자열이다. 숫자처럼 보이는 문자열을 일괄 변환하면 정밀도나 타입 계약을 잃을 수 있다.

## 생성 검증과 보안 상속

객체 생성의 기본 `validationMode`는 `STRICT`다. 대표 속성 누락, 허용되지 않은 속성 타입과 잘못된 enum 값을 거부한다. `LENIENT`는 객체, 속성, 링크 타입의 존재를 검사하는 더 좁은 검증이므로 같은 무결성을 보장하지 않는다. 생성 속성 배열이 선택이어도 대표 속성이 필요한 타입은 빈 배열로 만들 수 있다고 단정하지 않는다.

생성 시 초기 속성은 객체의 보안을 상속한다. 기존 객체에 속성 값을 추가할 때는 보안을 명시해야 한다. 링크 생성도 별도 보안이 필요하고, 두 객체의 보안과 같을 필요는 없다. 양쪽 객체가 존재해야 하며 유효한 링크 타입을 사용한다.

ObjectComponentSecurity에 보안을 명시하면 시스템 기본값을 덮어쓴다. Portion marking이 있으면 permissions는 선택, marking이 없으면 permissions가 필수라고 설명한다. Marking과 그룹 권한은 서로 다른 조건이다. 해당 모델은 markings에 대한 접근을 먼저 요구한 뒤 소속 그룹 중 가장 높은 권한을 적용한다.

Permissions 생략 시 Everyone WRITE와 Administrators OWNER라는 기본 설명이 있다. 이를 배포 환경 전체의 보안 정책으로 일반화하지 않으며, 민감한 컴포넌트에는 실제 기본값을 확인해야 한다. 작성자가 더 제한적인 marking을 붙인 속성이 이후 자신의 조회에서 보이지 않을 수도 있다. 쓰기 성공과 읽기 권한을 동일시하지 않는다.

## 다중 원천 수정은 명시적으로 결정한다

속성 값에 여러 원천이 있으면 기본 수정은 실패한다. `applyToAllSources=true`는 그 값의 모든 원천에 수정을 적용하는 선택이다. 단순히 오류를 없애기 위해 켜지 않고 원천 전체를 바꾸려는 의도와 일치하는지 확인한다.

속성 삭제는 특정 `propertyId`를 대상으로 한다. 객체 조회의 표시 값만으로 수정 대상을 추측하지 않는다. 미디어도 메타데이터 조회와 실제 binary 다운로드가 다른 요청이다. 표시 제목, MIME type과 크기를 내용 자체로 해석하지 않는다.

## 로컬 검색과 연합 원천 검색

로컬 객체 검색은 타입을 정하고 비교, 논리 조합, keyword와 intrinsic coordinate의 polygon 조건을 사용한다. Equality는 대소문자를 구분하며 keyword에서 명시적 연산자가 없으면 AND를 기본으로 설명한다. 검색 기본 페이지 크기와 최대값은 100이다.

반면 링크된 객체 목록은 기본과 최대 요청 크기를 1,000으로 설명하고, 실제 반환 개수는 요청과 다를 수 있다고 명시한다. 이 차이를 공통 페이지 크기로 덮어쓰지 않는다.

연합 원천은 source name과 namespace의 metadata에서 `queryShape`를 먼저 확인한다. `term`이 정확 비교인지 유사 검색인지는 원천에 달려 있다. 원천별로 지원하는 쿼리 조합도 다를 수 있다. 기본 설명의 논리 연산자 목록에는 `not`이 중복돼 있지만 endpoint 스키마에는 `not`, `or`, `and`, `term`이 있다.

연합 객체는 속성과 링크를 읽을 수 있어도 수정할 수 없다. 같은 객체 응답 모양을 사용한다는 이유로 로컬 RevDB 쓰기 기능을 그대로 적용하지 않는다.

## Resolution은 출처를 버리는 병합이 아니다

Resolution은 같은 실세계 개체를 가리키는 여러 객체를 결합하면서 각 구성 객체의 이력과 수정 내역을 보존한다. 결합 뒤 직접 쓴 속성도 나중에 분리해 구성 객체에 배분할 수 있도록 설계돼 있다.

- `canonicalObjectPrimaryKey`는 결합된 객체의 대표 조회 키다.
- `winnerObjectPrimaryKey`는 내부에서 생성하며 결합 후 새 속성 쓰기를 귀속시킨다.
- `otherObjectPrimaryKeys`는 다른 구성 객체를 나타내고 재귀 결합 시 이전 winner도 포함할 수 있다.

아직 결합하지 않은 객체는 canonical과 winner가 같고 다른 구성 객체 목록이 비어 있다. 결합을 해제할 때는 구성 객체만 선택하며 대표 결합 객체를 해제 목록에 넣지 않는다. 연결 관계만 남기는 Geotime linking과 이 동작을 구별한다.

Resolution은 동일성 판단을 표현하는 데이터 기능이다. 연결이나 속성 유사도만으로 두 개체가 같다는 사실이 증명되지는 않는다. 원천별 이력과 해제 가능성을 남기는 이유가 여기에 있다.

## 출처

- [Palantir, Object basics](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/object-basics)
- [Palantir, Create object](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/create-object)
- [Palantir, Get object properties](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/get-object-properties)
- [Palantir, Add property to object](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/add-object-property)
- [Palantir, Update object property](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/update-object-property)
- [Palantir, Create object link](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/create-object-link)
- [Palantir, Search objects](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/search-objects)
- [Palantir, List linked objects](https://www.palantir.com/docs/gotham/api/revdb-resources/objects/list-linked-objects)
- [Palantir, Federated sources basics](https://www.palantir.com/docs/gotham/api/revdb-resources/federated-sources/federated-source-basics)
- [Palantir, Object resolution basics](https://www.palantir.com/docs/gotham/api/revdb-resources/resolution/resolution-basics)
- [Palantir, Get resolution metadata](https://www.palantir.com/docs/gotham/api/revdb-resources/resolution/get-resolution-metadata)
- [Palantir, Unresolve objects](https://www.palantir.com/docs/gotham/api/revdb-resources/resolution/unresolve-objects)

## 관련 문서

- [[Gotham-Geotime-Observation-Contracts|Track 연결과 관측]]
- [[Gotham-API-Client-Contracts|인증, 오류와 페이지]]
- [[Palantir-Security-and-Governance|접근 통제와 보안 경계]]

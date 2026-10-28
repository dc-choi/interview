---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo 제품 릴리스 계약과 버전

## 변경할 수 없는 릴리스 정의

제품은 `group:artifactId`, 릴리스는 `group:artifactId:version`으로 식별한다. 필수 `manifest.yml`은 product-type, product-group, product-name, product-version을 선언한다. 릴리스의 manifest는 불변이고 선택 extension은 이미지, 의존성, 상호 비호환 등 불변 특성을 표현한다. 환경별로 바꿀 실행 설정과 릴리스 자체의 계약을 분리한다.

이미지는 artifacts extension에 `type: oci`, URI로 선언한다. 문서가 요구하는 locator에는 버전 tag가 있어야 하며 tag 뒤 digest를 붙일 수 있다. tag 없는 이름이나 digest만 있는 예시는 Apollo 규격에서 유효하지 않다고 명시한다. 일반 OCI 문법 전체와 Apollo 입력 규약을 같다고 가정하지 않는다. manifest의 이름, 이미지와 tag 등 메타데이터는 운영 로그와 telemetry에서 관리자나 Palantir 직원에게 보일 수 있어 민감 정보를 넣지 않는다.

## 정렬 가능한 버전

Apollo Product Spec manifest에는 orderable version만 사용할 수 있다. 문자열이 non-orderable 형식에 맞는다는 사실은 manifest에 넣을 수 있다는 뜻이 아니다. 예를 들어 `1.0.0.dirty`는 non-orderable 형식이지만, `5.0`과 `1.0.0-FOO`는 규격이 지원하는 버전 문자열 형식에도 맞지 않는다.

Apollo의 orderable version은 release `1.2.3`, release snapshot `1.2.3-4-gabcdef`, RC `1.2.3-rc2`, RC snapshot `1.2.3-rc2-4-gabcdef` 네 형태다. 각 숫자는 32비트 정수 최댓값 이하이다. 주요 버전 숫자를 정수로 비교하고 같은 base에서는 RC < release이며 각 형태의 snapshot은 그 비 snapshot보다 크다.

Git hash는 같은 snapshot 번호의 대소를 가르지 않는다. 따라서 hash가 다른 `1.2.3-4-gaaaaaaa`와 `1.2.3-4-gbbbbbbb`는 정렬상 동등할 수 있다. 이를 artifact 내용의 동일성으로 해석하지 않는다. `.dirty`나 임의 branch 설명을 가진 non-orderable 문자열에는 업그레이드 대소 보장이 없다. 일반적인 SemVer 라이브러리가 Apollo와 같은 순서를 구현한다고 가정하지 않는다.

Matcher는 `x.x.x`, `1.x.x`, `1.2.x`, `1.2.3`처럼 오른쪽으로 연속 wildcard가 있는 release 집합이다. `1.x`, `x.0.0`, `1.x.3`는 아니다. 정확한 maximum `1.2.3`은 RC를 포함할 수 있지만 같은 base의 release snapshot은 그보다 커서 범위를 넘는다.

## 의존성과 상호 비호환

product-dependencies는 대상 product group/name, 최소 orderable version과 최대 matcher로 호환 범위를 정한다. optional 기본값은 false다. optional은 설치되지 않아도 된다는 뜻이며 설치되어 있다면 버전 범위는 지켜야 한다. 두 DB를 optional로 선언했다고 둘 다 없는 구성이 실제로 동작한다는 보장은 없다. 유효 조합은 제품 설계에서 따로 정한다.

`recommended-version`을 지정하면 최소/최대 범위를 만족해야 한다. 추천 버전은 허용 범위를 대신하지 않는다. 상한 matcher가 `9.6.x`라면 그와 일치하는 release 중 대상 버전 이상인 상한이 존재하는지 비교한다. 그래서 하한이 `9.3.6`인 예에서 `9.6.1-22-g1a2b3c4`는 허용된다. 정확한 상한 `9.6.1`에서는 같은 snapshot이 상한을 넘는다.

optional 의존성은 대상 Entity의 제거를 막지 않는다. 따라서 선언이 유효해도 제거 뒤 애플리케이션에 필요한 저장소가 남는지는 별도로 확인한다.

순환이 아닌 필수 의존성은 먼저 성공적으로 설치된다. 서로 독립인 의존성들의 순서, optional 의존성의 선행 설치, 순환 필수 의존성의 내부 순서는 보장되지 않는다. 선언만 하고 아직 설치되지 않은 optional 대상은 설치된 필수 대상으로 취급하지 않는다.

product-incompatibilities는 같은 환경에 함께 있을 수 없는 버전 범위를 표현한다. 한쪽에만 선언해도 양방향으로 검사한다. product-type을 생략하면 모든 타입에 적용하며 비호환 선언 자체가 둘 중 하나의 설치를 보장하지 않는다.

## 문서 예시를 실행 입력으로 바꾸기 전

2026-10-29 Product Version Specification과 Product Release Dependencies를 부분 대조했다. manifest 허용 버전, 호환 범위와 optional 제거 경계를 보강했으며, 나머지 규격 전체의 검증일은 유지한다.

Product Types 페이지는 Helm 타입을 `helm.v1`로 적지만 manifest 생성과 여러 실제 예제는 `helm-chart.v1`을 사용한다. 의존성 페이지도 본문은 minimum/maximum을 optional이라고 표현하고 예제 주석은 required로 적는다. 이 불일치를 임의 해소하지 않고 현재 CLI가 생성한 manifest, 설치된 Hub의 schema와 verify 결과를 대조한다. 문서 확인만 수행했으며 해당 타입 조합을 실제 게시하지 않았다.

## 출처

- [Palantir, The Apollo Product Spec and Definition](https://www.palantir.com/docs/apollo/apollo-product-specification/apollo-product-spec-definition) — manifest 필수와 릴리스 정의 불변성.
- [Palantir, Container Image Specification](https://www.palantir.com/docs/apollo/apollo-product-specification/container-images) — artifacts extension과 Apollo 이미지 locator 제약.
- [Palantir, The Product Release Manifest](https://www.palantir.com/docs/apollo/apollo-product-specification/manifest) — 필수 manifest 필드와 메타데이터 노출 경계.
- [Palantir, Product Release Dependencies Extension](https://www.palantir.com/docs/apollo/apollo-product-specification/product-dependencies) — 호환 범위, optional 의미와 설치 순서의 보장 범위.
- [Palantir, Product Release Incompatibilities Extension](https://www.palantir.com/docs/apollo/apollo-product-specification/product-incompatibilities) — 비호환은 한쪽 선언만으로 양방향 검사.
- [Palantir, Product Types](https://www.palantir.com/docs/apollo/apollo-product-specification/product-types) — 타입별 해석, Helm 타입 표기의 다른 예제와 불일치.
- [Palantir, Product Version Specification](https://www.palantir.com/docs/apollo/apollo-product-specification/product-versions) — 네 orderable 형태, hash 제외 순서와 matcher 규칙.
- [Palantir, Create Product Releases with additional details and constraints](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-manifest) — 의존성을 선언한 릴리스는 대상 설치 전 upgrade가 차단됨.
- [Palantir, Products, Releases, and versions](https://www.palantir.com/docs/apollo/core/products-releases-versions) — 제품/릴리스 Maven coordinate와 catalog 관계.

- [Palantir, apollo-product-specification](https://www.palantir.com/docs/apollo/apollo-product-specification) — 부모 specification 경로의 불변 Product Definition 계약.

## 관련 문서

- [[Apollo-Beta-Runtime-Specification]]
- [[Apollo-CLI-Releases-and-Modules]]

---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Beta 런타임 명세

이 문서의 full product definition, endpoint, resource, replication, volume과 substitution은 공식 문서에서 Beta로 표시한 계약이다. Hub에서 이용 가능한지 별도 확인해야 하며 Helm chart에 그대로 적용되는 기능이라고 일반화하지 않는다. quorum/upgrade extension은 Helm chart에서 무시한다고 명시한다.

## 런타임 설정과 파일

선택 `configuration.yml`은 실행 기본값을 제공하고 설치별 override를 합친다. map은 재귀 병합하고 배열 또는 타입이 다른 값은 교체한다. 생성 secret의 top-level 설정은 덮어쓸 수 없으며 이는 기존 secret 손상과 서비스 장애를 막는 경계다.

`conf`는 응용 설정, `managed_files`는 이를 실제 파일로 매핑한다. json/yaml을 지원하며 reload-type 기본 install은 재시작이 필요하고 runtime은 재시작 없이 읽을 수 있다는 선언이다. 기본 mount 경로는 `/opt/palantir/services/<product-name>/var/conf`다. tmpl 형식은 deployment/templates의 Go template로 다른 형식을 렌더링한다.

Substitution은 `{{...}}`로 conf, secret, SSL 재료, volume mount와 discovered 값을 참조한다. secret은 값, bcrypt hash 또는 키 쌍의 public/private 부분을 고를 수 있다. bcrypt cost는 문서상 10이다. 산술, 비교, 논리, 배열 결합, 길이, 중복 제거, 1단계 flatten, cross_join, min/max/sum, contains, merge, 인코딩/디코딩과 hash 함수가 있다. merge는 같은 key에서 먼저 나온 map이 우선한다. cross_join은 첫 배열이 비지 않으면 빈 두 번째 배열을 단위원처럼 취급하는 비대칭 사례가 있어 일반 Cartesian product 가정과 다르다.

## 자원, 복제와 저장소

- resources requests/limits는 복제본마다 적용한다. CPU와 memory를 모두 생략하면 각각 0.25와 1G가 기본값이다. limit만 정한 자원은 request도 그 값으로 설정된다.
- replication.desired는 0보다 큰 정수다. 제품과 설치 설정 모두에 없으면 문서상 2가 기본값이다.
- durable volume은 manifest의 volumes-v2와 기본 설정의 volumes에 같은 이름, 같은 타입으로 존재해야 한다. 이름은 영숫자와 hyphen으로 제한한다.
- desired-size는 양의 정수와 M/G/T 단위이며 문서상 최대 10T다. 설치 override로는 확대만 가능하다. mount 경로는 volumes의 PathOnDisk로 참조한다.
- quorum은 all, all-but-one, any, simple-majority를 받는다. 기본 all-but-one은 복제본 하나일 때도 하나가 필요하다. simple-majority는 floor(n/2)+1이다.
- rolling은 quorum을 유지하며 순차 변경한다. shutdown은 모두 중지한 뒤 변경하고 서로 다른 버전의 복제본 공존을 허용하지 않는다.

## endpoint와 discovery

endpoints.definitions는 하나 이상이며 desired-port는 1024~19999이다. 여러 endpoint가 있으면 sls-status-endpoint를 지정한다. path는 /로 시작하고 기본값은 /다. 공개 HTTPS proxy와 공개 TCP/UDP endpoint를 별도로 선언한다. proxy endpoint는 external-port를 쓰지 않고, TCP/UDP는 external-port를 쓰고 path를 쓰지 않는다. 같은 endpoint를 proxy와 TCP/UDP 양쪽에 등록하지 않는다. TCP와 UDP는 같은 외부 포트용 endpoint를 공유할 수 있다.

require-stable-hostname은 기본 false이며 필요한 서비스만 안정적인 복제본 이름을 요청한다. discovery는 role, stack, tags로 생산/소비를 연결한다. 소비 tags는 전부 만족해야 하고 추가 stack 공개는 discovery 전체 설정에 둔다. port를 가진 entry는 URI로 보강되며 기본 scheme은 https, path는 /다. select로 필요한 필드를 고르고 discovered 또는 self_discovered로 설정에 주입한다.

생성 secret은 Kubernetes Secret에 저장되고 공식 문서는 저장 시 암호화를 권고한다. random_string, random_bytes, RSA PKCS8, EC PKCS8을 지원한다. EC 허용 길이는 224/256/384/521이다. SSL 재료는 CA, private key, certificate, JKS truststore와 keystore 경로로 제공된다.

## 예시의 한계

Full Spec의 EC 예제는 2048을 쓰지만 설명의 EC 허용 길이와 맞지 않는다. Endpoint 예제 90001도 선언한 포트 범위를 넘는다. substitution 예시에도 닫는 괄호나 함수 호출이 불완전한 줄이 있어 검증 없이 복사하지 않는다. 위 설명은 계약 수준 학습이며 Beta 기능을 해당 Hub에서 실행 검증한 결과가 아니다.

## 출처

- [Palantir, The Apollo Product Full Spec and Definition Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_apollo-product-spec-definition-full) — 기본 설정, merge, managed file, secrets와 discovery를 결합하는 full spec.
- [Palantir, Endpoints Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_endpoints) — 공개 endpoint 타입, 필수 포트/경로와 상호 배타 규칙.
- [Palantir, Quorum and Upgrade Extension Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_quorum) — quorum과 rolling/shutdown, Helm에서는 무시.
- [Palantir, Replication Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_replication) — desired는 양의 정수, 미지정 기본 복제본 2.
- [Palantir, Resources Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_resources) — 복제본별 CPU/memory 요청과 기본값.
- [Palantir, Apollo Product Definition: Substitution Reference Guide](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_substitution-reference) — secret, SSL, volume과 conf 치환 및 built-in 함수.
- [Palantir, Volumes Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_volumes) — durable volume 이름/타입 대응, 최대 크기와 확대만 허용.

## 관련 문서

- [[Apollo-Product-Release-Contract]]
- [[Apollo-Health-Probes-and-Metadata]]

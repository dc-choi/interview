---
tags: [palantir, ontology, data-modeling, provenance, data-quality]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 관측과 근거 모델링"]
---

# 관측, 보고서와 근거 모델링

대상, 관측, 보고서와 해석 결과를 하나의 객체로 합치면 같은 사실의 재사용과 출처 추적이 어려워진다. Defense OSDK의 공통 인터페이스와 정보 모델은 이 역할을 분리하는 사례다. 모델링 패턴을 다른 업무에 적용할 때도 시간, 단위와 신뢰도 척도의 의미를 별도로 정의해야 한다.

## 대상과 관측, 보고서 분리

`Defense Tracked Entity`는 추적되는 대상을, `Defense Geotemporal Observation`은 시각이 있는 위치 관측을 표현하는 기존 인터페이스를 확장한다. 두 인터페이스에 모두 있는 `Track Quality`는 선택 속성이며 1~15의 정수 집합을 사용한다. 대상의 현재 상태와 특정 시점 관측의 품질이 같은 개념이라고 가정하지 않는다.

`Report`는 보고서 생성 시각을 필수로 갖고 여러 `Report Observation`과 연결될 수 있다. 한 관측도 여러 보고서에 연결될 수 있으므로, 보고서 안에 관측 내용을 반복 복사하는 모델만 가능한 것은 아니다. 보고서 작성 시각을 관측 발생 시각으로 바꾸어 해석하지 않는다.

`Intelligence`는 보고 시각이 필수이고 보고 위치와 정규화한 신뢰도는 선택 사항이다. 정보의 생산 주체(`Intelligence Producer`)와 대상(`Intelligence Subject`)을 별도 인터페이스로 연결하며 양쪽 모두 여러 정보 객체와 연결될 수 있다. 근거를 생산한 주체와 근거가 설명하는 대상을 분리하면 한 자료가 여러 대상에 적용되는 경우도 표현할 수 있다.

## 숫자 범위와 의미의 정규화

신뢰도 속성이 정수라는 사실만으로 서로 비교할 수 있는 것은 아니다. `Normalized Confidence`는 원천별 신뢰도 체계를 1~5 척도로 맞추도록 정의하지만, 실제 변환 함수나 확률 보정 방법을 제공하는 것은 아니다. 원천 값, 변환 규칙과 변환 버전을 보존해야 한다는 판단은 이 계약을 적용할 때의 설계상 권고다.

공통 표기 인터페이스는 신뢰성과 내용의 신빙성을 문자와 숫자로 구분하며 형식을 정규식으로 제한한다. 형식 검사를 통과했다고 평가 자체가 옳다는 뜻은 아니다. 동일하게 `Track Quality`의 허용 범위 검사는 품질 측정 방법까지 보장하지 않는다.

## 단위와 기준계를 속성 계약에 넣기

공개 스키마는 값의 단위를 설명이나 구조체에 명시한다.

- 속도는 수치와 단위 필드를 가진 구조체로 표현한다.
- 고도와 깊이는 수치, 기준과 단위를 가진 구조체 목록으로 표현한다.
- 거리 목록은 미터, 각도 목록은 도로 정의한다.
- 타원의 장반경과 단반경은 미터이며 지름이 아니다.
- SIGINT의 주파수는 MHz, 축 방향은 북쪽에서 시계 방향으로 측정한 각도다.

같은 `double`이어도 반경과 지름, 미터와 다른 길이 단위, 절대 고도와 기준면 상대 고도는 교환할 수 없다. 입력 변환과 화면 표시에 이 차이를 반영해야 한다. 도메인에서 쓰는 기준과 플랫폼 속성 타입을 함께 검증한다.

## 타입 계층과 미디어 표현

GEOINT와 OSINT, SIGINT는 Intelligence를 확장한다. GEOINT 아래에는 IMINT, MTI와 OPIR이 있고, SIGINT 아래에는 COMINT와 ELINT가 있다. 하위 인터페이스는 공통 메타데이터를 상속하면서 분야별 속성을 추가한다.

IMINT는 문자열 URL과 `mediaReference`를 별도 속성으로 둔다. 문자열이 있다는 사실만으로 플랫폼이 관리하는 미디어 참조와 같은 접근, 수명과 처리 기능을 제공한다고 볼 수 없다. MTI와 OPIR의 타원 속성, COMINT와 ELINT의 식별 표기 등도 분야에 따른 확장이다.

확인한 `Intelligence Report` 설명은 Intelligence 확장을 언급하지만, 상세 `extendedInterfaces`는 `Report`를 가리킨다. 따라서 설명만 보고 Intelligence의 필수 속성을 상속한다고 단정하지 않는다. 구현 전 실제 Ontology 메타데이터와 생성된 SDK를 확인해야 하는 문서 불일치다.

## 운영에서 확인할 것

1. 보고 시각, 생성 시각과 관측 시각을 구분했는가?
2. 대상, 생산 주체, 관측과 보고서가 각각 식별되는가?
3. 선택 속성을 필수 값으로 가정한 화면이나 계산이 있는가?
4. 숫자 범위 검증과 의미 변환, 측정 방법 검증을 구분했는가?
5. 상속 관계를 설명문뿐 아니라 실제 메타데이터로 확인했는가?

## 출처

- [Palantir Documentation, Common interface types](https://www.palantir.com/docs/defense-osdk/api/common/interfaceTypes/)
- [Palantir Documentation, Defense Geotemporal Observation](https://www.palantir.com/docs/defense-osdk/api/common/interfaceTypes/com-palantir-ontology-defense-types-defenseGeotemporalObservation/)
- [Palantir Documentation, Defense Tracked Entity](https://www.palantir.com/docs/defense-osdk/api/common/interfaceTypes/com-palantir-ontology-defense-types-defenseTrackedEntity/)
- [Palantir Documentation, Report](https://www.palantir.com/docs/defense-osdk/api/common/interfaceTypes/com-palantir-ontology-defense-types-report/)
- [Palantir Documentation, Report Observation](https://www.palantir.com/docs/defense-osdk/api/common/interfaceTypes/com-palantir-ontology-defense-types-reportObservation/)
- [Palantir Documentation, Intelligence](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-intelligence/)
- [Palantir Documentation, Intelligence Producer](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-intelligenceProducer/)
- [Palantir Documentation, Intelligence Subject](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-intelligenceSubject/)
- [Palantir Documentation, Intelligence Report](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-intelligenceReport/)
- [Palantir Documentation, GEOINT](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-geoint/)
- [Palantir Documentation, OSINT](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-osint/)
- [Palantir Documentation, SIGINT](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-sigint/)
- [Palantir Documentation, COMINT](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-comint/)
- [Palantir Documentation, ELINT](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-elint/)
- [Palantir Documentation, IMINT](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-imint/)
- [Palantir Documentation, MTI](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-mti/)
- [Palantir Documentation, OPIR](https://www.palantir.com/docs/defense-osdk/api/intelligence/interfaceTypes/com-palantir-ontology-defense-types-opir/)

## 관련 문서

- [[Palantir-Defense-Ontology-Contracts]]
- [[Palantir-Ontology-Modeling]]
- [[Palantir-Data-and-Model-Integration]]

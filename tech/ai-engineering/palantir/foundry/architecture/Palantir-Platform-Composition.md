---
tags: [palantir, architecture, interoperability, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 플랫폼 구성과 상호운용"]
---

# Palantir 플랫폼 구성과 상호운용

Palantir의 표준 아키텍처는 Foundry의 데이터 운영, AIP의 생성형 AI와 Apollo의 지속적 배포를 결합한다. 세 플랫폼을 독립된 제품 목록으로만 보면 업무 의미, 실행 권한과 변경 배포가 연결되는 지점을 놓친다.

2026-10-16 Architecture Center 본문 대조 기준이다. 설명한 구조를 실제 환경에서 설치하거나 성능과 장애를 시험한 기록은 아니다.

## 플랫폼과 내부 계층을 구별한다

| 구조 | 책임 |
|---|---|
| Foundry | 데이터 관리, 로직 작성, Ontology, 분석과 업무 흐름 |
| AIP | 모델 연결, 에이전트 작성과 실행, AI 앱, 평가 |
| Apollo | 서비스를 설치하고 업그레이드하며 하부 인프라 운영을 조정 |
| Rubix | Kubernetes 기반의 보안, 가용성과 자동 확장 실행 기반 |

AIP와 Foundry는 공유 서비스 구조를 사용한다. Ontology는 그 가운데 데이터, 로직, 행동과 보안을 업무 의미로 연결한다. 이 위에 분석과 앱, 자동화와 제품 배포 도구가 놓이며 아래에는 데이터, 로직과 워크플로 서비스가 있다. 저장, 연산, 네트워크, 보안, 거버넌스와 Workspace는 여러 기능에 걸친 공통 구성이다.

병원이나 제조업 특화 앱은 이 기반을 확장한 업무 구성이다. 산업별 앱 이름을 새로운 저장 엔진이나 별도 보안 체계로 해석하지 않는다. Forward Deployed Engineering은 현장의 요구를 개발에 되먹임하는 제품 개발 방식이며, 인프라 구성 요소가 아니다.

## Ontology의 언어, 엔진과 도구

| 구분 | 설명 | 확인할 경계 |
|---|---|---|
| Language | 객체, 속성, 링크와 실행 가능한 행동, 자동화와 로직을 정의 | 업무 개념과 실행 계약이 일치하는가 |
| Engine | 조회, 구독, 변경과 연결된 실행을 수행 | 해당 API의 일관성, 트랜잭션과 외부 효과 범위 |
| Toolchain | SDK와 앱 개발, 변경 관리와 배포를 지원 | 소비자가 쓰는 스키마와 배포 버전 |

아키텍처 수준의 원자적이고 지속적인 변경 설명을 여러 외부 시스템을 포함한 단일 트랜잭션 보장으로 확대하지 않는다. 실제 Action의 원자성과 비동기 효과는 [[Palantir-Actions-and-Functions]]의 계약을 따른다. 같은 객체를 읽는 권한, 구매 주문을 바꾸는 권한과 모델을 실행하는 권한 역시 서로 다를 수 있다.

## 상호운용은 여섯 경계에서 확인한다

| 경계 | 연결 방식의 예 | 설계에서 확인할 내용 |
|---|---|---|
| 데이터 | Iceberg, Parquet, REST, JDBC, S3 호환 접근, virtual table | 복사 여부, 쓰기 지원, 파생 저장과 원천 갱신 |
| 메타데이터 | 스키마, 계보, 보안 정보와 태그를 API로 조회 | 식별자 대응, 공개 범위와 갱신 책임 |
| 의미 모델 | 객체, 링크, Action과 Function의 API/SDK, JSON 기반 정의 | 외부 의미 모델과의 타입 및 버전 대응 |
| 코드와 로직 | Git, Python/R 등 언어, 모델 형식과 컨테이너 | 플랫폼 API 의존성, 실행 환경과 반출 계약 |
| 분석 | SQL/BI 연결, Jupyter와 RStudio, SDK | 질의 엔진, 사용자 신원과 데이터 최신성 |
| 보안 | SAML, 기존 디렉터리와 권한 체계, 감사 API | 인증과 인가 매핑, 후속 이용 통제 |

개방 형식은 파일을 읽을 수 있는 기반이다. 업무 Action, 권한, 계보와 실행 환경까지 다른 플랫폼으로 자동 이식된다는 뜻은 아니다. 반대로 외부 시스템을 연결할 수 있다는 사실만으로 동일 데이터의 중복 저장이나 운영 비용이 사라지지는 않는다. 이 구분은 상호운용 구조에서 도출한 설계 점검 기준이다.

## AIP를 모델 호출 이상의 실행 체계로 본다

AIP의 구성은 모델 연결, 관측, 맥락 구성, Ontology, 벡터/연산/도구 서비스, 보안과 거버넌스, 에이전트 수명주기, 업무 자동화, 개발 환경, 사람과 AI가 쓰는 앱, 제품 배포와 개발 작업 자동화를 함께 다룬다.

모델 입력을 준비하는 파이프라인과 에이전트가 호출하는 행동을 같은 Ontology에 연결해도 실행의 품질은 별도로 평가해야 한다. AIP Evals는 테스트 사례, 모델 비교와 실행 간 변동 검토에 사용하며, 관측은 실행 연결과 자원 사용을 추적한다. 배포는 데이터 파이프라인, 의미 모델, 자동화와 앱을 묶어 변경할 수 있게 한다.

외부 모델의 데이터 보존이나 학습 사용 조건은 실제 제공 경로와 계약을 확인한다. 아키텍처 문서의 Palantir 관리 모델 연결 설명을 임의의 BYOM 공급자와 직접 연결까지 확장하지 않는다. 전역 분기 지원 역시 모든 도구에 동일하지 않다. 상세한 실행 경계는 [[Palantir-Foundry-Agents]]와 [[Palantir-Foundry-AIP]]를 참조한다.

## 출처

- [Palantir, Architecture Center overview](https://www.palantir.com/docs/foundry/architecture-center/overview)
- [Palantir, Integrated platforms: AIP, Foundry, and Apollo](https://www.palantir.com/docs/foundry/architecture-center/platforms)
- [Palantir, The Ontology system](https://www.palantir.com/docs/foundry/architecture-center/ontology-system)
- [Palantir, Interoperability](https://www.palantir.com/docs/foundry/architecture-center/interoperability)
- [Palantir, AIP architecture](https://www.palantir.com/docs/foundry/architecture-center/aip-architecture)

## 관련 문서

- [[Palantir-Operational-Ontology|업무 의사결정과 운영 온톨로지]]
- [[Palantir-Data-and-Model-Integration|데이터와 모델의 실행 계약]]
- [[Palantir-Rubix-and-Compute-Boundaries|연산 배치와 실행 기반]]
- [[Palantir-Security-and-Governance|제품별 보안과 권한 경계]]

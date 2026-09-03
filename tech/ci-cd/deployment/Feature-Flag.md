---
tags: [cicd, deployment, feature-flag, release, rollout]
status: done
verified_at: 2026-08-31
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Feature Flag", "Feature Toggle", "피처 플래그", "기능 플래그"]
---

# Feature Flag

**배포(deployment)와 릴리스(release)를 분리하는 런타임 스위치**. 코드는 이미 프로덕션에 올라가 있고, 사용자에게 보일지는 플래그가 결정한다. 롤백 단위를 배포 바이너리 전체에서 **기능 하나**로 낮추는 것이 존재 이유다. 배포와 릴리스의 개념 구분 자체는 [[CICD-Basics#코드 배포와 기능 릴리스 분리|CI/CD 기초]]에 있고, 이 문서는 그 위에서 flag 시스템의 구현과 운영만 다룬다.

## 핵심 명제

- **배포는 파이프라인이, 노출은 flag가 결정한다** — 미완성 코드도 기본 OFF로 main에 머지하고 배포할 수 있다. Martin Fowler의 정리대로 release toggle은 완성되지 않은 코드 경로를 latent code로 프로덕션에 실어 보내는 장치다.
- **복구 시간의 차이가 도입 근거** — 코드 롤백은 재배포 파이프라인을 한 바퀴 돌아야 하므로 분 단위지만, flag OFF는 제어면에서 값 하나를 바꾸는 초 단위 작업이다.
- **트래픽 레벨 전환과 기능 레벨 전환은 다른 층위** — [[Blue-Green|Blue-Green]]과 Canary는 배포 단위(빌드 전체)를 되돌리고, flag는 그 안의 기능 하나만 되돌린다. 둘은 대체재가 아니라 조합해서 쓴다.
- **가역성 자체의 가치**는 [[One-Way-vs-Two-Way-Door|One-Way vs Two-Way Door]]에서 이미 논증한 프레임이며, flag는 그 프레임의 대표적인 구현 수단이다.

## Flag의 네 가지 타입과 수명

Fowler는 flag를 **수명(longevity)** 과 **동적 정도(dynamism)** 두 축으로 나눈다. 타입이 다르면 소유자, 평가 주기, 제거 정책이 전부 달라진다.

| 타입 | 목적 | 수명 | 평가 주기 | 소유자와 제거 |
|---|---|---|---|---|
| **Release** | 배포와 릴리스 분리, trunk-based 개발 지원 | 수일에서 수주 | 배포 단위로 정적 | 기능 개발팀, 100% 도달 후 즉시 제거 |
| **Experiment** | A/B, 다변량 실험 | 실험 기간(수시간에서 수주) | 요청마다 동적, 사용자별 고정 | 실험 담당, 결론 확정 후 제거 |
| **Ops** | kill switch, 부하 시 기능 축소 | 짧게는 릴리스 기간, kill switch는 장기 | 운영자가 즉시 변경 | SRE와 운영팀, 상시 유지 가능 |
| **Permission** | 유료 플랜, 베타 참가자 엔타이틀먼트 | 수년 단위 | 요청마다 사용자별 | 제품팀, 제거 대상 아님 |

- **혼동 금지**: Permission flag는 사실상 제품 기능이고 Release flag는 임시 비계다. 같은 저장소에 두더라도 제거 기한 정책은 분리해야 한다.
- **설정값과 flag의 경계**는 [[Avoid-Hard-Coding#4. 정책 값은 DB, Feature Flag로|하드코딩 회피]]에 있다. 값이 거의 바뀌지 않으면 설정, 런타임에 즉시 뒤집어야 하면 flag다.

## 평가 아키텍처

어디서 판정하느냐가 지연, 개인정보, 장애 반경을 전부 좌우한다.

| 방식 | 동작 | 장점 | 대가 |
|---|---|---|---|
| **서버사이드 SDK 로컬 평가** | 규칙 셋을 내려받아 프로세스 안에서 판정 | 네트워크 왕복 없음, 컨텍스트가 밖으로 안 나감 | 규칙 전파 지연, 메모리 상주 |
| **원격 평가 API** | 요청마다 제어면에 물어봄 | 규칙 즉시 반영, 클라이언트 경량 | 호출 경로에 외부 의존, 지연과 SPOF |
| **클라이언트, 엣지 평가** | 브라우저나 CDN worker에서 판정 | 사용자에 가장 가까움 | 규칙과 컨텍스트 노출, 개인정보 주의 |

Unleash 문서가 정리한 원칙 중 두 가지가 여기에 직결된다. **사용자에 최대한 가까운 곳에서 평가**해 지연과 대역폭을 줄이라는 것, 그리고 **개인정보는 서버사이드 평가로 보호**하라는 것이다. 사용자 속성을 제어면에 보내지 않고 규칙만 받아와 안에서 판정하면 컨텍스트가 애플리케이션 경계를 넘지 않는다.

- **전파 방식**: 폴링(수십 초 주기)과 SSE, 웹소켓 스트리밍. 스트리밍은 kill switch의 반응 속도를 초 단위로 만든다.
- **부트스트랩**: 프로세스 기동 직후 규칙이 비어 있는 창을 없애려면 로컬 파일이나 환경변수로 초기 스냅샷을 주입한다.
- **fail-safe**: 제어면이 죽어도 **last-known-good 캐시**로 계속 평가하고, 캐시도 없으면 **코드에 박아 둔 기본값**으로 떨어진다. Unleash가 CAP 관점에서 **일관성보다 가용성 우선**을 원칙으로 못 박은 이유다.
- **API 계약 차원의 보증**: OpenFeature 명세는 평가가 비정상 종료하면 호출이 **default value를 반환해야 한다**고 규정하고(Requirement 1.4.10), 이때 evaluation details에 error code를 담도록 요구한다(1.4.8). flag 평가 실패가 예외로 전파되지 않는 것이 표준 동작이다.

## 타게팅과 롤아웃

- **해시 버킷팅**: 사용자 식별자와 flag별 group id를 이어 붙여 해시한 뒤 0~100 구간에 매핑한다. Unleash는 MurmurHash를 쓰고, 같은 입력이면 같은 숫자가 나오므로 비율을 5%에서 25%로 올려도 기존 5% 사용자는 계속 노출 상태를 유지한다.
- **stickiness**: Unleash 기본 동작은 컨텍스트의 `userId`, 없으면 `sessionId` 순으로 고른다. 둘 다 없으면 난수를 쓰므로 **동일 사용자에게 같은 값이 나온다는 보장이 사라진다**. 로그인 전 트래픽에 flag를 걸 때 세션 식별자를 반드시 넘겨야 하는 이유가 여기 있다.
- **일관성이 깨지면 생기는 일**: 같은 화면의 두 API 호출이 서로 다른 variant를 받으면 UI와 데이터가 어긋나고, 실험이라면 한 사용자가 양쪽 그룹에 걸쳐 측정 자체가 무의미해진다.
- **세그먼트 순서**: 내부 사용자 → 특정 tenant나 지역 → 비율 상승 순으로 좁은 곳부터 연다.
- **다변량 variant**: 켬과 끔 두 값이 아니라 여러 값을 반환하는 형태. AWS AppConfig도 요청 컨텍스트를 규칙에 대조해 값을 고르는 multi-variant feature flag를 제공한다.

## 롤아웃 절차

1. **기본 OFF로 배포** — 코드는 프로덕션에 있지만 아무도 보지 않는다. 여기까지가 배포다.
2. **내부 dogfooding** — 사내 계정 세그먼트만 ON. 로그와 에러 트래킹으로 새 경로가 실제로 실행되는지 확인한다.
3. **비율 상승** — 1%, 5%, 25%, 50%, 100% 같은 단계로 올린다. 각 단계마다 **관측 창**(예: 최소 30분 또는 유효 표본 도달)을 미리 정한다.
4. **중단 임계값 사전 정의** — 오류율, p99 지연, 핵심 비즈니스 지표를 단계 진입 전에 숫자로 적는다. 올린 뒤에 기준을 정하면 그 기준은 이미 결과에 오염돼 있다.
5. **자동 롤백 트리거** — 임계값 초과 시 사람 판단 없이 flag를 OFF로 되돌리는 경로를 둔다. 배포 파이프라인 레벨의 자동 롤백은 [[Rollback|롤백 전략]] 쪽 이야기다.

실험 flag의 표본 크기, MDE, SRM, peeking 같은 통계 설계는 [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]에 정본이 있다. 비율만 올리고 눈으로 그래프를 보는 것은 실험이 아니다.

## 코드 안에서의 flag

- **분기는 진입점 한 곳으로** — Fowler의 표현대로 조건문을 코드 전체에 뿌리지 말고 **결정 지점(decision point)과 결정 로직(decision logic)을 분리**한다. `isEnabled('x')`를 서른 군데서 호출하는 대신 전용 판정 메서드 하나를 두고 거기서만 묻는다.
- **Inversion of Decision** — 컴포넌트가 flag 인프라에 직접 손을 뻗지 않고, 판정 함수나 전략 선택기를 주입받는다. NestJS provider factory는 bootstrap 때 한 번 평가되므로 배포 중 바뀌지 않는 wiring flag에만 맞는다. 런타임 flag는 요청 컨텍스트마다 판정하는 얇은 router를 주입해야 변경이 즉시 반영되고 사용자별 고정 분할도 유지된다.
- **상태 폭발** — flag n개면 조합은 2의 n승이다. 서버와 클라이언트 양쪽에 flag가 걸리면 서로 다른 배포 주기 탓에 실제로는 존재하지 않아야 할 조합이 프로덕션에 뜬다. 상호 의존하는 flag는 하나로 합치거나 의존 관계를 명시한다.
- **테스트** — ON 경로와 OFF 경로를 모두 검증한다. 여기에 **제어면 장애 시 타는 기본값 경로**까지 포함해야 한다. 셋 중 하나라도 CI에서 안 돌면 그 경로는 프로덕션에서 처음 실행된다.
- **공용 코드에 flag를 심을 때**는 호출자마다 기대가 다를 수 있으므로 [[Common-Code-Management|공통 코드 관리]]의 원칙을 함께 본다.

## 데이터와 스키마가 걸릴 때

flag OFF는 **코드 경로만** 되돌린다. 되돌리지 못하는 것들이 있다.

- 이미 새 스키마로 쓰인 데이터, 이미 발송된 알림과 이메일, 이미 호출된 외부 결제 API의 부수효과.
- 새 경로가 쓴 컬럼을 옛 경로가 읽지 못하면, flag를 꺼도 그 사용자의 데이터는 깨진 상태로 남는다.

그래서 flag가 실제로 가역이 되려면 스키마가 두 버전을 동시에 견뎌야 한다. Expand-Contract(Parallel Change) 패턴과 그 단계별 절차는 [[Blue-Green#DB 스키마, 공유 상태의 난제|Blue-Green의 스키마 절]]에 정본이 있고, 마이그레이션 실행 순서는 [[DB-Migration|DB 마이그레이션]]에서 다룬다. 외부 부수효과는 flag 뒤가 아니라 **멱등 처리와 보상 트랜잭션**으로 막아야 한다.

## 수명주기와 부채

- **소유자와 제거 기한을 flag 생성 시점에 필수로 받는다.** Fowler는 flag를 **carrying cost가 붙는 재고(inventory)** 로 보라고 하고, Unleash는 flag를 정적 설정과 구분되는 **단기 수명 객체**로 다루라는 원칙을 둔다.
- 만료 flag 리포트, PR 린트 규칙, 기한 초과 시 티켓 자동 생성 중 하나는 있어야 실제로 제거된다. 리마인더 없는 정책은 지켜지지 않는다.
- **stale flag의 비용**: 죽은 분기가 코드에 남아 리팩터링을 방해하고, 조합 폭발로 테스트 매트릭스를 키우며, 신규 입사자에게 어느 경로가 진짜인지 알 수 없게 만든다.
- **flag 이름 재사용 금지**: Unleash가 조직 전체에서 flag 이름을 유일하게 유지하라는 원칙을 둔 이유는 과거 flag가 뜻하지 않게 되살아나는 사고 때문이다. 2012년 Knight Capital 사건에서 신규 RLP 코드가 2003년에 사용 중단된 뒤 9년 가까이 방치돼 있던 Power Peg 기능의 옛 플래그를 그대로 재사용했고, 8대 중 1대 서버에만 신규 코드 배포가 누락된 상태에서 그 플래그가 켜지자 죽은 코드가 깨어나 45분 만에 4억 6천만 달러대 손실이 났다. 낡은 flag는 지워야지 재사용할 대상이 아니다.
- 오래된 flag 정리는 레거시 정리 작업의 일부이기도 하다([[Legacy-Modernization-Strategies|레거시 현대화 전략]]).

## 도구 선택

| 구간 | 수단 | 충분한 조건 |
|---|---|---|
| **자체 구현** | 환경변수, 설정 테이블, Redis 키 | flag가 한 자릿수, 전사 ON/OFF만, 개발자가 직접 바꿔도 되는 단계 |
| **관리형 설정 서비스** | AWS AppConfig 같은 클라우드 기능 | 배포와 분리된 설정 전파, 배포 중 알람 기반 자동 롤백이 필요할 때 |
| **전용 flag 플랫폼** | Unleash(OSS), LaunchDarkly 같은 상용 SaaS | 사용자 단위 타게팅, 비율 롤아웃, 감사 로그, 승인 워크플로가 필요할 때 |
| **표준 계층** | OpenFeature | 벤더 종속을 낮추고 provider를 갈아끼울 여지를 남기고 싶을 때 |

전용 도구로 넘어가는 신호는 flag 개수가 아니라 **권한**이다. 개발자가 아닌 사람이 flag를 켜야 하거나, 누가 언제 무엇을 바꿨는지 감사 로그로 답해야 하거나, 프로덕션 flag 변경에 승인이 필요해지는 순간이 경계다. 도구별 가격과 기능 범위는 시점에 따라 바뀌므로 도입 전에 각 벤더 공식 문서에서 직접 확인한다.

## 흔한 실수

- **제거 기한 없는 flag 생성** — 기본 상태로 두면 flag는 영구히 남는다. 생성 폼에서 기한을 필수 입력으로 막는 편이 낫다.
- **평가 실패가 예외로 전파** — 제어면 타임아웃이 500 에러가 되면 flag 시스템이 장애 원인이 된다. 기본값 반환이 표준 동작이다.
- **제어면을 요청 경로의 SPOF로 배치** — 원격 평가 API를 동기 호출하면서 캐시도 타임아웃도 없는 구성.
- **stickiness 없이 비율 롤아웃** — 새로고침마다 화면이 바뀌고, 실험 데이터는 못 쓰게 된다.
- **통계 설계 없는 실험 flag** — 지표 그래프를 눈으로 보고 승자를 정하는 것.
- **미완성 기능의 무기한 방치** — flag 뒤에 있다는 이유로 반쯤 만든 코드를 몇 분기째 main에 두는 것. trunk-based에서 작은 조각을 자주 머지하는 전제는 [[Development-Workflow|개발 워크플로]]에 있고, flag는 그 전제를 지키기 위한 도구지 미완성을 숨기는 창고가 아니다.

## 면접 체크포인트

- 배포와 릴리스의 분리를 한 문장으로 설명하고, flag가 그 분리를 어떻게 구현하는지 말할 수 있는가
- 장애 상황에서 flag OFF와 코드 롤백 중 무엇을 고를지, 그 판단 기준이 무엇인지 답할 수 있는가
- flag 제어면이 죽었을 때의 fail-safe 설계(로컬 캐시, 기본값 반환)를 그릴 수 있는가
- 비율 롤아웃에서 sticky 버킷팅이 왜 필요한지, 식별자가 없으면 무엇이 깨지는지 설명할 수 있는가
- flag OFF로 되돌릴 수 없는 것이 무엇인지, 그때 스키마를 어떻게 설계해야 가역이 되는지 말할 수 있는가
- flag 부채를 관리하는 운영 규칙(소유자, 기한, 이름 유일성)을 근거와 함께 제시할 수 있는가

## 출처
- [Feature Toggles (aka Feature Flags) — martinfowler.com, Pete Hodgson](https://martinfowler.com/articles/feature-toggles.html)
- [Knightmare: A DevOps Cautionary Tale — dougseven.com](https://dougseven.com/2014/04/17/knightmare-a-devops-cautionary-tale/)
- [SEC, In the Matter of Knight Capital Americas LLC](https://www.sec.gov/litigation/admin/2013/34-70694.pdf)
- [Unleash Documentation, 11 principles for building and scaling feature flag systems](https://docs.getunleash.io/topics/feature-flags/feature-flag-best-practices)
- [Unleash Documentation, Stickiness](https://docs.getunleash.io/reference/stickiness)
- [OpenFeature Specification, Flag Evaluation API](https://openfeature.dev/specification/sections/flag-evaluation/)
- [AWS AppConfig User Guide, Creating feature flags and free form configuration data in AWS AppConfig](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html)

## 관련 문서
- [[CICD-Basics|CI/CD 기초]] — 배포와 릴리스 분리의 개념 정본
- [[Blue-Green|Blue-Green 배포]] — 트래픽 레벨 전환과 Expand-Contract 스키마 변경
- [[Canary|Canary 배포]] — 점진 트래픽 이동, flag와 조합하는 층위
- [[Zero-Downtime-Deployment|무중단 배포]] — 전환, 종료, 시작, 데이터, 클라이언트 5계층
- [[Rollback|롤백 전략]] — 배포 단위 복구와 flag OFF의 선택
- [[DB-Migration|DB 마이그레이션]] — flag가 가역이 되기 위한 스키마 전제
- [[Shadow-Traffic|Shadow Traffic]] — 응답에 반영하지 않고 새 경로를 검증
- [[Development-Workflow|개발 워크플로]] — trunk-based와 flag의 결합
- [[One-Way-vs-Two-Way-Door|One-Way vs Two-Way Door]] — 가역성 의사결정 프레임
- [[Avoid-Hard-Coding|하드코딩 회피]] — 설정값과 flag의 경계
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]] — 실험 flag의 통계 설계
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]] — 오래된 분기 정리
- [[Common-Code-Management|공통 코드 관리]] — 공용 코드에 분기를 넣을 때의 원칙

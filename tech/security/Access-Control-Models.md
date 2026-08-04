---
tags: [security, authorization, rbac, abac, pbac, policy-engine]
status: done
verified_at: 2026-08-04
category: "보안(Security)"
aliases: ["Access Control Models", "RBAC", "ABAC", "PBAC", "접근 제어 모델"]
---

# RBAC, ABAC, PBAC 접근 제어 모델

## 인증과 인가의 경계

인증은 로그인 정보, 생체 정보나 토큰으로 요청 주체가 누구인지 신원을 확인하는 단계다. 인가는 인증된 주체가 특정 자원에 특정 작업을 수행할 권한이 있는지 판단하는 다음 단계다. 로그인 성공이나 유효한 토큰은 인가의 입력일 뿐 접근 허용을 뜻하지 않는다.

사원증으로 회사 건물에 들어갈 수 있어도 제한 구역에 들어갈 권한까지 생기는 것은 아니다. HTTP에서는 유효한 인증 정보가 없거나 인증에 실패하면 일반적으로 `401 Unauthorized`, 인증은 됐지만 해당 자원에 권한이 없으면 `403 Forbidden`으로 구분한다.

```text
authorization decision = evaluate(subject, action, resource, environment, policy)
```

RBAC, ABAC와 PBAC는 이 판단에 어떤 정보를 중심으로 사용하고 정책을 어떻게 관리할지를 설명한다. 셋 중 하나만 배타적으로 선택하기보다 역할, 속성과 정책 엔진을 조합하는 경우가 많다.

## 모델 관계와 비교

| 구분 | RBAC | ABAC | PBAC |
|---|---|---|---|
| 중심 관점 | 역할에 권한을 묶어 할당 | 속성을 정책과 대조해 요청별 판단 | 정책을 명시적 자산으로 관리하고 집행 |
| 주요 입력 | 활성 역할, 역할 권한, 제약 | 주체, 자원, 작업, 환경 속성 | 정의한 정책이 참조하는 역할, 속성, 위험과 컨텍스트 |
| 강점 | 조직 직무와 잘 맞고 관리가 단순 | 세밀하고 상황에 따른 제어 가능 | 여러 시스템에 정책을 일관되게 배포하고 감사하기 쉬움 |
| 주요 비용 | 역할 폭증, 자원별 조건 표현 한계 | 속성 품질, 규칙 복잡도와 설명 비용 | 용어 혼선, 정책 충돌, 배포와 평가 계층 운영 |
| 적합한 상황 | 직무와 책임이 비교적 안정적 | 소유권, 위치, 시간과 데이터 등급을 함께 판단 | 중앙 정책 수명주기와 일관된 집행이 중요 |

정책은 PBAC만의 특징이 아니다. RBAC도 조직 정책을 역할과 권한 관계로 구현하고, ABAC도 속성을 평가할 정책이나 규칙이 반드시 필요하다.

## RBAC: 역할을 관리 단위로 삼는다

RBAC는 사용자에게 권한을 직접 나열하지 않고 역할에 권한을 연결한 뒤 사용자에게 역할을 할당한다.

```text
User --assigned_to--> Role --granted--> Permission(Action, Resource)
Session --activates--> Role
```

핵심 요소는 사용자, 역할, 권한, 작업, 객체와 세션이다. 확장된 모델은 다음도 다룬다.

- 역할 계층: 상위 역할이 하위 역할의 권한을 상속
- 정적 직무 분리: 충돌하는 역할을 한 사용자에게 동시에 할당하지 않음
- 동적 직무 분리: 같은 세션에서 충돌 역할을 함께 활성화하지 않음
- 세션 활성화: 사용자가 가진 역할 중 현재 작업에 필요한 일부만 사용

따라서 RBAC를 완전히 정적인 모델로 보면 안 된다. 다만 부서, 소유권, 기기 상태와 요청 시간 같은 조건을 역할로 계속 표현하면 역할 조합이 폭증한다.

## ABAC: 요청 시점의 속성을 평가한다

ABAC는 다음 속성을 정책, 규칙 또는 관계와 대조한다.

- Subject: 사용자 ID, 부서, 고용 상태, clearance, 역할
- Resource: 소유자, tenant, 분류 등급, 데이터 유형
- Action: read, update, approve, export
- Environment: 시간, 네트워크, 기기 신뢰 상태, 위험 수준

역할도 subject attribute가 될 수 있다. ABAC가 RBAC를 없애는 것이 아니라 역할만으로 부족한 조건을 같은 판단에 넣을 수 있다는 뜻이다.

정교함의 대가는 attribute governance다. 각 속성의 권위 있는 발급자, 갱신 주기, 만료와 누락 시 동작이 명확해야 한다. 오래된 토큰의 부서 정보나 클라이언트가 임의로 보낸 tenant ID를 신뢰하면 정책 표현이 정확해도 결정은 틀린다.

## PBAC: 먼저 용어의 의미를 고정한다

PBAC는 RBAC, ABAC처럼 하나로 합의된 독립 모델이라는 전제에서 사용하면 혼선이 생긴다. 자료에 따라 다음 의미로 쓰인다.

- ABAC에 내재한 정책 표현 능력을 강조하는 이름
- ABAC를 엄격한 환경 정책까지 확장한 접근
- 역할, 속성, 위험을 조합하는 넓은 정책 중심 접근 제어
- 정책을 애플리케이션 밖에서 작성, 평가, 배포하는 아키텍처

따라서 설계 문서에는 PBAC라고만 쓰지 않고 이 시스템에서 뜻하는 범위를 정의한다. 이 문서에서는 **정책을 버전 관리 가능한 독립 자산으로 두고 중앙의 판단과 각 경계의 집행을 분리하는 접근**을 PBAC로 부른다.

## 실무의 기본은 하이브리드다

```text
기본 권한: role == approver
추가 조건: subject.department == resource.department
          && resource.amount <= subject.approvalLimit
          && environment.deviceTrusted == true
정책 운영: 중앙 저장, 검토, 배포, 평가와 감사
```

RBAC가 누가 어떤 종류의 작업을 맡는지 좁히고, ABAC가 현재 요청과 자원의 세부 조건을 확인하며, 정책 계층이 두 규칙을 일관되게 배포한다. 모든 조건을 역할로 만들거나 모든 권한을 긴 Boolean 식 하나로 만드는 양극단을 피한다.

## 정책 평가 아키텍처

XACML의 역할 구분은 특정 모델에 종속되지 않는 유용한 mental model이다.

```text
Request
  -> PEP: 요청 차단과 결정 요청
  -> PDP: 적용 정책 평가
       <- PAP: 정책 생성, 저장과 버전
       <- PIP: 신뢰할 수 있는 속성 제공
  <- Permit | Deny | NotApplicable | Indeterminate
  -> PEP: 결정과 obligation 집행
```

| 구성 요소 | 책임 |
|---|---|
| PAP | 정책과 policy set을 작성하고 관리 |
| PDP | 적용 가능한 정책을 찾아 인가 결정 생성 |
| PIP | 인가 판단에 필요한 속성 제공 |
| PEP | 모든 진입점에서 PDP 결정을 요청하고 집행 |

중앙 PDP만 있어도 우회 가능한 API나 background job에 PEP가 없으면 통제는 깨진다. 반대로 각 서비스가 정책을 복사하면 version drift가 생긴다. 판단은 일관되게 공유하되 집행은 실제 자원 경계마다 둔다.

## 결정과 정책 충돌

정책 평가는 단순한 true/false보다 넓은 결과를 가질 수 있다.

- `Permit`: 명시적으로 허용
- `Deny`: 명시적으로 거부
- `NotApplicable`: 적용할 정책이 없음
- `Indeterminate`: 속성 누락이나 평가 오류로 판단 불가

서비스는 마지막 두 결과의 처리 방식을 명시해야 한다. 민감한 자원은 보통 명시적 Permit이 없으면 거부하는 fail-closed 정책을 사용한다.

여러 rule 또는 policy 결과는 평가 계층에 맞는 결합 알고리즘으로 처리한다. Deny-overrides, Permit-overrides와 First-applicable을 사용할 수 있고, Only-one-applicable은 policy나 policy set 수준에서 하나만 적용돼야 한다는 제약을 검증한다. 충돌, 누락과 오류 case도 함께 테스트한다.

## 선택 기준

- 직무별 기본 권한이 안정적이면 RBAC부터 시작한다.
- 자원 소유권, tenant, 시간과 기기 상태가 결정에 필요하면 ABAC 조건을 추가한다.
- 여러 서비스에서 동일 정책을 배포, 감사해야 하면 정책 엔진과 PAP/PDP/PEP 분리를 고려한다.
- 한 서비스의 단순 owner 검사라면 중앙 엔진보다 코드에 가까운 명시적 검사로 충분할 수 있다.
- 규제 준수는 특정 모델 선택만으로 달성되지 않는다. 정책 검토, 속성 거버넌스, 감사와 증적이 함께 필요하다.

## 운영 체크포인트

- 정책을 코드처럼 versioning하고 review, test, rollout, rollback하는가?
- Permit뿐 아니라 Deny, 속성 누락, 충돌과 경계값 test가 있는가?
- 속성마다 issuer, freshness, 타입과 누락 시 동작이 정해져 있는가?
- 정책 변경을 shadow evaluation으로 비교한 뒤 배포할 수 있는가?
- Audit log에 subject, action, resource, policy version, 결정과 이유를 남기는가?
- PDP 장애와 cache stale 상황에서 fail-open인지 fail-closed인지 자원별로 정했는가?
- Cache key에 정책 version과 결정에 사용한 속성이 포함되는가?
- 모든 API, queue consumer와 batch 경로에 PEP가 있어 우회가 불가능한가?
- 특정 사용자가 요청, 승인과 집행을 모두 수행하지 못하도록 직무 분리를 검증하는가?

## 흔한 실패

- 역할 하나가 필요할 때마다 새 역할을 만들어 role explosion을 일으킨다.
- 속성 이름과 의미를 표준화하지 않아 서비스마다 같은 정책을 다르게 해석한다.
- JWT 안의 오래된 역할과 조직 정보를 실시간 사실처럼 사용한다.
- `NotApplicable`이나 평가 오류를 허용으로 처리한다.
- 정책 언어 도입만으로 최소 권한과 규제 준수가 자동 달성된다고 본다.
- 정책 결정 로그에 민감한 속성 원문을 과도하게 남긴다.

## 면접 체크포인트

- 인증 결과와 인가 결정을 분리해 설명할 수 있는가?
- RBAC의 역할 계층, 세션과 직무 분리 제약을 아는가?
- ABAC의 네 속성 범주와 attribute authority 문제를 설명할 수 있는가?
- PBAC가 문헌과 제품마다 다르게 쓰인다는 점을 밝히는가?
- PDP와 PEP를 분리하고 우회 경로, 장애와 cache 정책을 설계하는가?
- 모델을 배타적으로 고르지 않고 요구사항에 맞게 조합하는가?

## 출처

- [인증과 인가 - 코딩하는기술사](https://www.youtube.com/watch?v=jpA5XIF-etA)
- [RBAC/ABAC/PBAC, 역할/속성/정책 기반 접근 제어 - JackerLab](https://itpe.jackerlab.com/entry/RBACABACPBAC-%EC%97%AD%ED%95%A0%C2%B7%EC%86%8D%EC%84%B1%C2%B7%EC%A0%95%EC%B1%85-%EA%B8%B0%EB%B0%98-%EC%A0%91%EA%B7%BC-%EC%A0%9C%EC%96%B4)
- [Role Based Access Control - NIST](https://csrc.nist.gov/projects/role-based-access-control)
- [Guide to Attribute Based Access Control, SP 800-162 - NIST](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
- [A Report on the Privilege Access Management Workshop, NIST IR 7657](https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir7657.pdf)
- [Guide to Secure Web Services, SP 800-95 - NIST](https://doi.org/10.6028/NIST.SP.800-95)
- [XACML Version 3.0 Core Specification - OASIS](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html)

## 관련 문서

- [[Application-Security|애플리케이션 보안]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[IDOR|IDOR와 자원 단위 인가]]
- [[NestJS-Guards-Patterns|NestJS Guards와 정책 기반 인가]]
- [[IAM-Policy|AWS IAM 정책 평가]]
- [[IAM-Best-Practices|AWS IAM 최소 권한]]
- [[IAM-Entities-Access|AWS IAM 주체와 접근 구조]]

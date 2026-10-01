---
tags: [security, spring-security, authorization, legacy, aop]
status: done
verified_at: 2026-10-01
category: "Security - 인증"
aliases: ["Spring Security Legacy Dynamic Authorization", "Legacy 동적 인가 구현"]
---

# Spring Security Legacy 동적 인가 구현과 실패 모드

강의의 DB 동적 인가는 deprecated Access API인 `SecurityMetadataSource`, `AccessDecisionManager`와 Voter 위에 만들어졌다([[Spring-Security-Authorization#Legacy 결정 결합 읽기|Legacy Module 이전]]). 7.x에서 `@EnableGlobalMethodSecurity`를 쓸 때도 `spring-security-access`가 Classpath에 있어야 한다. 이 문서는 Legacy 코드를 읽고 옮길 때 드러나는 구조와 실패 모드를 다루고, 현재 설계는 [[Spring-Security-Dynamic-Policy|DB 기반 동적 정책]], Voter 결합 규칙은 [[Spring-Security-Authorization|인가 문서]]를 따른다.

## 공통 구조

URL 방식(`FilterInvocationSecurityMetadataSource`)과 Method 방식(`MethodSecurityMetadataSource`)은 모두 `SecurityMetadataSource`로 자원과 권한 목록을 들고 있다가 호출마다 `ConfigAttribute` 목록을 결정 계층에 넘긴다. 차이는 가로채는 지점이다. URL은 Filter가 요청마다, Method는 AOP Advice가 호출마다 가로챈다. 이 차이가 DB 변경의 반영 시점을 가른다.

## URL 정책: 미등록 자원이 공개 자원이 된다

설정 코드의 URL 규칙도 초기화 때 `LinkedHashMap<RequestMatcher, Collection<ConfigAttribute>>`로 적재되고, 조회는 첫 일치 항목의 권한을 돌려준다. DB 연동은 같은 구조의 Metadata Source를 직접 구현해 새 `FilterSecurityInterceptor`에 `AffirmativeBased` Manager와 함께 넣는다.

- 기본 허용: 매핑된 권한 목록이 빈 요청은 Voter 없이 공개 호출로 통과한다([[Spring-Security-Authorization#Legacy 결정 결합 읽기|Legacy 기본값]]). 실습에서 설정 코드의 규칙을 지우고 DB 맵에 `/mypage`가 없자 비로그인 사용자도 접속됐고, 맵에 `ROLE_USER`를 넣자 Login으로 이동했다. 정책 원본을 DB로 옮기면 등록하지 않은 자원이 곧 공개 자원이 된다. `rejectPublicInvocations=true`는 누락을 예외로 드러내는 fail-safe 모드다.
- 순서: DB 조회를 순번(`orderNum`)으로 정렬해 `LinkedHashMap`에 넣는다. 첫 일치가 적용되므로 좁은 경로가 넓은 경로보다 앞 순번이어야 하며, 순서가 어긋나면 넓은 패턴의 권한이 적용된다.
- 공개 자원 선처리: `FilterSecurityInterceptor`를 상속해 공개 목록(`/`, `/login` 등)과 일치하면 Metadata 조회와 Voter 심사를 건너뛰는 Filter는 Framework 기능이 아니라 인가 구조를 응용한 구현이다. 목록 밖 자원은 정상 인가를 거친다.
- 실시간 반영: 자원 관리 Controller가 자원이나 권한을 바꿀 때 `reload()`를 호출하면 DB에서 다시 읽어 맵을 비운 뒤 채운다. 호출한 Instance의 맵만 바뀌므로 DB를 직접 고치거나 다른 Instance에서는 `reload()` 전까지 이전 맵이 쓰인다. 비우고 채우는 사이의 조회는 빈 맵에서 권한 없음을 받아 기본 허용으로 통과할 수 있다(강의 외 분석). 새 맵을 완성해 검증한 뒤 참조를 원자적으로 교체하는 현재 설계의 Snapshot 교체가 이 창을 막는다.

현재 구조도 일치한 규칙의 기권(null)은 통과로 처리하므로([[Spring-Security-Authorization#Request 인가 흐름|기권 처리]]) DB 정책 Manager는 정책 없음을 명시적 거부로 반환한다.

## IP 제한 Voter: 허용은 기권, 거부는 즉시 예외

허용 IP 목록을 DB에 두고 `Authentication.getDetails()`의 `WebAuthenticationDetails` 원격 주소와 비교하는 Voter를 `AffirmativeBased`의 Voter 목록 맨 앞에 넣는다.

- 허용 IP면 `ACCESS_GRANTED`가 아니라 `ACCESS_ABSTAIN`을 반환해 다음 Voter의 역할 심사를 계속하게 한다. Grant 한 표는 다른 심사 없이 허용으로 끝나기 때문이다. 실습에서 Grant로 바꾸자 인증 없이도 접근됐다.
- 비허용 IP면 `ACCESS_DENIED` 대신 `AccessDeniedException`을 직접 던진다. Affirmative에서 Deny 한 표는 다른 Voter의 Grant에 뒤집히기 때문이다.
- 원격 주소는 `request.getRemoteAddr()` 값이라 Reverse Proxy 뒤에서는 Proxy 주소가 된다. Proxy Trust 설정은 [[Spring-Security-Dynamic-Policy|동적 정책]]의 IP 제한 절을 따른다.

반드시 만족해야 하는 조건은 허용 결합 안의 한 표가 아니라 거부권으로 설계한다. 현재 API에서는 `AuthorizationManagers.allOf(IpAddressAuthorizationManager.hasIpAddress(...), 역할 조건)`처럼 결합한다. `hasIpAddress`는 기권하지 않고 허용이나 거부를 내므로 거부권으로 동작한다. 반면 `allOf`는 기권한 조건을 건너뛰고 기본 결정은 모든 조건이 기권할 때만 쓰므로([[Spring-Security-Authorization#Request 인가 흐름|기권 규칙]]), 기본 결정을 거부로 받는 Overload를 써도 역할이나 DB 정책 조건이 기권하면 허용 IP 하나로 통과한다(7.1.1 소스 기준). DB 정책 조건은 정책이 없을 때 명시적 거부를 반환하거나, `allOf(new AuthorizationDecision(false), 정책 조건)`으로 따로 감싼 뒤 `hasIpAddress`와 결합한다. 허용 IP에서 정책이 없는 요청이 거부되는지 Test한다.

## Method 정책: 보호 범위는 기동 때 고정된다

`MapBasedMethodSecurityMetadataSource`는 `패키지.클래스.메소드` 전체 이름과 권한의 맵을 받는다. 강의 단원 제목의 `MapBasedSecurityMetadataSource`는 약칭이며 이런 이름의 클래스는 없다. Legacy 설정은 `GlobalMethodSecurityConfiguration`을 상속한 별도 설정의 `customMethodSecurityMetadataSource()`로 이 원천을 돌려주고, Framework는 이를 어노테이션 원천보다 앞에 두어 `DelegatingMethodSecurityMetadataSource`로 함께 조회한다. Map 방식만 쓰면 어노테이션 속성은 꺼 둔다.

- 이름 해석: 마지막 점으로 클래스와 Method를 나누고 같은 이름의 Overload와 앞뒤 `*` wildcard 일치를 모두 등록한다. 클래스나 Method를 찾지 못하면 `IllegalArgumentException`으로 기동이 실패하므로 DB에 남은 오래된 이름이 다음 배포를 멈출 수 있다.
- 기동 시 결정: 컨테이너 초기화 때 Auto Proxy 생성기가 `MethodSecurityMetadataSourceAdvisor`의 Pointcut(해당 Method에 권한 속성이 있는지)으로 Proxy 대상을 정하고 `MethodSecurityInterceptor`를 Advice로 붙인다. Javadoc도 AOP Framework가 Advice 계산을 Cache하므로 Interceptor가 매번 판단하는 것보다 빠르다고 설명한다. 보안 설정이 없는 Method는 Advice 없이 바로 호출된다.
- 결과: URL은 요청마다 메모리 맵을 조회하므로 `reload()`로 맵을 다시 채운 Instance는 다음 요청부터 바뀐 규칙을 쓰지만, Method는 DB에 규칙을 추가해도 기동 때 Proxy되지 않은 Bean에는 집행 지점이 없다. 일반 Auto Proxy 시점은 [[Spring-AOP-Auto-Proxy-and-BeanPostProcessor|Auto Proxy와 BeanPostProcessor]]를 따른다.

### Pointcut 형식과 ProtectPointcutPostProcessor

전체 이름 대신 DB에 `execution(* com.example.service.*Service.*(..))` 같은 AspectJ 표현식을 저장해 범위를 넓게 지정할 수도 있다. `ProtectPointcutPostProcessor`는 `BeanPostProcessor`로 Bean의 public Method를 Pointcut과 비교해 일치한 Method를 Map 원천에 등록하고, 이후 인가는 Map 원천 경로와 같다.

- 한 Method에는 처음 일치한 Pointcut 하나만 적용되므로 입력 순서가 권한을 바꾼다. DB 정렬 기준을 고정하지 않으면 기동마다 Method와 권한의 결합이 달라질 수 있다.
- 7.1 소스 기준 Parser가 지원하는 Primitive는 `execution`, `args`와 이름 참조뿐이다. `within`, `@annotation` 같은 표현식은 Parse 단계에서 거부된다.
- 7.1에서도 package-private `final` 클래스라 Java 설정에서는 Reflection으로 만들어야 하고, 일치 검사 예외를 잡지 않아 한 표현식의 예외가 초기화를 멈춘다. 강의의 우회(클래스를 복사해 public으로 바꾸고 예외 시 불일치로 처리)는 강사도 공식 방식이 아니라고 밝혔다. 예외를 불일치로 삼키면 보호하려던 Method가 조용히 비보호로 남는 fail-open이 되므로, 쓰더라도 Bean, Method와 표현식을 경고로 남기고 보호용 Pointcut이 하나도 일치하지 않으면 기동을 실패시킨다.
- 현재 공식 대안은 `@Role(BeanDefinition.ROLE_INFRASTRUCTURE)` static `Advisor` Bean에서 `AspectJExpressionPointcut`과 `AuthorizationManagerBeforeMethodInterceptor`를 묶는 공개 API이고, XML은 `<method-security>` 안의 `<protect-pointcut>`이다. DB에서 읽어 만들더라도 Advisor와 Pointcut은 기동 때 고정된다.

DB에 AspectJ 표현식이나 코드 식별자를 저장하는 방식은 Admin이 임의 SpEL을 저장하는 것과 같은 위험군이다. Domain Action 기반 정책을 우선하고, 불가피하면 저장 전에 Parse와 일치 결과를 미리 검증한다.

## ProxyFactory 실시간 반영 실험

강의는 공식 기능이 아닌 Method 인가의 실시간 반영을 직접 구현했다.

- 보안 대상을 등록할 때 `ProxyFactory`로 대상 Proxy를 만들어 Advice를 붙이고, `DefaultSingletonBeanRegistry`에서 기존 Bean을 지운 뒤 같은 이름으로 Proxy를 등록한다. 해제할 때는 Advice를 제거한다.
- `MapBasedMethodSecurityMetadataSource`를 직접 쓰는 Custom Method Interceptor를 두고, 자원 관리 Controller가 등록과 해제를 호출한다.
- 재기동 없이 등록과 해제는 동작했지만, 등록된 상태로 재기동한 뒤 삭제하면 보안 설정이 제거되지 않는 결함을 강사가 미해결로 남겼다.

원인 가설(미검증): 재기동 뒤에는 기동 시 Auto Proxy 경로가 만든 Proxy와 Advisor가 적용되고, 삭제 로직은 자신이 `ProxyFactory`로 만든 Proxy와 Advice만 되돌린다. 같은 정책 상태를 두 경로가 서로 다른 객체 그래프로 만들면 한 경로의 역연산이 다른 경로의 결과를 되돌리지 못한다. 또 7.1의 `MapBasedMethodSecurityMetadataSource`는 내부 맵이 `HashMap`이라 Runtime 추가는 동시성 보호가 없는 in-place 변경이다. 적용 경로가 둘이면 등록, 재기동, 삭제, 재등록 왕복과 여러 Instance의 수렴을 Test해야 하고, 가능하면 고정된 집행점과 데이터 갱신이라는 한 경로만 둔다.

## 현재 구조로 옮기기

- URL과 Method 모두 고정된 `AuthorizationManager` 집행점이 Versioned Policy Snapshot을 호출마다 평가하게 한다.
- 보호 대상 Method 집합은 Annotation이나 명시 Advisor로 기동 때 확정하고, 대상을 늘리는 일은 Runtime 정책 변경이 아니라 배포 변경으로 다룬다.
- 정책 없음, 평가 오류와 Snapshot 교체 중 상태는 모두 거부로 수렴시킨다.

## 출처

- 정수원 강사, [9) 인가 개념 및 필터 이해](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=31606)
- 정수원 강사, [3) 웹 기반 DB 인가 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=34076)
- 정수원 강사, [4) FilterInvocationSecurityMetadataSource 1](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29877)
- 정수원 강사, [5) FilterInvocationSecurityMetadataSource 2](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29878)
- 정수원 강사, [6) 웹 기반 인가처리 실시간 반영](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29879)
- 정수원 강사, [7) 인가처리 허용 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29880)
- 정수원 강사, [9) IP 접속 제한](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29882)
- 정수원 강사, [8) 인증 부가 기능](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29860)
- 정수원 강사, [2) AOP Method 기반 DB 연동 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=35392)
- 정수원 강사, [4) MapBasedSecurityMetadataSource 1](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29884)
- 정수원 강사, [5) MapBasedSecurityMetadataSource 2](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29886)
- 정수원 강사, [6) MapBasedSecurityMetadataSource 3](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29917)
- 정수원 강사, [7) ProtectPointcutPostProcessor](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29888)
- 정수원 강사, [ProxyFactory를 활용한 실시간 Method 보안](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29918)
- [Spring Security 7.1, Authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/index.html)
- [Spring Security 7.1, Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)
- [Spring Security 7.1, Method Security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html)
- [Spring Security 7.1 API, AbstractSecurityInterceptor](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/access/intercept/AbstractSecurityInterceptor.html)
- [Spring Security 7.1 API, AuthorizationManagers](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/authorization/AuthorizationManagers.html)
- [Spring Security 7.1 API, MethodSecurityMetadataSourceAdvisor](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/access/intercept/aopalliance/MethodSecurityMetadataSourceAdvisor.html)
- [Spring Security 7.1 API, MapBasedMethodSecurityMetadataSource](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/access/method/MapBasedMethodSecurityMetadataSource.html)
- [ProtectPointcutPostProcessor.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/method/ProtectPointcutPostProcessor.java)
- [GlobalMethodSecurityConfiguration.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/annotation/method/configuration/GlobalMethodSecurityConfiguration.java)
- [AuthorizationFilter.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/web/src/main/java/org/springframework/security/web/access/intercept/AuthorizationFilter.java)
- [AuthorizationManagers.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/core/src/main/java/org/springframework/security/authorization/AuthorizationManagers.java)

## 관련 문서

- [[Spring-Security-Dynamic-Policy|DB 기반 동적 정책]]
- [[Spring-Security-Authorization|Request와 Method 인가]]
- [[Spring-AOP-Auto-Proxy-and-BeanPostProcessor|Spring AOP Auto Proxy]]
- [[Access-Control-Models|결합 알고리즘과 fail-closed]]

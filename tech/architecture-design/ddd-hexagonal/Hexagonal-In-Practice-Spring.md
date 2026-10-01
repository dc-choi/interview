---
tags: [architecture, hexagonal, spring, port-adapter]
status: done
category: "Architecture - DDD, Hexagonal"
aliases: ["Spring 헥사고날 포트 계약"]
---

# Spring 헥사고날의 포트 계약과 팀 관례

[[Hexagonal-In-Practice|헥사고날 실전 적용]]의 포트 소유권을 Spring 코드로 표현할 때의 판단 기준이다.

## 이름과 반환 계약

포트는 구현 클래스가 아니라 소비자가 필요한 의도를 표현한다. 회원 등록과 회원 조회, 강의 편집과 공개처럼 변경 이유와 소비자가 다른 계약은 나눌 수 있다. 포트마다 구현 클래스를 하나씩 만들 필요는 없으며 한 서비스가 여러 작은 포트를 구현해도 된다.

주석에는 전제 조건, 부재의 의미, 업무 오류와 반환 계약을 적는다. 정상적인 부재에는 Optional을, 존재가 필수인 작업에는 명시적인 오류를 선택할 수 있다. 어떤 예외 클래스를 쓰는지는 팀 관례이며 존재하지 않는 ID가 언제나 프로그램 버그인 것은 아니다. DTO와 예외의 패키지도 포트의 의존 방향을 지킨다.

## 합성 애노테이션

`@Service`와 `@Transactional`을 조합해 애플리케이션 서비스 역할을 표현할 수 있다. 런타임에 Spring이 읽어야 하므로 적용 대상과 `RUNTIME` 보존을 지정한다. 검증이 필요한 서비스에는 검증 구성을 함께 적용하되, 애노테이션만 붙였다고 모든 호출 경로에서 프록시 기반 검증과 트랜잭션이 동작한다고 가정하지 않는다.

Spring이 메타 애노테이션을 탐색하는 방식과 컴파일 도구가 소스를 변환하는 방식은 다르다. Lombok의 생성자 생성 등을 같은 합성 방식으로 묶을 수 있다고 가정하지 않는다. 실제 빈 등록, 트랜잭션과 입력 검증은 호출 경계를 통과하는 테스트로 확인한다.

## 개발 가이드에 남길 최소 기준

- 포트 소유권, 계층 의존 방향과 예외 허용 범위
- 생성과 상태 변경, 입력 검증과 도메인 불변식의 책임
- DTO, 예외와 Repository 계약의 위치
- null과 부재 처리, 외부 기술을 어댑터에 두는 기준
- 아키텍처 검증과 공개 계약 테스트

도메인 모델 문서에는 업무 규칙을, 개발 가이드에는 이 기술 관례를 둔다. 실제 결정이 바뀌면 함께 고치고, AI의 규칙 준수 주장도 diff와 실행 결과로 확인한다.

## 출처

- [포트의 설계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453033)
- [회원 인증 포트 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453034)
- [강사 애플리케이션 포트 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=454904)
- [강사 애플리케이션 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=457085)
- [강의 애플리케이션 서비스 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=465195)
- [수강 애플리케이션 서비스 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=467531)
- [수강 애플리케이션 서비스 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=467534)
- [수강 애플리케이션 서비스 개발 (3)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=468588)
- [커리큘럼 애플리케이션 서비스 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471508)
- [커리큘럼 애플리케이션 서비스 개발 (3)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471510)
- [커스톰 스트레오 타입 합성 애노테이션](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458025)
- [스테레오타입 애노테이션 적용](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458883)
- [개발 가이드 업데이트](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453817)
- [ArchUnit을 이용한 슬라이스 의존 관계 검증](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=461995)
- [Part 2 강의 정리와 AI 시대의 클린 스프링](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=472191)

---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["백엔드 런타임과 프레임워크 주제 어휘", "Vocabulary Backend"]
ontology_concepts:
  - {id: backend, type: Topic, label: Backend, aliases: [백엔드]}
  - {id: api, type: Topic, label: API}
  - {id: graphql, type: Topic, label: GraphQL}
  - {id: runtime, type: Topic, label: Runtime, aliases: [런타임]}
  - {id: nodejs, type: Topic, label: Node.js}
  - {id: v8, type: Topic, label: V8}
  - {id: nestjs, type: Topic, label: NestJS}
  - {id: express, type: Topic, label: Express}
  - {id: framework, type: Topic, label: Framework, aliases: [프레임워크]}
  - {id: jvm, type: Topic, label: JVM}
  - {id: class-loader, type: Topic, label: ClassLoader, broader: jvm}
  - {id: spring, type: Topic, label: Spring, aliases: [Spring Framework, 스프링]}
  - {id: spring-boot, type: Topic, label: Spring Boot, broader: spring}
  - {id: spring-data-jpa, type: Topic, label: Spring Data JPA, broader: spring}
  - {id: servlet, type: Topic, label: Servlet}
  - {id: mvc, type: Topic, label: MVC, aliases: [Model-View-Controller]}
  - {id: aop, type: Topic, label: AOP, aliases: [Aspect-Oriented Programming, 관점 지향 프로그래밍]}
  - {id: di, type: Topic, label: Dependency Injection, aliases: [DI, 의존성 주입]}
  - {id: interceptor, type: Topic, label: Interceptor}
  - {id: decorator, type: Topic, label: Decorator}
  - {id: orm, type: Topic, label: ORM, aliases: [Object-Relational Mapping]}
  - {id: jpa, type: Topic, label: JPA, aliases: [Jakarta Persistence, Java Persistence API], broader: orm}
  - {id: hibernate, type: Topic, label: Hibernate, broader: orm}
  - {id: typeorm, type: Topic, label: TypeORM, broader: orm}
  - {id: mikroorm, type: Topic, label: MikroORM, broader: orm}
  - {id: jdbc, type: Topic, label: JDBC}
  - {id: integration, type: Topic, label: Integration}
  - {id: repository, type: Topic, label: Repository}
  - {id: pagination, type: Topic, label: Pagination, aliases: [페이지네이션]}
  - {id: validation, type: Topic, label: Validation}
  - {id: error-handling, type: Topic, label: Error Handling, aliases: [에러 처리]}
  - {id: async, type: Topic, label: Async, aliases: [asynchronous, 비동기]}
  - {id: session, type: Topic, label: Session, aliases: [세션]}
  - {id: lifecycle, type: Topic, label: Lifecycle}
---

# 주제 어휘: 백엔드 런타임과 프레임워크

문서 frontmatter의 `tags` 표기를 Node.js, NestJS, Spring, JPA와 ORM 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]

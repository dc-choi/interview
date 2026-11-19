---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["CS, 아키텍처와 테스트 주제 어휘", "Vocabulary CS"]
ontology_concepts:
  - {id: cs, type: Topic, label: CS, aliases: [Computer Science, 컴퓨터 과학]}
  - {id: fundamentals, type: Topic, label: Fundamentals}
  - {id: algorithm, type: Topic, label: Algorithm, aliases: [알고리즘]}
  - {id: coding-test, type: Topic, label: Coding Test, aliases: [코딩 테스트]}
  - {id: data-structure, type: Topic, label: Data Structure, aliases: [자료구조]}
  - {id: array, type: Topic, label: Array, aliases: [arrays, 배열], broader: data-structure}
  - {id: linked-list, type: Topic, label: Linked List, broader: data-structure}
  - {id: hashset, type: Topic, label: HashSet, broader: data-structure}
  - {id: string, type: Topic, label: String, aliases: [strings, 문자열]}
  - {id: graph, type: Topic, label: Graph}
  - {id: statistics, type: Topic, label: Statistics, aliases: [통계]}
  - {id: date-time, type: Topic, label: Date and Time}
  - {id: os, type: Topic, label: OS, aliases: [Operating System, 운영체제]}
  - {id: linux, type: Topic, label: Linux, broader: os}
  - {id: filesystem, type: Topic, label: File System, aliases: [파일 시스템]}
  - {id: io, type: Topic, label: I/O}
  - {id: memory, type: Topic, label: Memory, aliases: [메모리]}
  - {id: concurrency, type: Topic, label: Concurrency, aliases: [동시성]}
  - {id: thread, type: Topic, label: Thread, aliases: [스레드]}
  - {id: process, type: Topic, label: Process}
  - {id: javascript, type: Topic, label: JavaScript, aliases: [JS, 자바스크립트]}
  - {id: typescript, type: Topic, label: TypeScript, aliases: [타입스크립트]}
  - {id: java, type: Topic, label: Java, aliases: [자바]}
  - {id: python, type: Topic, label: Python, aliases: [파이썬]}
  - {id: rust, type: Topic, label: Rust}
  - {id: cpp, type: Topic, label: C++}
  - {id: type-system, type: Topic, label: Type System, aliases: [타입 시스템]}
  - {id: prototype, type: Topic, label: Prototype}
  - {id: scope, type: Topic, label: Scope}
  - {id: function, type: Topic, label: Function}
  - {id: functional, type: Topic, label: Functional Programming, aliases: [함수형 프로그래밍]}
  - {id: category-theory, type: Topic, label: Category Theory, aliases: [범주론]}
  - {id: immutability, type: Topic, label: Immutability, aliases: [불변성]}
  - {id: oop, type: Topic, label: OOP, aliases: [Object-Oriented Programming, 객체지향 프로그래밍]}
  - {id: inheritance, type: Topic, label: Inheritance, aliases: [상속]}
  - {id: design-pattern, type: Topic, label: Design Pattern, aliases: [디자인 패턴]}
  - {id: behavioral, type: Topic, label: Behavioral}
  - {id: antipattern, type: Topic, label: Antipattern, aliases: [antipatterns, 안티패턴]}
  - {id: code-quality, type: Topic, label: Code Quality, aliases: [코드 품질]}
  - {id: refactoring, type: Topic, label: Refactoring, aliases: [리팩터링]}
  - {id: legacy, type: Topic, label: Legacy, aliases: [레거시]}
  - {id: tooling, type: Topic, label: Tooling}
  - {id: devtools, type: Topic, label: DevTools}
  - {id: architecture, type: Topic, label: Architecture, aliases: [아키텍처]}
  - {id: system-design, type: Topic, label: System Design, aliases: [시스템 설계]}
  - {id: ddd, type: Topic, label: DDD, aliases: [Domain-Driven Design, 도메인 주도 설계]}
  - {id: microservices, type: Topic, label: Microservices, aliases: [microservice, msa, 마이크로서비스]}
  - {id: evolution, type: Topic, label: Evolution}
  - {id: design, type: Topic, label: Design}
  - {id: testing, type: Topic, label: Testing, aliases: [test, 테스트]}
  - {id: integration-test, type: Topic, label: Integration Test, aliases: [통합 테스트], broader: testing}
  - {id: quality, type: Topic, label: Quality}
---

# 주제 어휘: CS, 아키텍처와 테스트

문서 frontmatter의 `tags` 표기를 언어, 자료구조와 알고리즘, 운영체제, 프로그래밍 패러다임, 아키텍처와 테스트 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]

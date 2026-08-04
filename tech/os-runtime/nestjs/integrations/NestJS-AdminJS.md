---
tags: [nestjs, adminjs, admin-panel, mongoose, operations]
status: done
verified_at: 2026-08-04
category: "OS & Runtime - NestJS"
aliases: ["NestJS AdminJS", "AdminBro", "NestJS 관리자 페이지"]
---

# NestJS AdminJS 통합

AdminJS는 Node.js 애플리케이션의 ORM/ODM model을 운영용 CRUD UI와 REST API로 노출하는 별도 제품이다. NestJS가 자동 관리자 화면을 제공하는 것은 아니다. 강의의 **AdminBro**와 `adminbro.js-*` package 이름은 과거 명칭이고, 현재 기준은 `adminjs`, `@adminjs/nestjs`, `@adminjs/mongoose`다.

## 현재 통합 경계

- Mongoose를 쓰면 `AdminJS.registerAdapter()`로 `@adminjs/mongoose`의 `Resource`, `Database` adapter를 등록하고 `resources`에 노출할 model을 명시한다.
- `@adminjs/nestjs` 5.x는 Express 기반 Nest application만 지원한다. [[NestJS-Platform-Adapter|FastifyAdapter]]에서는 같은 plugin을 그대로 사용할 수 없다.
- AdminJS v7 package는 ESM 전용이지만 Nest의 일반 CommonJS project와 맞물리는 제약이 있다. 공식 Nest guide의 dynamic import와 NodeNext 설정을 현재 project build 방식에 맞춰 검증한다.
- `createAdminAsync()`는 DB 연결과 ConfigService 의존 설정을 module 초기화 순서에 맞추는 통합 지점이다. adapter 등록, model 연결과 관리자 UI 초기화가 모두 완료된 뒤 route를 열어야 한다.

## 관리자 UI는 보안 경계다

관리자 화면은 단순 scaffold가 아니라 production data를 읽고 바꾸는 고권한 애플리케이션이다.

- resource 전체를 자동 노출하지 않고 필요한 model, property와 action만 allowlist한다.
- 기본 예제의 고정 email/password나 cookie secret를 복사하지 않는다. 기존 SSO와 MFA, role 기반 인가를 연결하고 secret는 [[NestJS-Configuration|ConfigService]]로 주입한다.
- session store는 다중 instance에서도 공유하고 `Secure`, `HttpOnly`, `SameSite`, CSRF 방어와 짧은 idle timeout을 적용한다.
- 관리자 action의 실행 주체, 대상, 변경 전후와 결과를 감사 log에 남기고 위험한 bulk delete, export에는 재인증이나 승인 절차를 둔다.
- 가능하면 VPN, identity-aware proxy 또는 별도 admin domain으로 network 경계를 좁힌다. 일반 API의 사용자 인가를 관리자 UI 인증으로 대체하지 않는다.

## 도입 판단

내부 CRUD와 운영 도구를 빠르게 만드는 데는 유용하지만, 복잡한 workflow와 도메인 불변식이 model 직접 수정으로 우회되지 않는지 먼저 확인한다. 고객 지원, 환불, 권한 변경처럼 부작용이 큰 작업은 AdminJS 기본 CRUD 대신 application service를 호출하는 custom action으로 만든다.

## 관련 문서

- [[NestJS-MongoDB|NestJS MongoDB와 Mongoose]]
- [[NestJS-Configuration|NestJS Configuration]]
- [[NestJS-Platform-Adapter|Express와 Fastify adapter 차이]]
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사]]

## 출처

- [AdminJS — Nest plugin](https://docs.adminjs.co/installation/plugins/nest)
- [AdminJS — Mongoose adapter](https://docs.adminjs.co/installation/adapters/mongoose)
- [AdminJS — Authentication](https://docs.adminjs.co/basics/authentication)
- 강의: [NestJS 관리자 페이지 개발](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=91374)

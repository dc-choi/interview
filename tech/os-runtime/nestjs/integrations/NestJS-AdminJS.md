---
tags: [nestjs, adminjs, admin-panel, mongoose, operations]
status: done
verified_at: 2026-09-30
category: "OS & Runtime - NestJS"
aliases: ["NestJS AdminJS", "AdminBro", "NestJS 관리자 페이지"]
---

# NestJS AdminJS 통합

AdminJS는 Node.js 애플리케이션의 ORM/ODM model을 운영용 CRUD UI와 REST API로 노출하는 별도 제품이다. NestJS가 자동 관리자 화면을 제공하는 것은 아니다. 강의의 **AdminBro**와 `adminbro.js-*` package 이름은 과거 명칭이고, 현재 기준은 `adminjs`, `@adminjs/nestjs`, `@adminjs/mongoose`다.

## 현재 통합 경계

- Mongoose를 쓰면 `AdminJS.registerAdapter()`로 `@adminjs/mongoose`의 `Resource`, `Database` adapter를 등록하고 `resources`에 노출할 model을 명시한다.
- 공식 Nest plugin 문서는 `@adminjs/nestjs` 5.x가 Express 기반 Nest application만 지원한다고 적는다. 2026-09-30 npm latest인 7.0.0도 내장 loader는 Express뿐이고 다른 platform은 `customLoader`를 직접 구현해야 하므로, [[NestJS-Platform-Adapter|FastifyAdapter]]에서는 같은 plugin을 그대로 사용할 수 없다.
- AdminJS v7 package는 ESM 전용이지만 Nest의 일반 CommonJS project와 맞물리는 제약이 있다. 공식 Nest guide의 dynamic import와 NodeNext 설정을 현재 project build 방식에 맞춰 검증한다.
- `createAdminAsync()`는 DB 연결과 ConfigService 의존 설정을 module 초기화 순서에 맞추는 통합 지점이다. adapter 등록, model 연결과 관리자 UI 초기화가 모두 완료된 뒤 route를 열어야 한다.

## Model 배선과 커스터마이징 지점

AdminModule이 도메인 module의 Model을 받으려면 module 경계를 명시적으로 열어야 한다. 도메인 module이 `MongooseModule.forFeature()`로 등록한 Model은 그 module 범위에만 있으므로 `exports: [MongooseModule]`로 공개하고, AdminModule은 그 module을 import한 뒤 Model token을 주입받는다([[NestJS-MongoDB|Model 주입]]). TypeORM의 `exports: [TypeOrmModule]` 재export와 같은 원리다.

```ts
// app.module.ts의 imports 안. AdminJS v7이 ESM 전용이라 dynamic import를 쓴다
import('@adminjs/nestjs').then(({ AdminModule }) =>
  AdminModule.createAdminAsync({
    imports: [BlogModule, ConfigModule],
    inject: [getModelToken(Blog.name), ConfigService],
    useFactory: (blogModel: Model<Blog>, config: ConfigService) => ({
      adminJsOptions: {
        rootPath: '/admin',
        resources: [{
          resource: blogModel,
          options: { properties: { contents: { type: 'richtext' } } },
        }],
        branding: { companyName: 'Example Admin', logo: false },
      },
      auth: {
        authenticate,
        cookieName: 'admin_session',
        cookiePassword: config.getOrThrow<string>('ADMIN_SESSION_SECRET'),
      },
      sessionOptions: { resave: false, saveUninitialized: false }, // 다중 instance면 공유 store 지정
    }),
  }),
),
```

- `rootPath`는 관리자 화면이 열리는 경로다. `auth`를 주면 로그인 화면(`/admin/login`)을 거친다. Nest plugin의 Express loader가 쓰는 `@adminjs/express`는 `cookiePassword`를 express-session의 `secret`으로, `cookieName`을 세션 쿠키 이름으로 넘기므로 `sessionOptions.secret`을 따로 줘도 `cookiePassword`가 덮어쓴다. 계정과 secret 기준은 아래 보안 절을 따른다.
- property의 `type: 'richtext'`는 긴 본문 필드를 WYSIWYG 편집기로 바꾼다. 같은 `options.properties`가 노출 field를 allowlist하는 지점이기도 하다.
- 첫 화면은 `dashboard.component`로 바꾼다. v7에서는 `ComponentLoader`의 `add(name, path)`로 등록한 컴포넌트 이름을 넘기고, loader를 `adminJsOptions.componentLoader`에 둔다.
- `branding`의 `companyName`과 `logo: false`로 기본 AdminJS 로고 대신 서비스 이름을 보여 준다.

## 관리자 UI는 보안 경계다

관리자 화면은 단순 scaffold가 아니라 production data를 읽고 바꾸는 고권한 애플리케이션이다.

- resource 전체를 자동 노출하지 않고 필요한 model, property와 action만 allowlist한다.
- 기본 예제의 고정 email/password나 cookie secret를 복사하지 않는다. 기존 SSO와 MFA, role 기반 인가를 연결하고 secret는 [[NestJS-Configuration|ConfigService]]로 주입한다.
- session store는 다중 instance에서도 공유하고 `Secure`, `HttpOnly`, `SameSite`, CSRF 방어와 짧은 idle timeout을 적용한다.
- 관리자 action의 실행 주체, 대상, 변경 전후와 결과를 감사 log에 남기고 위험한 bulk delete, export에는 재인증이나 승인 절차를 둔다.
- 가능하면 VPN, identity-aware proxy 또는 별도 admin domain으로 network 경계를 좁힌다. 일반 API의 사용자 인가를 관리자 UI 인증으로 대체하지 않는다.

## 도입 판단

조회, 편집과 필터링 화면을 비개발 운영자에게 바로 줄 수 있어 내부 CRUD와 운영 도구를 빠르게 만드는 데는 유용하지만, 복잡한 workflow와 도메인 불변식이 model 직접 수정으로 우회되지 않는지 먼저 확인한다. 고객 지원, 환불, 권한 변경처럼 부작용이 큰 작업은 AdminJS 기본 CRUD 대신 application service를 호출하는 custom action으로 만든다.

## 관련 문서

- [[NestJS-MongoDB|NestJS MongoDB와 Mongoose]]
- [[NestJS-Configuration|NestJS Configuration]]
- [[NestJS-Platform-Adapter|Express와 Fastify adapter 차이]]
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사]]

## 출처

- [AdminJS — Nest plugin](https://docs.adminjs.co/installation/plugins/nest)
- [AdminJS — Mongoose adapter](https://docs.adminjs.co/installation/adapters/mongoose)
- [AdminJS — Authentication](https://docs.adminjs.co/basics/authentication)
- [AdminJS — Writing your own components](https://docs.adminjs.co/ui-customization/writing-your-own-components) (v7 `ComponentLoader`)
- [adminjs-options.interface.ts — AdminJS GitHub](https://github.com/SoftwareBrothers/adminjs/blob/master/src/adminjs-options.interface.ts) (`dashboard.component`, `branding`, `loginPath` 기본값)
- [buildAuthenticatedRouter.ts — @adminjs/express GitHub](https://github.com/SoftwareBrothers/adminjs-expressjs/blob/master/src/buildAuthenticatedRouter.ts) (`cookiePassword`가 session secret을 덮어씀)
- [loaders — @adminjs/nestjs GitHub](https://github.com/SoftwareBrothers/adminjs-nestjs/tree/master/src/loaders) (7.0.0의 Express loader와 `customLoader`)
- [NestJS — Mongo](https://docs.nestjs.com/techniques/mongodb) (`exports: [MongooseModule]`)
- 강의: [NestJS 관리자 페이지 개발](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=91374)

---
tags: [nestjs, exception-filter, error-handling, http-exception]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Exception Filter", "AllExceptionsFilter"]
---

# NestJS Exception Filter — 예외 → 응답 변환

`ExceptionFilter` 인터페이스를 구현하는 Provider. **예외를 HTTP 응답으로 변환**하는 마지막 단계. Guard, Pipe, Interceptor, Handler 어디서 throw됐든 모두 Filter로 흘러옴.

- [[NestJS-Exception-Filter-Basics|파이프라인 위치, 내장 HttpException 자동 매핑, ExceptionFilter 시그니처]]
- [[NestJS-Exception-Filter-Patterns|전역 Catch-all과 타입별 Filter, 커스텀 HttpException 패턴]]
- [[NestJS-Exception-Filter-Scope-Pitfalls|적용 범위와 우선순위, ValidationPipe 연계, 흔한 실수, 면접 체크포인트]]

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-Pipes|Pipes (검증 실패 throw → Filter)]]
- [[NestJS-AOP-Interceptor|Interceptor vs Exception Filter]]
- [[NestJS-Guards|Guards (인증 실패 throw → Filter)]]

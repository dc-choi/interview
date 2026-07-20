---
tags: [nestjs, request-pipeline, middleware, guard, interceptor, pipe, exception-filter]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Request Pipeline", "NestJS 요청 파이프라인"]
---

# NestJS 요청 파이프라인 (request-pipeline 인덱스)

요청이 컨트롤러 핸들러에 도달하기까지 거치는 구성 요소들을 모은다. 실행 순서 한 줄: Middleware → Guards → Interceptor(pre) → Pipes → Handler → Interceptor(post) → Exception Filter.

## 전체 흐름
- [[Request-Lifecycle|요청 라이프사이클 — 전역, 모듈, 라우터 단위 실행 순서 FAQ]]
- [[NestJS-ExecutionContext|ExecutionContext — http/ws/rpc 다중 컨텍스트 추상화, Reflector 메타데이터]]

## 단계별 상세
- [[NestJS-Middleware|Middleware — Express 호환 계층, next() 제어 흐름]]
- [[NestJS-Guards|Guards — 인증과 인가 계층, CanActivate (하위 인덱스)]]
- [[NestJS-AOP-Interceptor|Interceptor — Observable 기반 AOP 설계 (하위 인덱스)]]
- [[NestJS-Pipes|Pipes — 변환과 유효성 검사, ValidationPipe]]
- [[NestJS-Serialization|응답 직렬화 — ClassSerializerInterceptor, @Exclude/@Expose/@Transform]]
- [[NestJS-Exception-Filter|Exception Filter — 예외를 응답으로 변환 (하위 인덱스)]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터 — 파이프라인과 메타데이터 연동 (하위 인덱스)]]
- [[NestJS-File-Upload|File Upload — multer 인터셉터, ParseFilePipe 검증, StreamableFile 응답]]

## 관련 문서
- [[NestJS|NestJS Overview]]

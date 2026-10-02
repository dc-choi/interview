---
tags: [nestjs, i18n, mail, outbox]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS I18n", "NestJS Mail", "NestJS 다국어 알림"]
---

# NestJS 다국어와 알림

현행 공식 문서의 `@nestjs/i18n`과 `@nestjs/mail`을 다룬다. 메일은 요청을 벗어나 전송되는 경우가 많으므로 요청의 언어, 수신자의 언어, 트랜잭션 커밋과 실제 전달을 구분한다. 과거의 별도 커뮤니티 패키지와 API가 같다고 가정하지 않는다.

## 요청 locale과 번역

`I18nModule`의 middleware가 locale을 정하고 AsyncLocalStorage에 보관한다. `I18nService`는 singleton으로 주입해 현재 컨텍스트의 언어를 사용한다. 기본 resolver 조합에서는 query, header, Accept-Language 순서로 첫 지원 언어를 고른다. Accept-Language는 quality를 반영하며 지역 언어의 기반 언어도 확인한다. `fallbacks`의 메시지 언어 매핑은 숫자와 날짜를 형식화할 locale까지 덮어쓰는 것이 아니다.

- `Content-Language`와 사용한 header resolver의 `Vary`가 응답에 붙는다. Query의 언어는 URL에 포함된다. 사용자 계정에서 언어를 고르면 이 헤더만으로 개인화 캐시가 안전해지지 않는다.
- `I18nService.t()`는 컨텍스트가 없으면 기본 locale을 사용한다. 별도 `t()` 함수는 컨텍스트 밖에서 키를 반환한다. 잡과 메일에서 기본값에 기대지 말고 `{ locale }`을 전달한다.
- module augmentation의 `I18nTypes`는 키 오타를 잡는다. 모든 언어 catalog에 그 키가 있는지, ICU 인자가 올바른 타입인지를 보증하지 않는다.
- `Intl.PluralRules`에 따라 `count`로 복수형을 선택하고 `other`를 fallback으로 둔다. formatter를 통한 ICU 메시지와 기본 placeholder/중첩 번역은 같은 문법이 아니다.
- 숫자, 통화, 날짜 형식화는 표시를 바꾼다. 통화 환산을 수행하지 않으며 날짜의 시간대는 명시해 서버 기본값에 의존하지 않는다.

`missingKey`의 기본 fallback과 throw 정책을 구분한다. 개발 환경에서 누락을 예외로 발견할 수 있지만 이 정책은 API의 500을 만들 수 있다. 다른 언어 fallback이 섞인 문장이 허용되는지도 정한다. catalog watcher는 새 파일의 파싱이 성공해야 교체하며 실패하면 이전 값을 유지한다. 배포에는 번역 assets를 포함하고 production watch를 끈다.

## Validation과 프로토콜별 컨텍스트

class-validator 경로에는 `I18nValidationPipe`, Standard Schema 경로에는 `I18nStandardSchemaPipe`를 사용한다. 후자는 issue의 명시 번역 키, origin과 code 등의 규칙으로 메시지를 찾는다. 번역을 찾지 못해도 원래 검증 오류를 유지하는 fallback과 missing-key 정책은 일반 `t()` 호출과 다르다. `value` 등의 오류 인자를 번역 메시지에 노출하면 입력한 비밀번호나 토큰이 응답에 섞일 수 있다.

GraphQL의 HTTP 요청은 middleware 경로가 global prefix를 고려해야 한다. Subscription이나 HTTP 밖 실행은 interceptor로 컨텍스트를 만들 수 있지만 guard가 먼저 실행되므로 그 시점에는 기본 언어를 쓸 수 있다. Field resolver에는 필요할 때 `fieldResolverEnhancers: ['interceptors']`를 켠다.

인증 사용자 언어를 `afterGuardsResolver`로 고르면 기존 query/header resolver의 우선순위가 유지된다. 인증 실패는 그보다 앞서 발생할 수 있다. WebSocket은 Socket.IO handshake 또는 raw socket에 보관한 request에서, microservice는 execution context에서 언어를 정한다. 컨텍스트 밖이나 아직 컨텍스트가 없는 guard에서 `setLocale()`을 부르면 예외가 나며 지원하지 않는 언어를 설정하면 현재 locale이 유지된다.

`forRootAsync()`에서 Nest가 DI로 생성할 loader/resolver/formatter 클래스는 `useFactory`와 같은 최상위 위치에 둔다. factory는 인스턴스를 반환할 수 있다. 클래스와 factory 결과에 같은 설정을 중복 선언하면 시작 오류가 날 수 있다.

## 메일 작성과 렌더링

`MailModule`에 transport를 지정하고 `Mailer`를 주입한다. `Mailable<T>` 클래스는 typed data와 `MailRenderContext`를 받아 subject와 본문 또는 template을 반환한다. `render()`는 MIME과 첨부를 포함한 메시지를 만들지만 전송하지 않는다. 실제 수신자 전달은 `send()`가 수행한다.

| 경계 | 확인할 계약 |
|---|---|
| 주소 | 문자열 한 개에는 주소 하나만 담고 여러 수신자는 배열로 전달한다. 표시 이름은 `{ name, address }`로 전달한다. Bcc는 envelope에 포함하고 MIME header에서는 뺀다. |
| 템플릿 | `FileTemplateEngine`은 logicless Handlebars 부분집합이다. double braces는 HTML을 escape하고 triple braces는 신뢰한 HTML에만 쓴다. quoted attribute 밖의 삽입은 컴파일 오류다. 사용자 HTML을 안전하게 만드는 sanitizer는 아니다. |
| 언어 | `locale`을 수신자 정보에서 명시해 전달한다. `pt-BR`, `pt`, 기본 template 순으로 찾고 partial과 layout도 해당 언어를 사용한다. 관리자 요청의 언어를 수신자 언어로 쓰지 않는다. |
| 첨부 | Buffer, 문자열, stream 또는 로컬 path를 사용한다. 사용자 입력을 로컬 path로 전달하지 않는다. URL 첨부를 임의로 가져오는 API로 취급하지 않는다. |
| 공개 | 개발 preview는 전송과 독립적이다. production에서 preview endpoint를 등록하지 않는다. template assets를 dist에 포함한다. |

커스텀 template engine은 escape와 layout/partial 조합을 책임진다. template 누락이나 컴파일 오류는 `MailTemplateError`로 알려야 불필요하게 재시도하지 않는다. DI로 만들 transport/template 클래스는 async 등록의 최상위에 두고 factory 결과에는 인스턴스를 둔다.

## 커밋과 전송의 실패 경계

주문을 저장한 직후 같은 프로세스에서 메일을 보내면 커밋과 전송 사이에 장애로 알림이 유실될 수 있다. 주문과 outbox 메시지를 **같은 DB 트랜잭션**으로 저장하고, 커밋한 메시지를 relay가 전송한다. 메모리 store는 재시작을 견디지 못한다. 현행 outbox는 production에서 영속 store 없이 시작하는 것을 거부한다. 자세한 store와 relay 계약은 [[NestJS-Reliability]].

- Mail 기본 재시도는 첫 시도 포함 3회다. outbox가 재시도한다면 handler에서는 `retry: false`로 중복된 재시도 곱셈을 막고 relay의 timeout/AbortSignal을 전달한다.
- `idempotencyKey`는 재전달 내내 같게 유지한다. Message-ID의 일관성만으로 SMTP의 중복 배달을 완전히 막는다고 보장하지 않는다. HTTP provider의 중복 제거 지원과 유효 기간도 각각 다르다.
- SMTP 4xx는 보통 일시 오류, 5xx는 영구 오류다. HTTP provider는 408/409/429를 제외한 4xx를 기본 영구 오류로 본다. `retryAfterMs`는 backoff의 최대 대기까지 반영하고 abort는 재시도하지 않는다.
- 수신자 일부가 거부되면 package는 전송 전에 실패 처리하지만, 전송 이후 연결이 끊기면 실제 수락 여부가 불명확할 수 있다. 영구 오류는 dead letter로 보내고 운영자가 주소와 재처리 조건을 판단한다.
- transport의 성공은 provider가 메시지를 수락했다는 뜻이다. 사용자의 받은편지함 도착이나 열람을 증명하지 않는다.

SMTP의 STARTTLS 요구와 인증서 검증을 유지하고 비공개 CA가 필요하면 `tls.ca`를 제공한다. 인증 정보는 secret으로 관리한다. 발신 도메인의 SPF/DKIM/DMARC와 서비스의 전송 정책도 따로 구성한다. File/Log transport는 개발용, InMemory transport는 테스트용이다. shutdown hooks를 켜 전송 중인 작업을 기다리고 SMTP 연결을 닫는다.

## 관측과 검증

`MailEvents.events$`와 `nestjs:mail:sent`/`nestjs:mail:failed` diagnostics channel은 한 send의 재시도 종료 후 발생한다. 메시지 검증 단계의 실패는 이 이벤트 전에 던져질 수 있다. 수신자와 subject 자체도 개인정보이므로 수집 범위를 정한다.

테스트에서는 `InMemoryMailTransport`로 delivery만 바꾸고 template, catalog, outbox/inbox, 실제 migration을 함께 검증할 수 있다. reset/magic link를 본문에서 추출해 후속 요청까지 확인하면 단순 발송 횟수보다 유효한 검증이 된다. 여기서는 공식 예시의 계약을 확인했으며 예제 서버와 메일 API를 실행한 기록은 아니다.

## 관련 문서

- [[NestJS-Application-Services]]
- [[NestJS-Configuration]]
- [[NestJS-Reliability]]
- [[NestJS-Security]]
- [[Validation]]

## 출처

- [NestJS — Internationalization](https://docs.nestjs.com/application/i18n)
- [NestJS — Mail](https://docs.nestjs.com/application/mail)

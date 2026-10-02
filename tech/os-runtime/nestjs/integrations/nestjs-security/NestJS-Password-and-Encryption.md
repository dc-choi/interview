---
tags: [nestjs, crypto, password, scrypt]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 비밀번호와 암호화"]
---

# NestJS 비밀번호와 암호화

비밀번호는 복원 가능한 암호문으로 보관하지 않고 느린 password hash로 검증한다. 응답/인증 secret처럼 다시 읽어야 할 값은 key로 복호화하는 암호화를 사용한다.

## PasswordHasher의 비용과 입력

`AuthenticationModule`이 제공하는 `PasswordHasher`는 Node.js scrypt를 사용한다. 기본 N=2^17, r=8, p=1은 hash마다 약 128MiB를 사용한다. 비동기 libuv thread pool에서 실행되지만 많은 동시 로그인은 pool과 메모리를 소모하므로 [[NestJS-HTTP-Security|rate limiting]]과 동시성 제한을 함께 둔다.

- hash는 매번 random salt를 만들고 `$scrypt$ln=...,r=...,p=...$salt$hash` 형식에 비용을 담는다.
- verify는 일정 시간 비교를 사용한다. unknown 사용자는 undefined hash를 보내 dummy 검증 경로를 타게 한다.
- password는 NFKC로 정규화한다. 가입/로그인/변경에서 같은 계약을 유지한다.
- 빈 값과 4KiB 초과 입력은 hash에서 RangeError, verify에서 hashing 없이 false다. 최소 길이와 유출 password 정책은 애플리케이션이 검사한다.
- 성공한 verify 이후 `needsRehash()`를 확인해 평문을 갖고 있을 때 더 강한 설정으로 갱신한다.

설정은 1GiB memory와 기본 work의 16배를 상한으로 검증한다. 기본 r=8에서 logN은 20까지만 허용되는 이유다. 허용 범위를 넘는 생성 설정은 오류이고 그 비용으로 기록된 hash도 검증하지 않는다. 테스트에서 logN=10으로 비용을 낮춘 결과를 운영 성능으로 해석하지 않는다.

argon2/bcrypt도 ordinary provider에서 사용할 수 있다. 두 package는 native dependency를 요구하며 bcrypt는 password의 첫 72바이트만 읽는다. 긴 Unicode password를 단순 character 길이로 제한하면 이 byte 경계를 놓친다.

## Node crypto와 인증된 암호화

일반 데이터 암호화에는 Node.js `createCipheriv()`/`createDecipheriv()`를 사용할 수 있다. key 길이는 알고리즘이 요구하는 byte 수를 맞추고 IV와 key의 수명/저장을 따로 관리한다.

AES-256-CTR의 encrypt/decrypt 예시는 가역성을 보여주지만 변조 검증을 자동 제공하지 않는다. 보관된 인증 secret/receipt의 위조를 거부해야 하는 용도에는 인증 tag를 검증하는 AES-256-GCM 등 해당 계약을 선택한다.

authentication의 MFA secret과 idempotency response는 AES-256-GCM을 사용하고 record/user 식별자를 authenticated data로 묶는다. random key와 key ID, 이전 key를 포함한 rotation을 관리한다. HKDF는 random secret을 key로 확장하는 방식이며 사람이 선택한 password의 느린 hashing을 대신하지 않는다.

서명은 데이터의 무결성을 확인해도 내용을 숨기지 않는다. session cookie 서명, token 서명, password hashing, secret 암호화를 같은 저장 정책으로 취급하지 않는다.

## 출처

- [NestJS Documentation, Encryption and hashing](https://docs.nestjs.com/security/encryption-and-hashing)
- [NestJS Documentation, Authentication](https://docs.nestjs.com/security/authentication)

## 관련 문서

- [[Password-Hashing]]
- [[libuv-Threading]]
- [[NestJS-Idempotency]]
- [[NestJS-Cookies-and-Sessions]]

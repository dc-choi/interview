---
tags: [runtime, nodejs]
status: done
verified_at: 2026-08-26
category: "OS & Runtime"
aliases: ["보안 모범 사례"]
---

# 보안 모범 사례

## 주요 보안 위협과 완화

**1. HTTP DoS (CWE-400)**
- 역방향 프록시 사용, 서버 타임아웃 설정, 소켓 수 제한

**2. DNS 리바인딩 (CWE-346)**
- 프로덕션에서 `--inspect` 비활성화

**3. 민감 정보 노출 (CWE-552)**
```bash
npm publish --dry-run    # 발행 전 포함 파일 확인
```
```json
{ "files": ["lib/", "index.js", "README.md"] }
```

**4. 타이밍 공격 (CWE-208)**

아래 코드는 Node.js 내장 API가 아니라 별도 `argon2` 패키지의 예시다. 사용 전에 프로젝트에 `npm install argon2`로 의존성을 추가해야 한다.

```js
// 비밀번호는 원문과 해시를 직접 비교하지 않고 비밀번호 해싱 라이브러리로 검증한다.
import * as argon2 from 'argon2';

const valid = await argon2.verify(storedHash, candidatePassword);
```

`crypto.timingSafeEqual()`은 길이가 같은 HMAC이나 비밀 바이트열 비교에 적합하다. 입력 길이가 다르면 예외가 발생하고, 주변 코드까지 상수 시간으로 만들어 주지는 않는다. 비밀번호 저장과 검증은 [[Password-Hashing|비밀번호 해싱]]처럼 Argon2id, scrypt 또는 기존 시스템의 bcrypt 검증 함수를 사용한다.

**5. 프로토타입 오염 (CWE-1321)**
```js
const data = JSON.parse('{"__proto__": { "polluted": true}}');
const unsafe = Object.assign({}, data);
unsafe.polluted;  // true: Object.prototype의 setter가 대상 객체의 프로토타입을 바꿈

const safe = Object.assign(Object.create(null), data);
safe.polluted;                         // undefined
Object.hasOwn(safe, '__proto__');      // true: 일반 데이터 키로만 저장됨
```

입력 스키마에서 `__proto__`, `constructor`, `prototype` 키를 거부하는 것이 우선이고, 프로토타입이 필요 없는 사전은 `Object.create(null)`이나 `Map`으로 만든다. 런타임 방어를 추가할 수 있다.

```bash
node --disable-proto=throw app.js
```

**6. 악의적 제3자 모듈 (CWE-1357)**
```bash
npm ci --ignore-scripts   # lockfile 그대로 설치하고 lifecycle script를 실행하지 않음
npm audit                 # 공개된 취약점 확인
```

`npm audit`은 알려진 취약점을 찾는 도구이지 악성 패키지 탐지 보장은 아니다. 의존성 추가를 검토하고 lockfile 변경과 설치 스크립트를 함께 확인한다.

**7. 권한 모델**
```bash
node --permission app.js   # 파일/네트워크/자식 프로세스 접근 제한
```

권한 모델은 신뢰한 코드의 우발적 접근을 줄이는 안전장치이며, 악성 코드를 격리하는 보안 경계는 아니다. 신뢰하지 않는 코드는 별도 OS 사용자, 컨테이너나 샌드박스로 격리한다.

**8. 몽키 패칭 방지**
```bash
node --frozen-intrinsics app.js   # 실험 옵션이므로 대상 Node.js 버전에서 지원 상태 확인
```

## 출처

- [Node.js, Crypto](https://nodejs.org/api/crypto.html)
- [Node.js, Permissions](https://nodejs.org/api/permissions.html)
- [Node.js, Command-line API](https://nodejs.org/api/cli.html)
- [Node.js, Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [npm Docs, npm-ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [npm Docs, npm-audit](https://docs.npmjs.com/cli/commands/npm-audit)
- [npm Docs, npm-publish](https://docs.npmjs.com/cli/commands/npm-publish)
- [OWASP, Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP, Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)
- [node-argon2 — GitHub](https://github.com/ranisalt/node-argon2)

## 관련 문서

- [[Password-Hashing|비밀번호 해싱]]

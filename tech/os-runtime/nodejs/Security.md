---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["보안 모범 사례"]
---

# 보안 모범 사례

Node 코어의 취약점 분류와 애플리케이션의 위협 모델은 다르다. 의존성 코드와 실행 파일 시스템을 Node가 신뢰한다고 해서 서비스가 그 입력을 무조건 신뢰해도 된다는 뜻은 아니다.

## 주요 보안 위협과 완화

**1. HTTP DoS (CWE-400)**
- 요청 본문 크기와 처리 비용을 제한하고 `headersTimeout`, `requestTimeout`, `timeout`, `keepAliveTimeout`을 목적에 맞게 설정한다. 요청과 소켓의 `error`를 처리한다.
- 클라이언트 Agent의 `maxSockets`는 아웃바운드 연결 제한이다. 인바운드 공격 방어는 서버, 프록시와 애플리케이션의 연결 및 요청 제한으로 설계한다.
- 프록시와 Node가 모호한 HTTP 메시지를 다르게 해석하면 request smuggling이 생길 수 있다. `insecureHTTPParser`에 의존하지 않고 양쪽을 패치하며 프로토콜 변환 경계를 검증한다.

**2. DNS 리바인딩 (CWE-346)**
- Inspector는 런타임 코드를 실행할 권한을 제공한다. 공개 인터페이스에 노출하지 않는다. 운영 진단이 필요하면 loopback 바인딩과 인증된 터널을 사용하고 종료 후 닫는다. DNS rebinding을 포함한 브라우저 경유 접근도 고려한다.

**3. 민감 정보 노출 (CWE-552)**
```bash
npm publish --dry-run    # 발행 전 포함 파일 확인
```
```json
{ "files": ["lib/", "index.js", "README.md"] }
```

게시 전에 실제 tarball의 내용을 검사한다. 노출 뒤에는 패키지 삭제 가능 여부와 별개로 유출된 자격 증명을 폐기하고 교체한다. 이미 다운로드된 사본은 unpublish로 회수되지 않는다.

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

`npm audit`은 알려진 취약점을 찾는 도구이지 악성 패키지 탐지 보장은 아니다. 직접 의존성 버전만 고정하면 전이 의존성은 바뀔 수 있으므로 lockfile 변경과 설치 스크립트를 함께 검토한다. GitHub 소스와 실제 게시 tarball도 같다고 가정하지 않는다. `--ignore-scripts`는 네이티브 빌드처럼 필요한 설치 작업도 막을 수 있다.

지원 npm의 `min-release-age`는 새 버전 채택을 일 단위로 지연한다. 탐지 시간을 확보하는 보조책이며 안전성 보장은 아니다. 이 제한이 긴급 보안 수정도 막을 수 있으므로 예외와 재검토 절차를 함께 정한다. OpenSSF Scorecard와 자체 평가 badge는 검토 신호이며 무결점 인증이 아니다.

**7. 권한 모델**
```bash
node --permission app.js   # 파일/네트워크/자식 프로세스 접근 제한
```

권한 모델은 신뢰한 코드의 우발적 접근을 줄이는 안전장치이며, 악성 코드를 격리하는 보안 경계는 아니다. 신뢰하지 않는 코드는 별도 OS 사용자, 컨테이너나 샌드박스로 격리한다.

**8. 몽키 패칭 방지**
```bash
node --frozen-intrinsics app.js   # 실험 옵션이므로 대상 Node.js 버전에서 지원 상태 확인
```

이 flag는 실험 기능이며 임의의 JavaScript 실행을 격리하는 수단이 아니다. 새 전역 생성과 기존 전역 바인딩 교체도 별개의 문제다.

**9. 모듈 검색 경로와 네이티브 메모리**

쓰기 가능한 디렉터리를 모듈 검색 경로로 신뢰하면 파일 삽입으로 다른 코드가 로드될 수 있다. 배포 코드와 쓰기 데이터 경로를 분리하고 배포 파일의 권한과 무결성을 관리한다.

`--secure-heap`은 일부 OpenSSL 할당을 위한 제한된 보안 힙이며 일반 V8 힙 전체를 보호하거나 메모리 안전 결함을 없애지 않는다. Windows에서는 지원하지 않는다. 네이티브 의존성 패치와 프로세스 격리는 별도로 필요하다.

## 출처

- [npm Docs, min-release-age](https://docs.npmjs.com/cli/v11/using-npm/config/#min-release-age)

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

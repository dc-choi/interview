---
tags: [runtime, nodejs]
status: note
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
```js
// 취약: 타이밍 차이 발생
password === hash;
// 안전: 상수 시간 비교
crypto.timingSafeEqual(Buffer.from(password), Buffer.from(hash));
```

**5. 프로토타입 오염 (CWE-1321)**
```js
const data = JSON.parse('{"__proto__": { "polluted": true}}');
const c = Object.assign({}, a, data);
c.polluted;  // true — 오염됨!

// 완화
const safeObj = Object.create(null);         // 프로토타입 없는 객체
Object.freeze(MyObject.prototype);            // 프로토타입 동결
Object.hasOwn(obj, 'key');                    // hasOwnProperty 대신
node --disable-proto=throw app.js             // __proto__ 접근 차단
```

**6. 악의적 제3자 모듈 (CWE-1357)**
```bash
npm install --ignore-scripts   # 설치 스크립트 무시
npm ci                         # npm install 대신 사용
npm audit                      # 취약점 감사
```

**7. 권한 모델**
```bash
node --permission app.js   # 파일/네트워크/자식 프로세스 접근 제한
```

**8. 몽키 패칭 방지**
```bash
node --frozen-intrinsics app.js   # 내장 객체 동결
```

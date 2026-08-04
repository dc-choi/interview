---
tags: [cicd, deployment, spa, nodejs, nginx, github-actions]
status: done
verified_at: 2026-08-04
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Single Host SPA API Deployment", "단일 서버 SPA API 배포"]
---

# 단일 서버 SPA와 API 배포

React SPA, NestJS API와 Nginx를 한 서버에 배포하는 구조는 작은 서비스의 유효한 시작점이다. 핵심은 명령어를 외우는 것이 아니라 **동일한 산출물을 재현하고, 안전하게 전환하며, 실패 시 이전 버전으로 돌아가는 배포 계약**을 만드는 것이다.

## 최소 토폴로지

```text
Browser
  -> DNS
  -> Nginx :443, TLS 종료
       -> / 정적 SPA 파일
       -> /api NestJS :3000
  -> systemd, PM2 또는 container runtime이 API process 감시
```

- Nginx는 TLS 종료, 정적 파일, API reverse proxy와 보안 header를 담당한다.
- 애플리케이션 process는 public port에 직접 노출하지 않고 loopback이나 private network에서 수신한다.
- DB와 secret은 SPA bundle이나 Git 저장소가 아니라 서버 측 설정과 secret store에 둔다.
- 단일 host 장애가 전체 서비스 장애가 되는 구조다. 복구 시간, 데이터 중요도와 부하가 커지면 load balancer, 복수 instance와 managed data store를 검토한다.

## 개발 환경과 운영 산출물을 분리한다

개발 중 Vite dev server와 nodemon은 빠른 feedback을 위한 도구다. 운영에서는 각각 build된 정적 파일과 검증된 API 산출물을 실행한다.

1. lockfile을 고정해 의존성을 설치한다.
2. lint, typecheck, unit/integration test를 통과시킨다.
3. SPA와 API를 한 번 build한다.
4. commit SHA와 checksum을 붙인 artifact나 image를 저장한다.
5. 같은 artifact를 staging과 production으로 승격한다.

Create React App은 2025년에 새 앱용으로 deprecated됐다. 새 React 앱은 요구에 맞는 framework를 우선 검토하고, client-only SPA가 필요하면 Vite 같은 build tool을 선택할 수 있다. 특정 bundler 구현을 Vite 전체의 불변 특성으로 외우지 않는다.

OpenAPI UI가 보인다고 runtime과 문서가 자동으로 일치하는 것은 아니다. NestJS decorator에서 schema를 생성하거나 contract-first schema로 code를 생성하고, CI에서 request/response validation과 contract test로 drift를 잡는다.

## 배포 단위와 release layout

운영 서버에서 `git pull`, 의존성 설치와 build를 한 번에 수행하면 서버 상태가 build 결과를 결정한다. 실패 도중 working tree와 의존성이 반쯤 바뀌고 rollback도 어려워진다. 가능하면 CI에서 artifact를 만들고 서버는 검증과 전환만 담당한다.

```text
/srv/app/
  releases/
    <commit-sha>/
  current -> releases/<commit-sha>
  shared/
    config/
    logs/
```

배포 절차는 다음처럼 멱등적으로 설계한다.

1. 새 release directory에 artifact를 내려받는다.
2. checksum, signature와 필요한 configuration을 확인한다.
3. migration의 전후 호환성과 실행 순서를 확인한다.
4. 새 process를 기동하고 local health check를 통과시킨다.
5. `current` symlink 또는 reverse proxy upstream을 원자적으로 전환한다.
6. 외부 smoke test와 핵심 metric을 확인한다.
7. 실패하면 이전 release를 다시 가리키고 process를 복구한다.

PM2 reload, systemd restart나 container 교체는 process 관리 수단이지 배포 전략 자체가 아니다. 장기 요청, connection drain, readiness와 graceful shutdown이 맞물려야 중단을 줄일 수 있다.

## DNS와 TLS

- Route 53 record는 고정 public IP나 지원 AWS resource의 Alias를 가리킨다. DNS 반영 시간을 고정된 하루로 가정하지 말고 TTL, registrar와 resolver cache를 확인한다.
- 먼저 DNS가 새 host를 가리키고 80/443 network path가 열렸는지 확인한 뒤 인증서를 발급한다.
- Certbot 설치 방식에 자동 renewal task가 포함됐는지 `systemctl list-timers`나 system crontab으로 확인한다. 중복 cron을 무조건 추가하지 않는다.
- `certbot renew --dry-run`으로 검증하고 성공 후 Nginx가 새 certificate를 읽도록 deploy hook이나 plugin 동작을 확인한다.
- 인증서 갱신 실패, 만료 잔여일과 HTTPS smoke test를 감시한다.

인증서 발급을 위해 장시간 root shell을 유지할 필요는 없다. 필요한 명령에만 `sudo`를 사용하고 private key file 권한을 제한한다. 자세한 수명주기는 [[ACME-Protocol|ACME 인증서 자동화]]를 따른다.

## GitHub Actions 배포 보안

SSH로 단일 host를 갱신하는 workflow는 단순하지만 production 접근 권한을 CI에 맡긴다. 최소한 다음 경계를 둔다.

- PR에서는 build와 test만 수행하고 보호된 branch의 검증된 commit만 배포한다.
- `permissions`를 기본 read-only로 두고 job별 최소 권한만 연다.
- production environment에 승인자, branch/tag 제한과 environment secret을 둔다.
- third-party action은 repository를 확인한 뒤 full-length commit SHA로 고정한다.
- SSH key는 전용 계정과 제한된 권한을 사용하고 주기적으로 회전한다. host key를 검증해 중간자 공격을 막는다.
- cloud API가 지원하면 장기 access key보다 OIDC 기반의 짧고 제한된 credential을 우선한다.
- workflow와 배포 script 변경은 CODEOWNERS나 필수 review 대상으로 둔다.
- log에 secret, private key와 command argument가 노출되지 않는지 실패 경로까지 확인한다.

SSH pull-in-place는 학습과 작은 내부 서비스에는 쓸 수 있다. 그러나 immutable artifact, 사전 검증, 빠른 rollback과 audit 요구가 커지면 registry 기반 image 배포나 deployment service로 옮긴다.

## SPA 환경 변수는 public configuration이다

Vite의 `VITE_*` 값은 build 시 client bundle에 정적으로 들어가므로 누구나 볼 수 있다. API base URL, public analytics ID처럼 공개 가능한 설정만 둔다. DB password, private API key와 signing secret은 절대 넣지 않는다.

```text
.env                 공통 기본값
.env.local           local override, Git 제외
.env.production      production mode build 값
.env.production.local production local override, Git 제외
```

`.env.local`은 production 전용 파일이라는 뜻이 아니다. Vite는 mode별 파일과 별개로 `.env.local`도 읽으며, 이미 process에 존재하는 변수가 더 높은 우선순위를 갖는다. 값이 build에 compile되므로 server process만 재시작해도 기존 SPA bundle의 API URL은 바뀌지 않는다. 새 값으로 rebuild하거나, 배포 시 생성하는 공개 runtime configuration endpoint/file을 설계한다.

API URL은 가능하면 Nginx에서 같은 origin의 `/api`로 통합하면 환경별 absolute host와 CORS 설정을 줄일 수 있다.

## CORS는 접근 제어와 인증을 대신하지 않는다

개발 port가 다르면 origin의 port가 달라 CORS 검사가 발생한다. `cors()`로 모든 origin을 여는 것은 공개 API가 아니라면 과도하다.

```ts
app.enableCors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
});
```

- 허용 origin, method와 header를 실제 client 계약에 맞춘다.
- credential 요청에는 wildcard origin을 쓰지 않는다.
- CORS는 browser가 cross-origin response를 읽을 수 있는지 제어한다. server-to-server 요청, 인증, 인가와 CSRF 방어를 대신하지 않는다.
- origin을 문자열 부분 일치로 검사하지 말고 정확한 allowlist나 검증된 pattern을 사용한다.
- preflight 실패와 본 요청 실패를 browser network panel과 server log에서 구분한다.

## 배포 완료 조건

| 구간 | 확인할 증거 |
|---|---|
| Build | lockfile 고정, test 통과, artifact SHA/checksum |
| Config | 필수 변수 검증, client 공개 값과 server secret 분리 |
| Data | migration backup/호환성/rollback 판단 |
| Start | process supervision, readiness, graceful shutdown |
| Edge | DNS, TLS chain/renewal, Nginx config test |
| Security | 최소 권한, action pinning, host key, secret log 검사 |
| Verify | health, smoke test, error/latency/business metric |
| Recover | 이전 artifact와 설정, 실행 가능한 rollback 절차 |

## 교정해야 할 단정

- CI는 충돌을 찾는 자동 build만이 아니라 작은 변경을 자주 통합하고 자동 검증하는 practice다.
- Continuous Delivery와 Continuous Deployment는 production 반영의 수동 승인 여부가 다르다.
- Swagger/OpenAPI UI가 code와 문서의 동기화를 자동 보장하지 않는다.
- SSH로 `git pull`하고 restart하는 자동화가 재현 가능한 배포를 자동 보장하지 않는다.
- CORS 허용은 사용자 인증이나 API 보안을 완성하지 않는다.
- `VITE_*` 환경 변수는 secret 저장소가 아니다.
- Certbot을 설치했다고 renewal 성공과 만료 감시까지 보장되지는 않는다.

## 출처

- [React, Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)
- [Vite, Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [GitHub, Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Certbot, Renewing certificates](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates)
- [Kenu 허광남 강사, SPA 개발 환경 구성 1](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106866)
- [Kenu 허광남 강사, SPA 개발 환경 구성 2](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106867)
- [Kenu 허광남 강사, 배포 프로세스](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106868)
- [Kenu 허광남 강사, 도메인 등록과 HTTPS 설정](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106870)
- [Kenu 허광남 강사, 배포 자동화](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106871)
- [Kenu 허광남 강사, CORS와 환경 변수](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106873)

## 관련 문서

- [[CICD-Basics|CI/CD 기초]]
- [[GitHub-Actions|GitHub Actions]]
- [[Reverse-Proxy|Nginx reverse proxy]]
- [[CORS|CORS]]
- [[Route53|Route 53]]
- [[Nodejs-Production-Readiness|Node.js 프로덕션 운영 체크리스트]]

---
tags: [security, web-attacks, command-injection, owasp, nodejs]
status: done
verified_at: 2026-10-01
category: "보안(Security)"
aliases: ["Command Injection", "OS Command Injection", "커맨드 인젝션", "명령어 삽입", "Argument Injection"]
---

# Command Injection

애플리케이션이 운영체제 명령을 실행하면서 사용자 입력을 명령 문자열에 섞으면, 공격자가 셸 메타문자로 명령을 이어 붙여 서버에서 임의 명령을 실행할 수 있다. 공격에 성공하면 해당 프로세스의 권한과 접근 범위 안에서 데이터 유출, 웹 페이지 변조(defacement), 내부망 이동으로 이어질 수 있다. SQL Injection이 쿼리 문법과 데이터를 섞어서 생기듯, 이 공격도 명령과 데이터의 경계가 무너져서 생긴다. [[SQL-Injection]]

```ts
// 취약: 셸이 문자열 전체를 해석한다. host가 "example.com; cat /etc/passwd"면 두 명령이 실행된다.
exec(`ping -c 1 ${host}`);
```

셸은 `;`, `&&`, `|`, `$( )`, 백틱, 리다이렉션을 해석하므로 입력 한 조각이 새 명령이 된다. 동적 코드 실행 함수(`eval`, Python의 `exec`)에 입력을 넣는 것도 같은 부류의 위험이다. 이쪽은 셸 명령이 아니라 언어 코드가 실행된다.

## 방어: 우선순위 순서

1. **OS 명령을 부르지 않는다**: 디렉터리 생성, 파일 복사, 압축, 이미지 변환처럼 표준 라이브러리나 전용 라이브러리로 할 수 있는 일은 그 API를 쓴다. 셸 명령 문자열을 조립하는 경로를 없애지만, 파일 경로와 권한 검증이나 라이브러리 내부의 외부 프로그램 호출 여부는 여전히 확인한다.
2. **명령과 인자를 구조적으로 분리한다**: 꼭 외부 프로그램을 실행해야 하면 셸을 거치지 않고 실행 파일과 인자 배열을 따로 넘긴다. Node.js의 `execFile`과 `spawn`(기본값 `shell: false`), Java의 `ProcessBuilder`(인자 리스트)가 이에 해당한다. 셸 해석을 피하되 대상 프로그램의 옵션과 입력 문법은 별도로 검증한다. `shell: false`여도 `sh -c`나 `node -e`처럼 해석기에 코드 문자열을 전달하면 그 해석기가 코드를 실행한다.
3. **허용 목록으로 검증한다**: 실행할 명령은 고정된 허용 목록에서만 고르고, 인자는 기대하는 형식(호스트명, 숫자, 정해진 값)을 정규식이나 파서로 검증한다. 메타문자를 지우는 거부 목록은 우회되기 쉬워 보조 수단일 뿐이다.
4. **최소 권한으로 실행한다**: 명령을 실행하는 프로세스와 컨테이너의 권한, 파일 시스템 접근, 네트워크 출구를 제한해 뚫렸을 때의 피해를 줄인다.

```ts
import { execFile } from 'node:child_process';

// Linux iputils ping이 /usr/bin/ping에 설치된 환경의 예시
// 서비스가 허용한 호스트만 고르고, 옵션은 서버에서 고정한다
const ALLOWED_HOSTS = new Set(['example.com', 'health.example.com']);
const ping = (host: string): void => {
  if (!ALLOWED_HOSTS.has(host)) throw new InvalidHostError(host);
  execFile('/usr/bin/ping', ['-c', '1', '--', host], { shell: false }, (error, stdout) => {
    // ...
  });
};
```

## 인자 인젝션

셸을 쓰지 않아도 끝이 아니다. 입력이 `-`로 시작하면 대상 프로그램이 그 값을 옵션으로 해석할 수 있다. OWASP의 `curl --help` 예제처럼 원래 의도와 다른 동작을 선택하게 만들며, 도구가 제공하는 옵션에 따라 파일 쓰기나 코드 실행으로 이어질 수도 있다. 셸 이스케이프 함수는 입력을 하나의 인자로 묶을 뿐 이 문제를 막지 못한다. **대상 프로그램이 지원할 때만** 옵션 끝을 알리는 `--` 구분자를 쓰고, 인자 값도 허용 목록으로 검증한다. `--`는 파일 경로, URL, 스크립트 내용까지 안전하게 만드는 구분자가 아니다.

위 예제는 고정된 허용 호스트를 쓰므로 선행 하이픈과 임의의 옵션 문자열을 받지 않는다. 문자 종류만 허용하는 정규식은 `-`로 시작하는 입력도 통과시킬 수 있다. 실행 파일과 스크립트 경로, `PATH`와 환경 변수도 신뢰할 수 있게 고정하며, Windows의 `.bat`/`.cmd`와 플랫폼별 `ping` 옵션을 이 Linux 예제와 동일하게 취급하지 않는다. Node.js `execFile()`은 Windows의 `.bat`/`.cmd`를 직접 실행하지 못하므로, 이를 위해 셸 경로로 전환할 때는 별도의 검토가 필요하다.

## 실행 허용 목록과 쓰기 경로의 분리

허용된 디렉터리에 있는 파일만 실행하더라도, 외부 입력을 처리하는 기능이 그 디렉터리에 파일을 쓸 수 있으면 실행 경계가 무너진다. 셸 메타문자 필터만으로는 경로 순회, 임의 파일 쓰기와 실행 기능이 결합되는 경로를 막지 못한다. 이 경우에는 직접적인 명령 문자열 삽입과 파일 쓰기를 통한 코드 실행을 구분해 점검한다.

2026-08-27 공개된 UniBLEed의 `chat_go`와 `bashrunner` 연구 사례에서는 지식 저장 기능의 경로 순회가 실행 디렉터리의 파일 쓰기로 이어졌다. 실행기는 시작 시 디렉터리 목록을 허용 목록으로 만들고 파일 확장자와 무관하게 `sh`로 실행했다. 허용 목록을 만든 시점과 파일이 추가된 순서도 공격 성립 조건이었다. 이 내용은 연구 당시 동작이며, 현재 배포된 펌웨어 전체가 취약하다는 뜻이 아니다.

방어 검토에서는 사용자 데이터의 저장 위치를 실행 파일 위치와 분리하고, 입력이 정해진 저장 경로를 벗어나지 못하게 검증한다. 실행 허용 목록의 원본을 외부 입력이 바꿀 수 있는지, 실행 파일과 상위 디렉터리에 누가 쓰기 권한을 갖는지, 실행 프로세스가 불필요한 권한을 갖는지도 확인한다. AI의 지식 저장 기능도 같은 파일 시스템 경계를 따른다.

## 점검 포인트

- 코드베이스에서 `exec`, `execSync`, `shell: true`, 문자열로 조립한 명령, `eval`과 `new Function` 사용처를 찾는다. 정적 분석 도구의 규칙으로 막는다.
- 빌드 스크립트, 관리 도구, 이미지와 문서 변환처럼 외부 바이너리를 호출하는 경로가 흔한 진입점이다.
- 셸 명령 대신 라이브러리를 쓰는 편이 대개 더 빠르고 오류 처리도 쉽다. 외부 프로세스 호출의 스트림과 버퍼 특성은 [[Process-Child-Process]]에 있다.

## 체크포인트

- 커맨드 인젝션이 생기는 원리와 SQL Injection과의 공통점
- 라이브러리 API, 셸 없는 인자 배열, 허용 목록 검증, 최소 권한의 우선순위
- 셸을 쓰지 않아도 남는 인자 인젝션, 해석기 실행과 대상 프로그램별 `--` 지원
- 거부 목록 필터링만으로 부족한 이유

## 출처

2026-10-03 부분 검증: 셸 없는 실행과 인자 인젝션의 경계, Node.js의 기본 `shell` 옵션과 Windows 실행 제약, Linux iputils의 옵션 처리 코드를 대조했다. 예제를 실제 운영 환경에서 실행하거나 허용 호스트의 네트워크 접근 정책을 검증한 기록은 아니다.

- [웹 개발을 위해 꼭 알아야하는 보안 공격 — kciter.so, kciter](https://kciter.so/posts/basic-web-hacking/)
- [OWASP Cheat Sheet Series, OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [Node.js Child process API](https://nodejs.org/api/child_process.html)
- [iputils — ping 소스](https://github.com/iputils/iputils/blob/master/ping/ping.c)
- [UniBLEed: Unauthenticated Root RCE on Any Unitree G1 Humanoid Robot Within Bluetooth Range — Olivier Laflamme](https://boschko.ca/g1-ble-rce/) — 2026-08-27 공개 연구의 파일 쓰기와 실행 허용 목록 경로를 2026-10-13 대조했다. 장비 재현과 현재 펌웨어의 수정 여부는 검증하지 않았다.

## 관련 문서

- [[SQL-Injection|SQL Injection]]
- [[File-Upload-Security|파일 업로드 보안]]
- [[Process-Child-Process|Node.js 자식 프로세스]]
- [[Application-Security|애플리케이션 보안]]

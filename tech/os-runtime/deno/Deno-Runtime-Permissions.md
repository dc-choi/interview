---
tags: [runtime, deno, permissions, security]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Deno 권한 모델", "Deno Permissions"]
---

# Deno 권한 모델

Deno 프로그램은 기본적으로 file system, network, environment variable, subprocess 같은 I/O 접근이 없고, 실행하는 사람이 필요한 자원만 flag로 연다. dependency를 포함한 모든 코드가 프로세스의 I/O 권한을 그대로 갖는 Node의 기본값과 가장 크게 다른 점이다. runtime 구성과 dependency 관리는 [[Deno-Runtime]]에서 다룬다.

## Node에서 드러나는 문제

Node 프로세스 안의 모든 코드는 키 파일과 프로세스가 물려받은 환경 변수 전체를 읽을 수 있다. 의존성 하나가 DB 접속 정보를 읽어 외부로 보내도 runtime은 막지 않는다. 컨테이너는 프로세스가 닿을 수 있는 호스트 자원을 줄일 뿐이고, 컨테이너에 주입한 secret과 파일은 그 프로세스의 모든 코드가 여전히 읽는다. 컨테이너와 권한 flag는 서로를 대체하지 않는 별개의 방어층이다.

## 자원별 flag는 서로를 포함하지 않는다

파일을 읽는 코드에 `--allow-read`만 주면 같은 코드의 `Deno.env.get`은 막힌다. `--allow-read`와 `--allow-env`를 모두 줘도 파일 쓰기에는 `--allow-write`가 따로 필요하다. 그래서 주입된 코드가 파일을 덮어쓰려 해도 write 권한이 없는 프로세스에서는 실패한다. 이 차단이 권한 모델의 핵심이며, 필요한 권한을 미리 정의해 두어야 성립한다.

- 짧은 형태는 `-R`(read), `-W`(write), `-N`(net), `-E`(env), `-S`(sys)다.
- 범위를 좁힌다. `--allow-write=./data`처럼 경로를, `--allow-net=api.example.com`처럼 host를 지정한다.
- Deno 2.1부터 `--allow-env="AWS_*"`처럼 끝에 붙이는 wildcard로 환경 변수 묶음을 열 수 있다.
- 넓게 연 뒤 민감한 부분만 빼려면 `--allow-read --deny-read=/etc`처럼 `--deny-*`를 함께 쓴다. deny가 allow보다 우선한다.

## 같은 thread의 코드는 같은 권한을 갖는다

공식 원칙상 같은 thread에서 실행되는 모든 코드는 같은 권한 수준을 공유하고, module마다 다른 권한을 줄 수 없다. 따라서 앞의 덮어쓰기 차단은 앱 자신에게 write 권한이 필요 없을 때만 성립한다. 앱이 파일을 쓴다면 주입된 코드도 같은 write 권한을 얻으므로, flag는 경로와 host를 좁힌 만큼만 피해를 줄인다. `eval`, `new Function`, dynamic import와 Web Worker로 실행한 코드도 기본적으로 호출한 코드와 같은 권한을 가진다.

## 권한이 없을 때의 동작

- 터미널에서 flag 없이 실행하면 Deno가 멈추고 접근 허용 여부를 묻는다.
- stdout이나 stderr가 TTY가 아니거나 `--no-prompt`를 주면 묻지 않는다. 컨테이너와 CI가 이 경우다.
- Deno 권한이 없어 거부된 접근은 `Deno.errors.NotCapable`로 실패한다. Deno 2.0 전에는 이 경우도 `PermissionDenied`였다.
- Deno 2.0부터 `PermissionDenied`는 OS가 거부한 경우를 뜻한다. 예를 들어 컨테이너 사용자에게 디렉터리 쓰기 권한이 없는 경우다.

컨테이너 로그에서 두 에러를 구분하면 고칠 곳이 정해진다. `NotCapable`이면 CMD나 task의 flag를, `PermissionDenied`면 파일 소유권과 image의 `USER`를 고친다. 코드가 새 자원에 접근하도록 바뀌면 flag도 같이 바꿔야 하고, 누락은 build가 아니라 실행 시점에 드러난다. 여러 파일을 glob으로 처리하도록 바꾼 새 image가 실행하자마자 권한 에러로 실패하는 식이다.

## 경계를 사실상 없애는 flag

- `-A`(`--allow-all`)는 sandbox를 끄고 Node와 같은 접근을 준다.
- `--allow-run`으로 띄운 subprocess는 Deno 프로세스에 준 제한이 아니라 별도 program의 권한으로 실행된다. 특히 `--allow-run=deno`는 자식 `deno`를 `--allow-all`로 띄워 부모의 제한을 모두 벗어날 수 있다.
- `--allow-ffi`로 불러온 native library는 같은 프로세스에서 system call을 직접 호출하므로 다른 `--allow-*` flag와 관계없이 동작한다.
- 허용한 실행 파일이나 그 디렉터리에 `--allow-write`까지 주면 바이너리를 덮어써, 다음에 띄우는 subprocess가 공격자 코드가 된다.

## 권한은 module 로딩이 아니라 실행 중 접근을 검사한다

정적 `import`와 문자열 리터럴 specifier를 쓴 `import()`로 이루어진 초기 module graph는 권한 확인 없이 로드된다. 실행 시점에 계산한 specifier의 `import()`만 `--allow-read`나 `--allow-import`로 검사한다. 그래서 dependency로 들어오는 코드 자체는 flag가 아니라 lockfile, `--frozen`과 `--cached-only`로 통제한다([[Deno-Runtime]]의 캐시와 lockfile).

## 신뢰하지 않는 코드는 여러 방어층으로 감싼다

공식 문서는 방어층을 겹치라고 권한다.

1. 최소 권한으로 실행하고 `--frozen` lockfile과 `--cached-only`로 추가 코드 로딩을 막는다.
2. 신뢰하지 않는 부분은 권한을 줄인 Web Worker로 격리한다.
3. `chroot`, `cgroups`, `seccomp` 같은 OS sandbox를 쓴다.
4. gVisor, Firecracker 같은 VM이나 MicroVM에서 실행한다.

컨테이너와 권한 flag는 이 층들의 조합으로 본다. Node 권한 모델의 한계는 [[Security]], dependency 공급망 방어는 [[Supply-Chain-Security]]와 이어진다.

## 필요한 권한을 찾는 방법

컨테이너에서 에러를 보고 권한을 하나씩 추가하는 대신 개발 단계에서 실제 접근을 확인한다.

- 개발 중에는 flag 없이 실행해 prompt로 요청되는 자원을 확인한다.
- Deno 2.5부터 `DENO_AUDIT_PERMISSIONS=<파일 경로>`를 주면 권한 접근을 JSONL audit log로 남긴다. `DENO_TRACE_PERMISSIONS=1`을 함께 주면 요청한 위치의 stack trace도 기록한다.

이 기록으로 최소 flag를 정한 뒤 image와 task에 반영한다.

## task별 최소 권한과 permission set

한 task에는 그 작업에 필요한 flag만 둔다. 모든 flag를 한 task에 적으면 Node와 다를 바가 없다. 같은 thread 안에서는 module별로 권한을 나눌 수 없으므로, 권한을 나누는 단위는 별도 프로세스나 권한을 줄인 Web Worker다. 단계마다 `deno run`을 따로 띄우면 각 단계가 자기 flag만 갖는다.

```json
{
  "tasks": {
    "collect": "deno run --allow-read=./data src/collect.ts",
    "publish": "deno run --allow-env=API_URL --allow-net=api.example.com src/publish.ts",
    "start": "deno task collect && deno task publish"
  }
}
```

- `--allow-net`은 외부와 통신하는 단계에만 주고, read와 write는 data 디렉터리처럼 필요한 경로로 한정한다.
- Deno 2.1부터 task를 `command`, `description`, `dependencies`를 가진 객체로 쓸 수 있다. dependency는 본 task보다 먼저 병렬로 실행되고(기본 동시 실행 수는 CPU core 수), 여러 task가 같은 task에 의존해도 한 번만 실행된다. 순서가 중요한 단계는 dependency 사이의 순서에 기대지 않고 `&&`로 잇는다.
- `deno task`의 내장 shell은 OS와 관계없이 `&&`, `||`, `;`, pipe와 glob을 지원한다. `deno task "build:*"`처럼 이름 패턴으로 여러 task를 실행할 수도 있다.

Deno 2.5부터는 권한 조합에 이름을 붙여 `deno.json`의 `permissions`에 두고 `-P=<이름>`(`--permission-set=<이름>`)으로 고른다. 이름이 `default`인 set은 `-P`만으로 쓴다.

```json
{
  "permissions": {
    "process-data": {
      "read": { "allow": ["./data"], "deny": ["./data/secrets"] },
      "write": ["./data"]
    }
  },
  "tasks": {
    "dev": "deno run -P=process-data main.ts"
  }
}
```

- 객체 형식은 `allow`와 `deny`를 지원하고, `read`와 `env`는 `ignore`도 지원한다.
- `test`, `bench`, `compile` 설정에도 권한을 둘 수 있다. 두었다면 해당 명령을 `-P`나 권한 flag와 함께 실행해야 한다.
- task 문자열마다 flag를 반복하는 대신 이름 붙인 권한 조합이 검토 단위가 된다.

## 면접 체크포인트

- Node와 Deno의 기본 권한 차이, 컨테이너와 권한 flag가 서로 다른 방어층인 이유를 설명한다.
- 같은 thread의 코드가 같은 권한을 갖는다는 원칙이 flag의 방어 범위를 어떻게 제한하는지 말한다.
- `NotCapable`과 `PermissionDenied`를 구분해 고칠 위치를 정한다.
- `--allow-run`, `--allow-ffi`, `-A`가 sandbox를 벗어나게 하는 이유를 설명한다.

## 출처

- [Deno, Security and permissions](https://docs.deno.com/runtime/fundamentals/security/)
- [Deno, Permissions](https://docs.deno.com/runtime/reference/permissions/)
- [Deno, Configuration file (deno.json)](https://docs.deno.com/runtime/reference/deno_json/)
- [Deno, `deno task`](https://docs.deno.com/runtime/reference/cli/task/)
- [Deno, Deno.errors.NotCapable](https://docs.deno.com/api/deno/~/Deno.errors.NotCapable)
- [Deno 2.1 — Deno Blog](https://deno.com/blog/v2.1)
- [Deno 2.5 — Deno Blog](https://deno.com/blog/v2.5)
- [인프런, yongsoocho, flag의 등장](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227030)
- [인프런, yongsoocho, deno.json과 tasks](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227031)
- [인프런, yongsoocho, Docker와 함께...](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227033)

## 관련 문서

- [[Deno-Runtime|Deno Runtime]]
- [[Security|Node.js 보안 (권한 모델)]]
- [[Supply-Chain-Security|공급망 보안]]
- [[컨테이너(Container)|컨테이너]]

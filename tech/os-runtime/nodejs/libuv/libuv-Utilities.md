---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv 시스템 유틸리티", "libuv TTY", "libuv 동적 라이브러리"]
---

# libuv 시스템 유틸리티, TTY와 동적 라이브러리

libuv는 I/O loop 외에도 portable한 시각, 자원, 경로, 환경과 thread 지원 도구를 제공한다. 함수별 반환 규약, 결과 메모리의 소유권과 OS 차이를 확인해야 한다.

## 시간과 자원 정보

| API | 단위/의미 |
|---|---|
| `uv_now` | loop의 cached monotonic 밀리초, epoch 아님 |
| `uv_hrtime` | 임의 기준점의 나노초 단위 구간 측정, 실제 해상도는 플랫폼별 |
| `uv_clock_gettime` | REALTIME(epoch, 시각 조정 가능) 또는 MONOTONIC(역행하지 않음), 1.45.0+ |
| `uv_gettimeofday` | `uv_timeval64_t`의 wall clock, timezone 인자 없음 |
| `uv_uptime` | system uptime 초, 플랫폼별 소수 해상도 차이 |
| `uv_sleep` | 호출 thread를 지정 밀리초 동안 block |

`uv_sleep`을 loop callback에서 사용하면 전체 loop를 막는다. 시간을 기다리는 비동기 작업은 timer로 표현한다. `uv_timeval_t/uv_timespec_t`는 현재 Y2038 안전하지 않은 형이며 64비트 변형과 구분한다.

`uv_resident_set_memory()`의 RSS는 bytes, `uv_getrusage()`의 maxrss는 kilobytes다. resource usage의 user/system CPU time과 page fault/context switch를 전체 메모리 총량과 혼동하지 않는다. Windows 등에서 미지원 필드는 0으로 채워질 수 있다. thread별 rusage는 1.50.0+이며 일부 플랫폼에서는 `UV_ENOTSUP`이다.

`uv_cpu_info()`는 CPU 모델/속도와 millisecond 누적 사용시간 배열을 제공하며 `uv_free_cpu_info()`로 해제한다. thread/process 개수를 정할 때는 `uv_available_parallelism()`(1.44.0+)을 사용한다. Linux thread affinity를 반영하지만 다른 OS의 제한 반영 정도는 다르고 Windows 64개 초과 logical CPU에서 적게 보고될 수 있다.

`uv_loadavg()`는 Windows에서 미구현으로 [0,0,0]을 반환한다. 이 0을 실제 부하 없음으로 해석하지 않는다. `uv_os_uname()`은 OS name/release/version/machine, getpid/getppid는 프로세스 식별자다.

### 컨테이너 메모리

`uv_get_free_memory/total_memory()`는 kernel이 보고하는 system bytes이며 모르면 0이다. process limit과 사용 가능한 메모리를 따로 본다.

- `uv_get_constrained_memory()`: OS가 부과한 process 총 한도. 미확인/제약 메커니즘 없음은 0, 메커니즘은 있지만 한도 미설정이면 UINT64_MAX다. 현재 Linux cgroups와 z/OS 지원이다.
- `uv_get_available_memory()`: process 한도를 반영한 남은 bytes(1.45.0+). 미확인 시 system free memory와 같다. 현재 Linux에서 cgroups 차이를 반영한다.

두 값은 heap 크기나 안전한 단일 할당 크기를 보장하지 않는다. 실제 측정 구간의 다른 자원 사용과 한도 변화를 고려한다.

## 경로, 환경과 신원

`uv_setup_args(argc, argv)`는 시작 시 딱 한 번 호출하며 argv 메모리 소유권을 가져가거나 복사본을 반환할 수 있다. 반환 argv를 사용한다. process title과 executable path 조회에 필요한 초기화다.

`uv_exepath()`는 setuid 프로그램에서 사용자 제어 문자열/환경을 참조하는 플랫폼이 있으므로 권한 있는 코드의 신뢰 경로로 무조건 사용하지 않는다. `uv_get/set_process_title()`은 platform별 크기 제한 때문에 잘리거나 allocation 오류가 날 수 있고 Unix/AIX는 setup_args 선행이 필요하다.

cwd/chdir는 프로세스 작업 디렉토리를 조회/변경한다. home/tmp 경로는 환경을 먼저 참조할 수 있어 사용자 신뢰성과 실제 접근 권한을 별도로 확인한다. 홈 조회는 HOME/USERPROFILE과 사용자 정보를, Unix tmp 조회는 TMPDIR/TMP/TEMP/TEMPDIR 순서와 기본 /tmp를 사용한다(Android 기본 경로는 다름).

`uv_os_getenv()`의 UV_ENOENT는 변수 부재, UV_ENOBUFS는 buffer 부족이다. size를 입력 용량으로 설정하고 부족 시 필요한 NUL 포함 용량을 확인한다. 일반적인 문자열 getter도 함수별 성공 길이가 끝 NUL을 포함하는지 확인한다.

environ/getenv/setenv/unsetenv와 homedir/tmpdir는 스레드 안전하지 않다는 공식 경고가 있다. process 전역 환경을 동시에 변경하는 설계를 피한다. `uv_os_environ()` 배열은 `uv_os_free_environ()`으로 해제한다.

passwd/group 조회 결과는 username/groupname, ID와 shell/home/member 정보를 제공한다. 현재 effective uid 조회와 특정 uid 조회를 구분한다. Windows의 uid/gid -1과 NULL shell은 Unix 의미를 제공하지 않는다는 뜻이다. 결과는 `uv_os_free_passwd/free_group()`으로 정리한다.

process priority는 일반적으로 -20(높음)~19(낮음), Windows는 priority class로 매핑되고 권한에 따라 설정이 제한된다. IBM i는 값과 권한 계약이 별도다. priority 변경으로 I/O queue의 공정성을 보장할 수 없다.

## 주소와 문자열 변환

`uv_interface_addresses()`와 free 함수는 network interface 배열을 관리한다. IP 문자열/바이너리 변환은 `uv_ip4/6_addr/name`, `uv_inet_pton/ntop`을 사용하며 변환 실패 시 destination은 바뀌지 않는다.

`uv_if_indextoname()`의 Windows 결과는 scoped IPv6 식별자로 사용할 수 없다. platform 공통 식별자는 `uv_if_indextoiid()`이며 Windows에서 index의 숫자 문자열을 반환한다. buffer 부족 시 필요 용량은 NUL을 포함한다.

WTF-8/UTF-16 변환 API(1.47.0+)는 Windows의 표현을 보존하기 위한 저수준 도구다. length 함수의 bytes와 UTF-16 code unit을 구분한다. UTF-16 입력 길이 -1은 NUL 종료, 양수는 명시적 길이다.

`uv_utf16_to_wtf8()`는 출력 포인터가 NULL이면 새 buffer를 할당할 수 있고, 제공된 buffer에는 마지막 NUL 공간이 필요하다. truncation은 UV_ENOBUFS와 필요 길이로 보고된다. 반대 방향의 길이 계산은 NUL을 포함한다. 불완전 surrogate를 보존하는 WTF-8을 일반적인 strict UTF-8 validation과 같다고 판단하지 않는다.

## 난수와 allocator

`uv_random()`은 OS CSPRNG에서 정확히 buflen bytes를 채우며 flags는 현재 0이다. callback NULL이면 동기이며 loop/req는 NULL 가능하다. 짧은 읽기는 없고 실패 뒤 buf 내용은 정의되지 않는다.

entropy 부족에서는 동기 호출이 무기한 block하거나 비동기 작업도 끝나지 않을 수 있다는 계약이 있다. 반환/완료 오류를 처리하고 성공하지 않은 buffer를 보안 토큰으로 사용하지 않는다.

`uv_replace_allocator()`는 네 allocator 함수 포인터가 모두 필요하고 allocator는 스레드 안전해야 한다. 첫 libuv API 이전 또는 libuv의 모든 allocation이 해제된 상태에서 변경한다. 이전 allocator의 메모리와 다른 free를 혼용하지 않는다.

`uv_library_shutdown()`은 전역 상태를 정리한다. 한 번만 호출하고 active loop/I/O가 없어야 하며 이후 libuv API를 호출하지 않는다. `uv_loop_close()`와 별개이며 임의로 재초기화하는 reset API가 아니다.

`uv_buf_init()`은 platform별 layout을 숨기는 by-value constructor다. 큰 단일 write는 Windows 약 511MB, 일부 Unix 약 2GB 한도에서 실패할 수 있으므로 적절한 크기로 나눠 보내고 각 buffer의 완료까지 수명을 유지한다.

## 동적 라이브러리

`uv_dlopen(path, lib)`과 `uv_dlsym(lib, name, ptr)`는 성공 0, 실패 **-1**이다. 일반 `UV_E*` 계약과 다르며 오류는 `uv_dlerror()`로 읽는다. symbol 값이 NULL인 것은 허용되므로 값만으로 lookup 실패를 판정하지 않는다.

library와 symbol의 수명을 유지하고 사용이 끝나면 `uv_dlclose()`한다. callback/function pointer가 남은 동안 unload하면 안 된다. 이 API는 라이브러리 실행을 sandbox로 격리하지 않으므로 신뢰한 경로/ABI/entrypoint만 로드한다.

## TTY와 출력 redirect

`uv_guess_handle(fd)`로 TTY/PIPE/FILE 등을 판별한다. stdout이 pipe/file로 redirect됐으면 terminal escape sequence를 그대로 출력하지 않도록 한다. regular file을 TTY로 init하면 Unix에서 `UV_EINVAL`이다.

`uv_tty_init(loop, tty, fd, unused)`의 마지막 인자는 1.23.1부터 자동 감지되어 무시된다. Unix에서는 원래 terminal을 다시 열어 다른 process의 모드를 바꾸지 않도록 하지만 reopen 실패 시 blocking write로 fallback할 수 있다. 일부 OS에서 init은 스레드 안전하지 않다.

mode는 NORMAL, RAW, Unix binary-safe IO, RAW_VT를 구분한다. RAW는 Windows에서 window input, RAW_VT는 virtual terminal input을 켠다. `uv_tty_get_winsize()`로 열/행 크기를 조회한다.

종료 시 `uv_tty_reset_mode()`로 다음 process를 위해 terminal 설정을 복원한다. Unix에서 signal-safe이지만 set_mode 실행 중이면 `UV_EBUSY`가 가능하다. Windows의 `set/get_vterm_state`는 escape sequence를 libuv/console 중 어디서 처리할지 제어하며 Unix get은 `UV_ENOTSUP`이다.

## 진단 출력

`uv_print_all_handles/active_handles()`는 `[R A I]` 형식으로 referenced/active/internal 상태를 표시한다. ad hoc debugging API이며 ABI/API 안정성을 보장하지 않는다. 출력은 자원 진단의 단서이고 request 전체나 애플리케이션 작업 완료를 증명하는 목록은 아니다.

## 출처

- [Miscellaneous utilities](https://docs.libuv.org/en/v1.x/misc.html)
- [Shared library handling](https://docs.libuv.org/en/v1.x/dll.html), [TTY](https://docs.libuv.org/en/v1.x/tty.html)
- [Utilities guide](https://docs.libuv.org/en/v1.x/guide/utilities.html)

## 관련 문서

- [[libuv]], [[libuv-Architecture]], [[libuv-Handles]], [[libuv-Threading]], [[libuv-Processes]]

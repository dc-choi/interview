---
tags: [runtime, jvm, gc, troubleshooting, heap-dump, java]
status: done
verified_at: 2026-11-01
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM First Failure Diagnosis", "JVM 첫 장애 진단", "hs_err", "GC 로그 읽기"]
---

# JVM 첫 장애 진단 — 재현 없이 원인을 좁히는 준비와 첫 분석

처음 겪는 장애는 재현이 어렵고, 재시작하면 남은 파일이 옮겨지거나 지워질 수 있다. 장애 시점의 GC 로그, heap dump와 fatal error log(hs_err)가 저절로 남도록 미리 설정해 두면 재현 없이 분석을 시작할 수 있다. 이 문서는 Java heap 문제(OutOfMemoryError, 이하 OOM)를 중심으로 미리 켜 둘 진단과 장애 직후 자료를 읽는 순서를 다룬다. heap 구조와 수집기는 [[JVM-GC]], 누수의 정의와 두 시점 dump 비교는 [[JVM-GC-Memory-Leak]], 컨테이너 메모리 한도는 [[JVM-Container-Memory]]에 있다. 옵션과 동작은 2026-11-01에 대조한 JDK 25 문서, OpenJDK jdk25u 소스와 Eclipse MAT 최신 도움말 기준이다.

## 장애 전에 켜 둘 진단

Oracle Java SE 25 문제 해결 가이드(Prepare Java for Troubleshooting)는 미리 설정할 항목으로 core 파일, OOM heap dump, 상시 JFR 기록, GC 로그(`-Xlog:gc*`), Java 버전과 JVM flag 출력(`-showversion`, `-XX:+PrintFlagsFinal`)과 원격 모니터링용 JMX 포트(`com.sun.management.jmxremote.port`)를 든다. 원격 JMX는 인증과 접근 제한을 함께 정한다(운영 제안). 아래는 파일 위치를 정하는 옵션까지 함께 둔 예시이며, 경로와 보관량은 환경에 맞게 정한다.

```bash
java \
  '-Xlog:gc*:file=/var/log/app/gc-%t.log:time,uptime,level,tags:filecount=10,filesize=20M' \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/dumps/java_pid%p.hprof \
  -XX:ErrorFile=/var/log/app/hs_err_pid%p.log \
  -XX:StartFlightRecording:maxage=6h,maxsize=1g,filename=/var/log/app/app-%p.jfr,dumponexit=true \
  -jar app.jar
```

| 항목 | 남는 것 | 비용과 주의 (JDK 25 문서 기준) |
|---|---|---|
| GC 로그 | 수집 종류와 원인, 전후 사용량, 걸린 시간 | `filesize`, `filecount`를 생략하면 목표 크기 20MB 파일을 최대 5개 회전한다. `filecount=0`은 회전하지 않으며 기존 파일을 덮어쓸 수 있다 |
| OOM heap dump | OOM 시점의 HPROF 파일 | 기본은 꺼져 있다. java 명령 문서는 Java heap 고갈 OOM에만 적용된다고 적지만, jdk25u 구현은 JVM이 던지는 Metaspace, Compressed class space와 `Requested array size exceeds VM limit` OOM에서도 dump한다. Java 코드가 직접 던진 OOM과 native thread 생성 실패에는 동작하지 않는다. `CrashOnOutOfMemoryError`와 같은 함수가 처리해 JVM이 보고한 첫 OOM에서 한 번만 dump한다. 기본 위치는 작업 디렉터리의 `java_pid<pid>.hprof`다 |
| fatal error log | 회복할 수 없는 오류 때의 hs_err 파일 | 기본은 작업 디렉터리의 `hs_err_pid<pid>.log`이고, 만들 수 없으면 OS 임시 디렉터리(Linux는 `/tmp`)에 쓴다 |
| 상시 JFR | JVM 이벤트 기록 | 기본 설정(default.jfc)은 상시 기록에 쓰는 저부하 설정이고, profile.jfc는 데이터가 많은 대신 부하가 커 짧은 기간에 쓴다 |
| core 파일 | 프로세스 메모리 이미지 | OS에서 보통 꺼져 있고, Linux는 시작 전에 `ulimit -c unlimited`를 실행하면 대개 켜진다. 애플리케이션 메모리 사용량에 따라 디스크를 많이 쓴다 |

- `file=` 이름의 `%p`, `%t`, `%hn`은 pid, JVM 시작 시각, host 이름으로 바뀐다. decorator를 생략하면 `uptime`, `level`, `tags`만 붙는다. uptime은 JVM 시작 뒤 경과 시간이므로 다른 로그와 시각을 맞추려면 `time`을 더한다(운영 제안).
- `gc*`는 gc 태그를 포함하는 모든 tag set을 info 수준으로 남긴다. 원인을 분석할 때는 G1 튜닝 가이드가 `-Xlog:gc*=debug`에서 시작해 필요한 범위로 좁히라고 안내한다.
- 문제 해결 가이드는 JFR 부하가 1% 미만이고 운영에서 상시 켜 두어도 안전하도록 설계됐다고 적는다. `maxage`, `maxsize` 기본값을 java 명령과 jcmd 문서는 0(상한 없음)으로 적지만, jdk25u 소스(DCmdStart)는 디스크 기록에 duration, maxage, maxsize가 모두 없으면 maxsize 250MB를 적용한다. 보관량은 기본값에 맡기지 않고 명시한다. 프로세스가 살아 있으면 `jcmd <pid> JFR.dump filename=<파일>`로 꺼내며, 기록은 계속된다.
- jdk25u의 `CreateCoredumpOnCrash` 기본값은 true(fatal error 때 core나 mini dump 생성)라, OS가 core 생성을 막지 않으면 크래시 때 core가 남을 수 있다. Linux `core_pattern`이 파이프(`|`)면 처리 프로그램이 초기 namespace에서 실행되고 커널은 RLIMIT_CORE를 적용하지 않는다(core(5)). 컨테이너의 core가 컨테이너 볼륨이 아니라 host 쪽에 남을 수 있다(해석). hs_err 헤더의 core dump 줄을 먼저 보되, 파이프면 jdk25u는 이 줄에 처리 명령과 JVM이 추정한 대체 경로만 적으므로(os_linux.cpp) 저장 여부와 실제 위치는 host의 처리 프로그램 쪽에서 확인한다.
- heap dump와 core는 매우 클 수 있고 요청 데이터와 secret을 담는다. 보관과 접근 제한은 [[JVM-GC-Memory-Leak#증상과 진단|메모리 누수 문서]]를 따른다.
- 운영 제안: 컨테이너에서는 dump와 로그 경로를 재시작 뒤에도 남고 여유 공간이 최대 heap보다 큰 볼륨에 둔다. JVM이 pid 1로 뜨면 `%p`만으로는 재시작마다 파일 이름이 갈리지 않으므로 인스턴스별 경로를 쓴다. 이름이 겹치면 hs_err는 쓸 수 있는 기존 파일을 덮어쓰고(java 명령 문서), OOM heap dump는 기존 파일을 덮어쓰지 않아 새 dump를 만들지 못한다(jdk25u heapDumper.hpp의 overwrite 기본 false). `jcmd GC.heap_dump`도 `-overwrite`가 없으면 덮어쓰지 않는다.

## 장애 직후 먼저 모을 배경 정보

운영 제안으로, 확인에 시간이 걸리는 항목부터 요청하고 재시작 전에 파일을 확보한다. 마지막 항목만 Oracle 문제 해결 가이드의 수집 목록이다.

- 증상 시작 시각과 시간대, 영향 범위(일부 인스턴스인지 전체인지, 특정 기능인지)
- 직전 변경: 배포, 설정과 JVM 옵션, JDK 업데이트, 인프라 작업, 트래픽 변화. 변경 이력 수집 일반은 [[Root-Cause-Investigation-Loop|근본 원인 조사 루프]]를 따른다
- 계획한 JDK 버전과 옵션이 실제로 적용됐는지: hs_err의 헤더와 SUMMARY, GC 로그 첫머리의 설정 정보와 비교한다
- 크래시면 core, fatal error log, Java와 애플리케이션 로그, OOM heap dump, JFR 기록을 모은다. 응답이 없으면 재시작 전에 `jcmd <pid> Thread.print`를 여러 번 받고 JFR 기록과 강제 core를 남긴다

## G1 로그 읽기

- **Young-only 단계**(JDK 25 G1 문서): young 수집을 반복한다. old 점유율이 IHOP(Initiating Heap Occupancy) 임계에 이르면 일반 young 수집 대신 Concurrent Start young 수집으로 동시 마킹을 함께 시작한다. 마킹은 Remark와 Cleanup STW pause로 끝나고, 공간 회수 단계로 넘어갈 때는 Prepare Mixed young 수집이 한 번 온다.
- **Space-reclamation 단계**: young region과 함께 일부 old region의 살아 있는 객체를 옮기는 Mixed 수집을 반복한다.
- G1은 수집과 공간 회수를 STW pause에서 수행하므로 young-only와 mixed 수집 모두 애플리케이션을 멈춘다. 마킹 중 메모리가 바닥나거나 수집이 공간을 전혀 비우지 못하면 heap 전체를 제자리에서 압축하는 Full GC로 넘어가며, 문서는 이를 매우 느릴 수 있다고 적는다.
- **Humongous 객체**는 region 크기의 절반 이상인 객체다. old 영역의 연속 region에 바로 할당되고, 마지막 region의 남는 공간은 객체가 회수될 때까지 쓰지 못한다. G1은 humongous 할당마다 IHOP를 확인해, 임계를 넘었고 마킹 중이 아니면 Concurrent Start 수집을 바로 시작할 수 있다.
- **region 크기**: GC 튜닝 가이드와 jdk25u 소스 기준으로 자동 결정값은 최대 heap에서 약 2048개 region이 되도록 계산하며 최대 32MB다. `-XX:G1HeapRegionSize`로 직접 정하는 값은 2의 거듭제곱 1MB~512MB다. 같은 버전 java 명령 문서는 범위를 1MB~32MB로 적어 문서끼리 다르다. 선택된 region 크기는 로그 첫머리에 찍힌다.

JDK 25 G1 문서의 로그 예시는 `[9,740s][info ][gc] GC(26) Pause Young (Normal) (G1 Evacuation Pause) (Evacuation Failure: Allocation/Pinned) 2159M->402M(3000M) 6,108ms`다. `Evacuation Failure:` 뒤의 사유는 옮길 공간을 찾지 못한 Allocation, `GetPrimitiveArrayCritical()` 같은 JNI 호출로 고정(pinned)된 객체를 옮기지 못한 Pinned 중 하나 또는 둘이다.

- 앞의 대괄호 세 개는 decorator(uptime, level, tags)이고 `GC(26)`은 수집 번호다.
- `Pause Young (<종류>) (<원인>)`에서 종류는 Normal, Concurrent Start, Prepare Mixed, Mixed가 있고, 원인에는 G1 Evacuation Pause, G1 Humongous Allocation, Metadata GC Threshold 등이 있다(jdk25u 소스). `System.gc()`는 기본 설정에서 Full GC를 일으키고, `-XX:+ExplicitGCInvokesConcurrent`를 켜면 동시 GC를 시작한다(G1 튜닝 가이드, java 명령 문서). `Pause Young (Concurrent Start) (G1 Humongous Allocation)`은 humongous 할당이 수집과 동시 마킹 시작을 앞당겼다는 뜻이고, 이런 줄이 잦으면 아래 `Humongous regions`를 함께 본다.
- `2159M->402M(3000M)`은 GC 전 사용량, GC 뒤 사용량, 그 시점의 heap capacity이고 마지막 값은 걸린 시간이다(jdk25u gcTraceTime).
- `gc+cpu=info`의 `User=0.19s Sys=0.00s Real=0.01s`에서 Real은 pause 동안 실제로 흐른 시간이다. Sys가 상대적으로 크면 환경이 원인인 경우가 많고, Real이 User와 Sys의 합보다 훨씬 크면 과부하 장비에서 VM이 CPU를 충분히 받지 못했을 수 있다(G1 튜닝 가이드).
- `gc+heap=info`의 `Humongous regions: X->Y`에서 Y가 old region 수에 비해 크면 humongous 객체 수를 줄이거나 `-XX:G1HeapRegionSize`를 키워 humongous로 분류되는 객체를 줄이는 방안을 검토한다(G1 튜닝 가이드).

### GC 뒤 사용량으로 문제 모양 구분하기

GC 로그 시각화 도구로 GC 전후 사용량을 시간축에 그리면 모양부터 볼 수 있다. 아래 구분은 이 문서의 해석 기준이다.

| 모양 | GC 뒤 사용량 | 먼저 할 질문 | 다음 자료 |
|---|---|---|---|
| 할당 급증 | 낮게 유지되다 짧은 시간에 최대 heap에 닿는다 | 무엇이 메모리를 쓰는가 | OOM 시점 dump의 dominator tree |
| live set 증가 | mixed나 Full GC 뒤에도 바닥이 계속 오른다 | 무엇이 객체를 살려 두는가 | 히스토그램 추세와 dump의 GC root 경로 |
| humongous 과다 | humongous region이 old region에 비해 많다 | 누가 큰 배열과 buffer를 만드는가 | `gc+heap=info`와 region 크기 검토 |

- old 점유율이 너무 높아 생긴 Full GC는 `Pause Full (G1 Compaction Pause)`로 찍히고, 보통 Allocation 사유의 evacuation failure가 앞선다(G1 튜닝 가이드). 최대 heap 근처에서 Full GC가 이어지면 Full GC 자체 시간과 그 사이 실행 시간의 비율을 보고, GC 쪽이 대부분이면 애플리케이션이 거의 진행하지 못한다고 본다. 시각화 도구에서 점 사이의 빈 구간은 실행 시간이 아니라 긴 Full GC일 수 있으므로 GC 로그의 pause 시간으로 확인한다(해석).
- 가이드가 드는 대응 중 heap 확대는 마킹이 끝날 시간을 늘려 주는 조치다. live set이 계속 늘면 실패 시점만 늦추므로 무엇이 객체를 붙잡는지 찾는다(해석). 누수 판단은 [[JVM-GC-Memory-Leak#증상과 진단|메모리 누수 문서]]를 따른다.

## heap dump와 히스토그램

- heap dump는 한 시점의 snapshot이다(MAT 도움말). 할당 급증은 그 순간의 dump 하나로 볼 수 있지만 live set 증가는 시간에 따른 변화를 봐야 한다(해석).
- jcmd 문서는 `GC.heap_dump`와 `GC.class_histogram`의 영향도를 모두 High(heap 크기와 내용에 따름)로 적는다. jdk25u 소스(diagnosticCommand.cpp)에서 두 명령은 `-all`이 없으면 먼저 full GC를 요청하고, `-all`이면 GC 없이 unreachable 객체까지 포함한다. G1의 Full GC는 STW다.
- 히스토그램은 heap 내용을 파일로 쓰지 않으므로 dump보다 시간, 디스크와 민감정보 부담이 작다(해석). Oracle 문제 해결 가이드는 히스토그램을 일정 간격(예: 2분)으로 여러 번 받으면 클래스별 인스턴스 수와 총 크기의 추세를 볼 수 있다고 한다. 가이드 예시의 `filename=` 인자는 JDK 25 jcmd의 `GC.class_histogram` 옵션(`-all`, `-parallel`)에 없으므로 출력은 redirect로 저장한다(`jcmd <pid> GC.class_histogram > histo-1.txt`). 히스토그램은 무엇이 늘었는지는 보여 주지만 누가 붙잡는지는 보여 주지 않으므로, 끝에 dump 하나를 떠 GC root 경로를 확인한다. `-all` 없는 히스토그램도 매번 full GC를 요청하므로 간격과 횟수를 조절한다.
- 같은 가이드는 jmap보다 jcmd를 권한다. dump 획득 명령은 [[JVM-GC-Memory-Leak#증상과 진단|메모리 누수 문서]]에 있고, 결과는 HPROF 형식이라 이 형식을 읽는 분석 도구로 연다.
- 운영 제안: dump를 얻지 못하는 흔한 경우는 적용 범위 밖의 OOM, 디스크 부족, 재시작으로 지워진 파일, 민감정보 때문에 수집을 막는 조직 정책이다. 이때는 히스토그램, GC 로그, JFR과 core 파일로 범위를 좁힌다.
- core 파일이 있으면 jhsdb로 heap을 HPROF로 꺼내거나(`jhsdb jmap --binaryheap --dumpfile heap.hprof --exe <java 실행 파일> --core <core 파일>`) `--histo`로 히스토그램을 본다. `--exe`에는 core를 만든 java 실행 파일을 준다. jhsdb는 문서상 실험적이고 지원되지 않는 명령이다.

## Eclipse MAT로 첫 분석

- **shallow heap**은 객체 하나가 쓰는 메모리다. X의 **retained set**은 X가 회수될 때 함께 회수될 객체 집합이고, **retained heap**은 그 집합의 shallow heap 합, 즉 X가 살려 두는 메모리다(MAT 도움말).
- root에서 y로 가는 모든 경로가 x를 지나면 x가 y를 **dominate**한다. dominator tree에서 x 아래 subtree가 x의 retained set이라 큰 메모리 덩어리를 찾기 쉽다.
- **Leak Suspects 보고서**(툴바 Run Expert System Test > Leak Suspects)는 dominator tree의 큰 최상위 항목을 보고, 기본 10% 이상을 유지하는 항목을 원인 후보로 든다. 단일 객체는 작아도 한 클래스의 객체가 많으면 클래스별로 묶어 accumulation point(작은 객체 다수의 메모리가 한 객체 아래 모이는 곳)를 찾는다. 세부 내용에는 GC root에서 accumulation point까지의 경로(Shortest Paths To the Accumulation Point)와 suspect에서 accumulation point까지의 dominator tree(Accumulated Objects in Dominator Tree)가 있다. 보고서는 한 시점의 dump만 보고 원인일 수 있는 후보를 낸다.

첫 분석 순서는 이 문서의 해석 기준이다.

1. Leak Suspects에서 큰 덩어리와 accumulation point를 확인한다
2. GC root 경로로 무엇이 그 덩어리를 붙잡는지 본다
3. dominator tree에서 retained heap이 큰 객체를 펼쳐, shallow heap과 retained heap이 같아지는 말단까지 내려가 쌓인 데이터의 종류와 값을 본다. 두 값이 같다는 것은 그 객체만 살려 두는 다른 객체가 없다는 뜻이지 참조하는 객체가 없다는 뜻이 아니므로, 다른 객체와 공유해 subtree에 나오지 않는 값은 List Objects > with outgoing references로 본다
4. 찾은 클래스와 경로를 코드의 컬렉션, cache, thread 수명과 대조한다

MAT를 돌릴 장비와 설정도 미리 정한다(MAT 도움말 기준).

- MAT도 Java로 돌아가므로 큰 dump는 MAT heap을 키운다. `MemoryAnalyzer.ini`의 `-vmargs` 아래 `-Xmx`를 바꾸며 문서 예시는 `-Xmx4g`다. Eclipse SDK 안에서 쓰면 `eclipse.ini`를 고친다.
- 메모리를 많이 쓰는 단계는 dump 파싱과 dominator tree 생성이다. 큰 장비에서 명령행으로 파싱(`./mat/ParseHeapDump.sh heap.hprof org.eclipse.mat.api:suspects`)하면 dump 옆에 index 파일이 생기고 결과는 `heap_Leak_Suspects.zip`의 HTML 보고서로 나온다. 파싱 뒤에는 GUI에서 더 적은 메모리로 여는 경우가 많고, dump와 index 파일은 다른 장비로 복사해 쓸 수 있다.
- 객체 수의 현재 한계는 2^31 - 9(2,147,483,639)개다. 넘으면 배열 길이 OOM이 나며 문서는 discard 옵션을 우회책으로 안내한다.

## hs_err 첫 검토

- fatal error log는 fatal error가 났을 때 그 시점의 정보와 상태를 담아 만든다(JDK 25 가이드). 문서에 나온 예는 JVM 크래시와 JVM의 native heap 할당 실패(`Out of swap space?` 메시지)다. jdk25u `vmError.cpp`에는 이 메시지가 없다. native 메모리 할당 실패면 `There is insufficient memory for the Java Runtime Environment to continue.`와 `Native memory allocation (malloc) failed to allocate`(mmap이면 `(mmap) failed to map`)를 쓰므로 JDK 25 hs_err에서는 이 두 문구로 찾는다.
- `Java heap space` OOM은 할당을 요청한 Java 코드에 예외로 던져지므로 그것만으로는 보통 hs_err가 남지 않는다. heap OOM에도 남기려면 `-XX:+CrashOnOutOfMemoryError`를 쓴다. jdk25u 플래그 정의는 JVM이 던지는 첫 OOM에서 error log와 core나 mini dump를 남기고 abort한다고 적는다. 프로세스가 끝나므로 재시작 정책과 함께 정한다(운영 제안).
- jdk25u `vmError.cpp`는 헤더, SUMMARY, THREAD, PROCESS, SYSTEM 순으로 쓴다. JDK 25 가이드의 형식 설명은 Java SE 6 기준이고 다른 릴리스에서는 다를 수 있다고 적으므로, 줄 위치보다 절 이름으로 찾는다. 아래 표의 검토 순서는 운영 제안이고, SUMMARY 항목은 JDK 25 VM 가이드의 예시 기준이다.

| 순서 | 볼 곳 | 확인할 것 |
|---|---|---|
| 1 | 헤더 | 오류 종류(signal, Internal Error 등), pid와 tid, JRE와 VM 버전, problematic frame, core dump 기록 여부와 위치 |
| 2 | SUMMARY | `Command Line`, `Host`, `Time`과 `elapsed time`. 신고된 시각과 맞는지, 기동 뒤 얼마 만에 났는지 |
| 3 | THREAD | Current thread와 상태, stack 범위와 free space, Native frames와 Java frames |
| 4 | PROCESS | thread 목록, VM state, heap 요약, 최근 이벤트 기록, VM 옵션과 flags, 환경 변수 |
| 5 | SYSTEM | OS, CPU, 메모리 요약. heap을 늘리기 전에 물리 메모리 여유를 본다 |

- 운영 제안: 먼저 같은 사건인지 맞춘다. hs_err의 pid와 시각을 GC 로그, `java_pid<pid>.hprof`, 애플리케이션 로그와 대조해 다른 날의 파일을 섞지 않는다. 버전이나 옵션이 의도와 다르면 그 자체가 원인 후보다.
- frame 표기는 `C` native C frame, `j` 해석 실행 Java frame, `J` compiled Java frame을 포함한 그 밖의 frame, `V` VM frame, `v` VM이 생성한 stub frame이다(JDK 25 가이드). Java frames에 보이는 애플리케이션 메서드가 코드 확인의 출발점이다(해석).
- heap OOM이면 PROCESS에서 heap 사용량이 capacity에 붙었는지, region이 old에 몰렸는지, 최근 GC 이벤트에서 GC 뒤 사용량이 줄지 않는지 본다(해석). jdk25u 소스에서 GC 전후 heap 사용 기록의 이벤트 이름은 `GC Heap Usage History`이고 jdk17u에서는 `GC Heap History`다. 절의 내용과 이름은 JDK 버전과 수집기에 따라 다르다.

## 면접과 운영 체크포인트

- 재현 없이 진단하려고 미리 켜 둘 진단과 각각의 디스크, 성능, 민감정보 비용
- `HeapDumpOnOutOfMemoryError`가 dump를 남기는 OOM과 남기지 않는 OOM, java 명령 문서와 jdk25u 구현의 차이
- G1 로그의 Normal, Concurrent Start, Mixed와 Full GC가 뜻하는 것, humongous 기준
- 히스토그램과 heap dump가 모두 `-all` 없이는 full GC를 요청하는데도 히스토그램 여러 개와 dump 하나로 나누는 이유
- shallow heap, retained heap과 dominator tree의 관계
- `Java heap space` OOM에 hs_err가 보통 없는 이유와 `CrashOnOutOfMemoryError`, 여러 자료가 같은 사건인지 맞추는 방법

## 출처

- [What's Going Wrong with My JVM?! A Guide to First-Time Failure Diagnosis — JavaOne 2026, Sandra Payne](https://www.youtube.com/watch?v=tx4K7RjBvmU)
- [Oracle Java SE 25 Docs, The java Command](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html)
- [Oracle Java SE 25 Docs, The jcmd Command](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jcmd.html)
- [Oracle Java SE 25 Docs, The jhsdb Command](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jhsdb.html)
- [Oracle Java SE 25, Troubleshooting Guide, Prepare Java for Troubleshooting](https://docs.oracle.com/en/java/javase/25/troubleshoot/prepare-java-troubleshooting.html)
- [Oracle Java SE 25, Troubleshooting Guide, Troubleshoot Memory Leaks](https://docs.oracle.com/en/java/javase/25/troubleshoot/troubleshooting-memory-leaks.html)
- [Oracle Java SE 25, Troubleshooting Guide, Fatal Error Log](https://docs.oracle.com/en/java/javase/25/troubleshoot/location-fatal-error-log.html)
- [Oracle Java SE 25, Java Virtual Machine Guide, Fatal Error Reporting](https://docs.oracle.com/en/java/javase/25/vm/error-reporting.html)
- [Oracle Java SE 25, HotSpot GC Tuning Guide, Garbage-First (G1) Garbage Collector](https://docs.oracle.com/en/java/javase/25/gctuning/garbage-first-g1-garbage-collector1.html)
- [Oracle Java SE 25, HotSpot GC Tuning Guide, Garbage-First Garbage Collector Tuning](https://docs.oracle.com/en/java/javase/25/gctuning/garbage-first-garbage-collector-tuning.html)
- [globals.hpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/runtime/globals.hpp) (`CrashOnOutOfMemoryError`, `CreateCoredumpOnCrash` 정의)
- [vmError.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/utilities/vmError.cpp) (hs_err 절 순서, native 메모리 부족 문구, core dump 줄)
- [collectedHeap.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/gc/shared/collectedHeap.cpp) (`GC Heap Usage History` 이벤트)
- [g1HeapRegionBounds.hpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/gc/g1/g1HeapRegionBounds.hpp) (region 크기 범위)
- [g1GCPauseType.hpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/gc/g1/g1GCPauseType.hpp) (pause 종류 문자열)
- [gcCause.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/gc/shared/gcCause.cpp) (GC 원인 문자열)
- [gcTraceTime.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/gc/shared/gcTraceTime.cpp) (전후 사용량과 capacity 표기)
- [DCmdStart.java — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/jdk.jfr/share/classes/jdk/jfr/internal/dcmd/DCmdStart.java) (JFR 기본 maxsize 250MB)
- [debug.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/utilities/debug.cpp) (`report_java_out_of_memory`의 heap dump와 `CrashOnOutOfMemoryError` 처리)
- [metaspace.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/memory/metaspace.cpp) (Metaspace OOM 보고)
- [klass.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/oops/klass.cpp) (배열 크기 한도 OOM 보고)
- [diagnosticCommand.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/services/diagnosticCommand.cpp) (히스토그램과 heap dump의 full GC 요청)
- [heapDumper.hpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/share/services/heapDumper.hpp) (dump의 overwrite 기본 false)
- [os_linux.cpp — OpenJDK jdk25u GitHub](https://github.com/openjdk/jdk25u/blob/master/src/hotspot/os/linux/os_linux.cpp) (파이프 core_pattern의 hs_err 표기)
- [collectedHeap.cpp — OpenJDK jdk17u GitHub](https://github.com/openjdk/jdk17u/blob/master/src/hotspot/share/gc/shared/collectedHeap.cpp) (`GC Heap History` 이벤트)
- [Linux man-pages, core(5)](https://man7.org/linux/man-pages/man5/core.5.html)
- [Eclipse Memory Analyzer Help, Shallow vs. Retained Heap](https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/concepts/shallowretainedheap.html)
- [Eclipse Memory Analyzer Help, Dominator Tree](https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/concepts/dominatortree.html)
- [Eclipse Memory Analyzer Help, Running Leak Suspect Report](https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/tasks/runningleaksuspectreport.html)
- [Eclipse Memory Analyzer Help, Memory Analyzer Configuration](https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/tasks/configure_mat.html)
- [Eclipse Memory Analyzer Help, Batch mode](https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/tasks/batch.html)
- [Eclipse Memory Analyzer Help, Query Matrix](https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/reference/querymatrix.html)

## 관련 문서

- [[JVM-GC|JVM GC (heap 구조, G1 개요, OOM 패턴)]]
- [[JVM-GC-Memory-Leak|JVM 메모리 누수 (GC root, dump 획득과 두 시점 비교)]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리 (used, committed, OOMKilled)]]
- [[Root-Cause-Investigation-Loop|근본 원인 조사 루프 (변경 이력과 자료 수집)]]
- [[OOM-Troubleshooting|Node.js OOM 트러블슈팅]]

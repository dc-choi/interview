---
tags: [os, runtime, audio, latency, realtime, android, web-audio, kotlin]
status: done
verified_at: 2026-11-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Low-Latency Audio", "저지연 오디오", "오디오 출력 지연", "Audio Output Latency", "AAudio", "AudioWorklet 링 버퍼"]
---

# 저지연 오디오 출력: 지연 예산, 버퍼와 오디오 스레드

오디오 출력 지연은 앱이 샘플을 만든 시점부터 그 소리가 스피커나 헤드폰 단자로 나오기까지의 시간이다. 왕복 지연(round-trip latency)은 입력 지연, 앱 처리 시간과 출력 지연의 합이다. 출력 경로에서는 앱 버퍼, 시스템 믹서와 HAL 버퍼, 기기의 신호 처리가 지연을 더하고, 앱이 지연을 조절하는 수단은 버퍼 크기와 출력 경로 선택이다. 버퍼를 줄이면 지연이 줄지만 오디오 스레드가 다음 버퍼를 제때 채우지 못하면 언더런이 생겨 클릭이나 끊김으로 들린다. 그래서 **저지연은 빠른 계산보다 작은 버퍼를 막힘 없이 제때 채우는 스레드 구조에서 나온다.**

## 지연 예산: 버퍼를 시간으로 바꾼다

버퍼 하나가 더하는 지연은 `프레임 수 / 샘플레이트`다. 프레임은 채널마다 샘플을 하나씩 묶은 단위다.

| 버퍼 | 44.1 kHz | 48 kHz |
|---|---|---|
| 128 프레임 | 약 2.9 ms | 약 2.7 ms |
| 256 프레임 | 약 5.8 ms | 약 5.3 ms |
| 1,024 프레임 | 약 23.2 ms | 약 21.3 ms |

- Android 문서는 작은 스피커와 마이크의 음향을 보정하는 신호 처리도 지연을 더한다고 설명한다. 앱 버퍼만 줄여서는 기기 경로의 지연이 사라지지 않는다.
- Android의 HAL 버퍼 크기는 `AudioManager.PROPERTY_OUTPUT_FRAMES_PER_BUFFER`로 읽는다. 문서가 드는 흔한 값은 96, 128, 160, 192, 240, 256, 512 프레임이고 기기와 빌드마다 다르다. 버퍼를 이 값의 정수배로 잡으면 콜백 간격이 일정해져 지터가 준다.
- 공기 중 전파도 지연이다. 해수면 표준 대기의 음속은 약 761 mph(약 340 m/s)이고 온도에 따라 달라진다. 소리는 1 m에 약 2.9 ms, 3 m(약 10 ft)에 약 9 ms가 걸리므로, 무대에서 드럼과 3 m 떨어진 사람은 공기 전파만으로 약 9 ms 늦게 듣는다. 출력 지연 몇 ms를 이런 거리로 바꿔 보면 체감 수준을 가늠할 수 있다(설계 판단).

## 앱 유형별 허용치

| 유형 | 우선하는 것 | AAudio 성능 모드 | Web Audio `latencyHint` |
|---|---|---|---|
| 재생, 스트리밍, MIDI 파일 재생 | 끊김 없는 재생과 전력 | `POWER_SAVING` | `playback` |
| 대화형(버튼, 페이더, 게임 효과음) | 조작에 대한 즉각 반응 | `LOW_LATENCY` | `interactive` |
| 연주와 모니터링(드럼 패드, 키보드 신시사이저) | 가능한 최저 지연 | `LOW_LATENCY`와 고우선순위 콜백, `EXCLUSIVE` 검토 | `interactive` |

AAudio 기본값 `NONE`과 Web Audio `balanced`는 지연과 전력을 절충한다. 기본값이 플랫폼마다 다르므로(AAudio는 `NONE`, Web Audio는 `interactive`) 용도에 맞게 명시한다.

- 공개 기준치(2026-11-04 확인): Android 17 CDD 5.6은 핸드헬드 기기의 왕복 지연(RTL) 요구값을 표로 둔다. RTL은 AAudio로 루프백 경로에서 잰 연속 입력 지연, 연속 출력 지연과 버퍼 주기 하나의 합(5회 평균)이다. `android.hardware.audio.low_latency`를 선언한 기기는 적어도 한 경로에서 50 ms 이하(평균 절대 편차 10 ms), `android.hardware.audio.pro`는 적어도 한 경로에서 25 ms 이하이고 아날로그 경로를 지원하면 그 경로에서 20 ms 이하다. 일반 휴대기기 기준은 200 ms다.
- 같은 CDD의 탭투톤 지연(화면을 눌러 소리를 듣기까지)은 `pro` 80 ms, 일반 휴대기기 250 ms다. 터치 입력 지연까지 포함한 값이다.
- Android 개발자 문서는 연주자에게는 대개 왕복 10 ms가 필요하다고 적는다. 같은 문서의 기능 플래그 설명(연속 출력 45 ms, 왕복 20 ms)은 현재 CDD 표와 다르므로 대상 Android 버전의 CDD를 기준으로 삼는다.
- 기능 플래그는 `PackageManager.hasSystemFeature`로 `FEATURE_AUDIO_LOW_LATENCY`와 `FEATURE_AUDIO_PRO`를 확인한다. `pro`는 `low_latency`를 전제로 한다.

경험치(발표 기준, 측정 연구 아님): 스트리밍 재생은 100 ms 늦어도 문제가 적고, 버튼과 페이더 중심 앱은 30~50 ms에서도 상호작용으로 느껴진다. Android 드럼 앱의 지연을 약 25 ms까지 줄였을 때도 드럼 연주자는 지연을 알아챘다.

## push와 pull: 누가 채우는 시점을 정하는가

- **push(쓰기 차단)**: 앱 스레드가 `write`로 샘플을 밀어 넣고, 버퍼가 차 있으면 자리가 날 때까지 막힌다. 이 막힘이 생산 속도를 소비 속도에 맞추는 배압이다. Android `AudioTrack`의 streaming 모드, Java Sound `SourceDataLine.write`, timeout을 준 `AAudioStream_write`, PortAudio blocking I/O가 이 모델이다.
- **pull(콜백)**: 오디오 시스템이 다음 burst가 필요할 때 콜백을 불러 데이터를 받아 간다. AAudio data callback, Oboe `onAudioReady`, Web Audio `AudioWorkletProcessor.process()`가 이 모델이다.
- 일반 스레드에서 읽고 쓰면 선점과 타이밍 지터로 글리치가 생길 수 있고, 큰 버퍼로 막으면 지연이 늘어난다. AAudio는 콜백을 더 높은 우선순위 스레드에서 실행하며, 가장 낮은 지연은 `AAUDIO_PERFORMANCE_MODE_LOW_LATENCY`와 콜백을 함께 쓸 때 얻는다고 안내한다. PortAudio 문서도 blocking I/O는 대개 추가 버퍼가 필요하고 콜백보다 성능이 낮을 수 있지만 이해하기 쉽고 경우에 따라 다른 시스템과 더 잘 맞는다고 설명한다.
- pull API 위에 push 계약을 제공하려면 둘 사이에 FIFO가 필요하다. 웹의 AudioWorklet 위에 `write` 계약을 얹는 경우가 이렇다(설계 적용).

## 플랫폼별 출력 경로

| 플랫폼 | 경로 | 모델 | 확인할 점 |
|---|---|---|---|
| Android NDK | AAudio(Android 8.0의 C API), Oboe(C++ 래퍼) | 콜백 또는 read/write | Android 8.1부터 기기 구현이 MMAP을 지원하면 `EXCLUSIVE` 스트림은 ALSA 드라이버와 공유하는 메모리 버퍼에 직접 써서 믹서를 건너뛰고 지연이 크게 준다. `SHARED`에서는 AudioServer의 믹서가 이 버퍼를 쓴다. 독점 스트림은 지연이 가장 낮지만 연결이 끊길(disconnected) 가능성이 더 크고, 쓰는 동안 다른 스트림이 장치를 쓸 수 없으므로 다 쓰면 바로 닫는다 |
| Android Java, Kotlin | `AudioTrack` | push `write` | `PERFORMANCE_MODE_LOW_LATENCY`(API 26)는 기기가 지원할 때만 저지연 경로를 쓰고, 효과가 동작하지 않을 수 있으며 샘플레이트가 출력 장치와 맞아야 한다 |
| 데스크톱 JVM | Java Sound `SourceDataLine` | push `write` | `open(format, bufferSize)`의 실제 버퍼는 요청과 다를 수 있어 `getBufferSize()`로 확인한다. `available()`만큼은 막힘 없이 쓸 수 있고 버퍼가 비면 클릭으로 들릴 수 있다 |
| 웹 | Web Audio `AudioWorkletProcessor` | pull `process()` | 오디오 렌더링 스레드에서 render quantum마다 동기 호출된다. 별도 전역 스코프라 메인 스레드 코드를 직접 부를 수 없고 `MessagePort`나 `SharedArrayBuffer`로 주고받는다 |

- AAudio 문서는 Oboe 사용을 권한다. Oboe는 API 16 이상에서 동작하며 API 27 이상이면 AAudio, 그보다 낮으면 OpenSL ES를 고른다. 둘 다 C/C++ API라 Java나 Kotlin 코드만으로 PCM 스트림을 내보내는 Android 앱은 `AudioTrack`의 push 경로를 쓴다. 이때 지연 하한은 언어의 연산 속도보다 어떤 출력 경로와 버퍼에 닿을 수 있는지가 정한다(설계 판단).
- render quantum 기본값은 128 프레임이다. Web Audio API 1.1 작업 초안(2026-09-22)은 `renderSizeHint`로 다른 크기를 요청하는 옵션을 정의하므로, `process()`는 128을 가정하지 않고 배열 길이를 읽는다.

## 오디오 스레드에서 하지 않는 일

콜백은 다음 burst나 render quantum이 필요해지기 전에 끝나야 한다. 128 프레임은 48 kHz에서 약 2.7 ms이고, Chrome의 AudioWorklet 설계 안내는 44.1 kHz에서 이 예산을 3 ms로 든다.

- Oboe 가이드가 `onAudioReady`에서 금지하는 작업은 메모리 할당(`malloc`, `new`), 파일과 네트워크 작업, mutex 같은 동기화 도구, sleep, 스트림 정지와 닫기, 콜백을 부른 스트림의 `read`와 `write`다.
- AAudio는 스레드 선점과 글리치를 부를 수 있는 mutex를 피하도록 만들어져 일부 함수가 스레드 안전하지 않다. 같은 스트림을 두 스레드에서 읽고 쓰거나, 사용 중인 스트림을 다른 스레드에서 닫지 않는다.
- 우선순위 역전은 높은 우선순위 작업이 낮은 우선순위 작업이 쥔 자원을 기다리며 무한정 막히는 현상이고, 오디오에서는 클릭, 팝, 끊김으로 나타난다. AOSP는 데이터에 non-blocking 단일 reader, 단일 writer FIFO를 쓰고, 상태는 공유보다 복사하며, 꼭 공유할 상태는 원자적으로 접근할 수 있는 워드 크기로 제한하라고 권한다.
- HTML 표준에서 worklet agent와 window agent는 막힐 수 없고(`canBlock` false) dedicated worker와 shared worker는 막힐 수 있다. AudioWorklet 안에서는 `Atomics.wait`로 데이터를 기다릴 수 없으므로 모자란 구간은 무음으로 채운다.
- 관리형 런타임은 할당과 GC 정지도 예산에 넣는다. Chrome 안내는 AudioWorklet에서 WebAssembly를 쓰면 JS JIT 컴파일과 GC 오버헤드를 피할 수 있다고 설명한다. JVM 계열도 콜백 경로의 할당을 줄이고 언더런 카운터로 실제 여유를 잰다(설계 적용).

## 단일 생산자, 단일 소비자 링 버퍼

push 생산자와 pull 소비자를 잇는 기본 구조다. 웹에서는 메인 스레드나 worker의 코드가 생산자, AudioWorklet이 소비자다.

1. 샘플 배열과 제어 배열을 `SharedArrayBuffer` 위에 만든다. 제어 배열에는 누적 쓰기 프레임 수와 누적 읽기 프레임 수를 둔다.
2. 생산자는 빈자리(용량에서 쓰기와 읽기의 차를 뺀 값)만큼 샘플을 쓰고 쓰기 위치를 `Atomics.store`로 공개한다. 빈자리가 없을 때 메인 스레드는 다음 타이머나 프레임에서 다시 시도하고, dedicated worker는 `Atomics.wait`로 기다릴 수 있다. 이때 소비자가 읽기 위치를 공개한 뒤 `Atomics.notify`로 깨우거나, 생산자가 timeout을 주고 기다려야 영원히 잠들지 않는다.
3. 소비자는 쓰기 위치를 `Atomics.load`로 읽어 있는 만큼만 복사하고 읽기 위치를 공개한다. 모자라면 기다리지 않고 무음으로 채운 뒤 언더런을 센다.
4. 위치를 일반 읽기와 쓰기로 주고받으면 data race가 되어 샘플과 위치가 보이는 순서를 보장할 수 없다. 누적값이 감겨도 위치가 이어지도록 용량은 2의 거듭제곱으로 잡고 비트 마스크로 감싼다. `Int32Array`의 누적값은 48 kHz에서 약 12시간 뒤 음수로 넘어가므로 차이는 `(written - read) | 0`으로 계산한다.

```js
// 소비자 예시: 노드 생성 시 outputChannelCount: [2], 샘플은 L과 R 교대 배치, capacityFrames는 2의 거듭제곱
const WRITTEN = 0, READ = 1, UNDERRUN = 2;

class RingOutput extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { samples, control, capacityFrames } = options.processorOptions;
    this.samples = new Float32Array(samples); // SharedArrayBuffer
    this.control = new Int32Array(control); // SharedArrayBuffer
    this.mask = capacityFrames - 1;
  }

  process(inputs, outputs) {
    const [left, right] = outputs[0];
    const frames = left.length; // 128을 가정하지 않는다
    const read = Atomics.load(this.control, READ);
    const written = Atomics.load(this.control, WRITTEN);
    const count = Math.min(frames, Math.max(0, (written - read) | 0));
    for (let i = 0; i < count; i++) {
      const at = ((read + i) & this.mask) * 2;
      left[i] = this.samples[at];
      right[i] = this.samples[at + 1];
    }
    left.fill(0, count);
    right.fill(0, count);
    if (count < frames) Atomics.add(this.control, UNDERRUN, frames - count);
    Atomics.store(this.control, READ, (read + count) | 0);
    Atomics.notify(this.control, READ); // 빈자리를 기다리는 worker 생산자를 깨운다
    return true;
  }
}

registerProcessor('ring-output', RingOutput);
```

## 웹에서 공유 메모리를 쓰기 위한 격리 조건

`SharedArrayBuffer`는 secure context이면서 교차 출처 격리(cross-origin isolated)된 문서에서만 스레드 사이에 공유할 수 있다. 2018년 초 Spectre 대응으로 공유 메모리와 고해상도 타이머가 사실상 꺼졌고, 2020년에 이 조건을 전제로 다시 쓰는 방식이 표준화됐다.

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- COEP는 `require-corp` 대신 `credentialless`를 쓸 수 있다. `require-corp`는 교차 출처 `no-cors` 자원에 허용하는 `Cross-Origin-Resource-Policy` 헤더를 요구하고, `credentialless`는 그 헤더 없이 쿠키를 빼고 요청한다. `cors` 모드 요청은 어느 쪽이든 CORS 허용이 필요하다.
- `Permissions-Policy`의 `cross-origin-isolated`가 막지 않아야 한다. 기본 허용 목록은 `self`다.
- 격리 여부는 `crossOriginIsolated`로 확인한다. 격리되지 않으면 전역의 `SharedArrayBuffer` 생성자가 숨겨지고 `postMessage`로 보내면 예외가 난다.
- 격리하면 교차 출처 opener와 팝업과의 관계가 끊긴다. 외부 로그인이나 결제 팝업, 타사 iframe과 CDN 자원이 이 조건에서 동작하는지 배포 전에 확인한다.
- 격리할 수 없으면 `MessagePort`로 버퍼를 보내는 방식으로 물러난다. Chrome 안내는 이 방식이 반복 할당과 메시지 지연 때문에 실시간 오디오에 덜 적합하다고 설명한다.

## 사례: Kotlin Multiplatform 오디오 출력 브리지

`kc-audio-bridge`(2026-11-04 저장소 확인)는 Kotlin/Compose Multiplatform 앱에서 Android, Web, Desktop으로 스테레오 float 버퍼를 재생하고 녹음하는 라이브러리다. 공통 계약은 push 모델로, `AudioOutputBridge.create()`, `open()`, `start()` 뒤 코루틴에서 `writeSuspending(buffer, offsetFrames, numFrames, timeoutMillis)`를 반복 호출한다.

- Android: `AudioTrack`을 `MODE_STREAM`, `PERFORMANCE_MODE_LOW_LATENCY`, `ENCODING_PCM_FLOAT`, 최소 버퍼 크기로 만들고 `WRITE_BLOCKING`으로 쓴다. 기본 샘플레이트 44.1 kHz가 출력 장치와 다르면 앞의 샘플레이트 조건 때문에 저지연 경로가 적용되지 않을 수 있다(소스 기반 추론).
- Desktop: Java Sound `SourceDataLine`을 16비트 PCM으로 열고 float 샘플을 바이트로 바꿔 쓴다. 버퍼는 1,024 프레임(기본 44.1 kHz에서 약 23 ms, 48 kHz에서 약 21 ms)이다.
- Web(Kotlin/Wasm): AudioWorklet 프로세서가 2,048 프레임 스테레오 `SharedArrayBuffer` 링 버퍼를 위 구조로 읽고, 모자라면 무음으로 채우며 언더플로를 센다. `AudioContext`는 `latencyHint` 없이 만들어 기본값 `interactive`를 쓴다. 격리되지 않은 페이지(localhost 제외)에는 경고만 남기고 대체 경로가 없어, 비격리 배포에서는 `SharedArrayBuffer` 생성 단계에서 실패할 것으로 보인다(소스 기반 추론, 실행 확인 안 함).
- 발표 기준으로 중간 범주의 대화형 앱, 예컨대 여러 사람이 함께 쓰는 드럼 패턴 편집기의 재현에 쓰였으며, 플랫폼별 지연 측정치는 확인하지 못했다.

## 트레이드오프

- 버퍼를 줄이면 지연이 줄고 언더런 위험이 커진다. AAudio `POWER_SAVING`처럼 큰 버퍼는 지연을 내주고 전력을 아낀다.
- 콜백은 지연을 낮추지만 콜백 안 코드의 제약이 크고, push는 쓰기 쉽지만 추가 버퍼가 필요하다. `EXCLUSIVE`와 웹 공유 메모리는 장치 독점과 교차 출처 격리라는 조건을 붙인다.
- 무음을 미리 흘려 두면 첫 재생의 warm-up 지연을 피하지만, 출력을 유지하는 동안 전력을 계속 쓴다.

## 점검 체크포인트

- 앱 유형과 목표 지연을 먼저 정하고 출력 지연, 왕복 지연과 탭투톤 지연을 구분한다. 출력 지연만 따로 재기 어려우면 신호 처리가 없는 경로에서 왕복 지연의 절반으로 어림한다(Android 문서).
- 버퍼를 시간으로 환산한 예산표를 만들고, 실제 버퍼 크기와 샘플레이트는 열린 스트림에서 다시 읽는다. AAudio의 공유 모드와 버퍼 용량, `AudioTrack`과 `SourceDataLine`의 버퍼 모두 요청값과 달라질 수 있다.
- 초기 버퍼 조정은 무음 재생 중에 하고, AAudio는 재생 중에도 언더런이 늘면 버퍼를 burst 단위로 키울 수 있다. 큰 버퍼에서 언더런이 날 때까지 줄였다가 조금 되돌리거나, 작은 버퍼에서 언더런이 사라질 때까지 늘린다(`AAudioStream_getXRunCount`, `AudioTrack.getUnderrunCount`).
- 오디오 콜백과 `process()` 안에 할당, 잠금, 파일과 네트워크 I/O, 대기가 없는지 코드 리뷰로 확인한다.
- 웹은 시작할 때 `crossOriginIsolated`를 확인하고 `AudioContext.baseLatency`와 `outputLatency`로 추정 지연을 읽는다. `outputLatency`는 실행 중이나 출력 장치가 바뀌면 달라질 수 있다.
- 이 문서는 공식 문서와 저장소 소스를 대조한 기록이며, 실제 기기에서 지연을 측정하지 않았다.

## 출처

- [Can Kotlin Handle Low-Latency Audio? — Kotlin by JetBrains, Phil Burk](https://www.youtube.com/watch?v=1KC5MEM2-U4)
- [Audio Worklet Design Pattern — Chrome for Developers, Hongchan Choi](https://developer.chrome.com/blog/audio-worklet-design-pattern)
- [kc-audio-bridge — philburk](https://github.com/philburk/kc-audio-bridge)
- [Android Developers, AAudio](https://developer.android.com/ndk/guides/audio/aaudio/aaudio)
- [Android Developers, Audio latency](https://developer.android.com/ndk/guides/audio/audio-latency)
- [Android Developers, AudioTrack](https://developer.android.com/reference/android/media/AudioTrack)
- [Android Open Source Project, Android 17 Compatibility Definition](https://source.android.com/docs/compatibility/17/android-17-cdd)
- [Android Open Source Project, AAudio and MMAP](https://source.android.com/docs/core/audio/aaudio)
- [Android Open Source Project, Avoid priority inversion](https://source.android.com/docs/core/audio/avoiding_pi)
- [Oboe — google/oboe](https://github.com/google/oboe#readme)
- [google/oboe, Full Guide](https://github.com/google/oboe/blob/main/docs/FullGuide.md)
- [PortAudio, Blocking Read/Write Functions](https://www.portaudio.com/docs/v19-doxydocs/blocking_read_write.html)
- [Oracle, Java SE 26 API: SourceDataLine](https://docs.oracle.com/en/java/javase/26/docs/api/java.desktop/javax/sound/sampled/SourceDataLine.html)
- [W3C, Web Audio API 1.1 (Working Draft, 2026-09-22)](https://www.w3.org/TR/webaudio/)
- [MDN, AudioWorkletProcessor: process() method](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process)
- [MDN, SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [MDN, Window: crossOriginIsolated property](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated)
- [MDN, Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)
- [HTML Standard, Agents and agent clusters](https://html.spec.whatwg.org/multipage/webappapis.html)
- [NASA Glenn Research Center, Speed of Sound](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/speed-of-sound-interactive/)

## 관련 문서

- [[Backpressure|Backpressure]] — push 쓰기의 막힘과 pull 수요 모델
- [[Concurrency-and-Process-Synchronization|동기화 도구와 우선순위 역전]]
- [[JavaScript-Binary-Data-and-Workers|JavaScript 바이너리 데이터와 Worker]] — SharedArrayBuffer와 Atomics 계약
- [[Security-Headers|HTTP 보안 헤더]] — 응답 헤더를 Helmet과 미들웨어로 넣는 위치(Helmet은 COEP를 기본으로 켜지 않음)
- [[Sleep-and-Timing|Sleep과 타이밍]] — 타이머 해상도와 지터
- [[Latency-Optimization|레이턴시 최적화 개관]] — 구간별 지연 예산 분해
- [[Realtime-Voice-Architecture|실시간 음성 에이전트]] — TTS 첫 재생 지연과 플레이어 버퍼
- [[런타임(Runtime)|런타임 인덱스]]

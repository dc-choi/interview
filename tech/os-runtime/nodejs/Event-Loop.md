### 이벤트 루프
비동기 작업(File, Network I/O)과 이벤트 핸들링(CallBack)을 관리하는 매커니즘

---

- 주요 단계
1. Timers
    ```
    setTimeout() 및 setInterval()에 의해 예약된 콜백을 실행합니다.
    
    타이머는 사용자가 원하는 정확한 시간이 아니라 제공된 콜백이 실행될 수 있는 임계값을 지정합니다.
    
    타이머 콜백은 지정된 시간이 경과한 후 예약 가능한 한 빨리 실행되지만 운영 체제 예약이나 다른 콜백의 실행으로 인해 지연될 수 있습니다.
    ```
2. Pending Callbacks
    ```
    이 단계에서는 TCP 오류 유형과 같은 일부 시스템 작업에 대한 콜백을 실행합니다.
    
    예를 들어 연결을 시도할 때 TCP 소켓이 ECONNREFUSED를 수신하면 일부 *nix 시스템은 오류를 보고하기 위해 대기합니다.
    
    pending callbacks 단계에서 실행되도록 대기열에 추가됩니다.
    ```
3. Idle, Prepare
    ```
    내부적으로 Node.js가 사용합니다. libuv의 준비 작업이나 유지 관리를 위한 단계입니다.
    
    일반적으로 사용자가 직접 제어할 일은 없습니다.
    ```
4. Poll
    ```
    이 단계에서는 중요한 두가지 기능이 있습니다.
    1. I/O를 차단하고 폴링해야 하는 기간을 계산
    2. 대기열에서 이벤트를 처리
    
    이벤트 루프가 poll 단계에 들어가고 예약된 timers가 없는 경우 다음 두 가지 중 하나가 발생합니다.
    poll 대기열이 비어 있지 않으면 이벤트 루프는 대기열이 모두 소진되거나 시스템에 따른 하드 제한에 도달할 때까지 콜백 대기열을 반복하여 동기적으로 콜백을 실행합니다.
    
    투표 대기열이 비어 있으면 다음 두 가지 중 하나가 추가로 발생합니다.
    1. 스크립트가 setImmediate()에 의해 예약된 경우 이벤트 루프는 poll 단계를 종료하고 예약된 스크립트를 실행하기 위해 check 단계로 계속 진행합니다.
    2. 스크립트가 setImmediate()로 예약되지 않은 경우 이벤트 루프는 콜백이 큐에 추가될 때까지 기다린 다음 즉시 실행합니다.
    
    poll 대기열이 비어 있으면 이벤트 루프가 시간 임계값에 도달한 timers를 확인합니다.
    하나 이상의 timers가 준비되면 이벤트 루프가 timers 단계로 다시 래핑되어 해당 timers의 콜백을 실행합니다.
    ```
5. Check
    ```
    setImmediate()로 콜백이 예약되어 있고 poll 단계가 유휴 상태가 되면 poll 이벤트를 기다리지 않고 종료하고 check 단계로 계속 진행합니다.
    ```
6. Close Callbacks
    ```
    소켓이나 핸들이 갑자기 닫히면(예: socket.destroy()), 이 단계에서 'close' 이벤트가 발생하게 됩니다.
    
    그렇지 않으면 process.nextTick()을 통해 발생합니다.
    ```

---

- 실행 흐름
```
1. Node.js 프로그램 실행
JS 파일이 실행되면, Node.js는 처음으로 스크립트를 평가(evaluate)합니다.
여기서 setTimeout이나 비동기 I/O 작업이 등록됩니다.

2. 백그라운드 처리
비동기 I/O 작업은 libuv의 스레드 풀로 전달됩니다.
완료되면 콜백이 이벤트 큐에 등록됩니다.

3. 이벤트 루프 처리
이벤트 루프는 각 단계에서 적합한 큐에 등록된 작업을 하나씩 처리합니다.

4. 작업 완료
이벤트 루프가 처리할 작업이 없을 때 프로그램이 종료됩니다.
```

---

- 실행 순서 분석
```
1. Call Stack

2. nextTickQueue
process.nextTick 콜백 처리

3. MicrotaskQueue
Promise 콜백 처리

=> MacrotaskQueue에 있는 작업들을 처리

4. Timer
setTimeout, setInterval 콜백 처리

5. Pending Callbacks
일부 I/O 작업 콜백 처리

6. Poll
I/O 이벤트 처리

7. Check
setImmediate 콜백 처리

8. Close Callbacks
close 이벤트 처리
```
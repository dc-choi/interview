/**
 * 서로소 유니온 타입
 *
 * 교집합이 없는 타입들로만 만든 유니온 타입
 */

type Admin = {
    tag: "ADMIN";
    name: string;
    kickCount: number;
};
type Member = {
    tag: "MEMBER";
    name: string;
    point: number;
};
type Guest = {
    tag: "GUEST";
    name: string;
    visitCount: number;
};

type User = Admin | Member | Guest;

const login = (user: User) => {
    switch (user.tag) {
        case "ADMIN":
            console.log(`${user.name}님은 ${user.kickCount}회 강퇴했습니다.`);
            break;
        case "MEMBER":
            console.log(`${user.name}님은 ${user.point}포인트를 보유중입니다.`);
            break;
        case "GUEST":
            console.log(`${user.name}님은 ${user.visitCount}회 방문했습니다.`);
            break;
    }
};

// 비동기 작업의 결과를 처리하는 예제
type Loading = {
    state: "loading";
};
type Failed = {
    state: "failed";
    code: number;
};
type Success = {
    state: "success";
    data: number[];
};
type AsyncTask = Loading | Failed | Success;

const loading: AsyncTask = {
    state: "loading",
};
const failed: AsyncTask = {
    state: "failed",
    code: 500,
};
const success: AsyncTask = {
    state: "success",
    data: [1, 2, 3, 4, 5],
};

const process = (task: AsyncTask) => {
    switch (task.state) {
        case "loading":
            console.log("로딩중...");
            break;
        case "failed":
            console.log(`실패했습니다. 에러코드: ${task.code}`);
            break;
        case "success":
            console.log(`성공했습니다! 데이터: ${task.data}`);
            break;
    }
};
process(loading);
process(failed);
process(success);
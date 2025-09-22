/**
 * 제네릭의 활용 예시로 프로미스를 반환하는 함수의 타입 정의
 */

interface Post {
    id: number;
    title: string;
    content: string;
}

const fetchPost = (): Promise<Post> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve({ id: 1, title: "Hello", content: "World" });
        }, 500);
    })
};

const postPromise = fetchPost();

postPromise.then((post) => {
    console.log(post);
});
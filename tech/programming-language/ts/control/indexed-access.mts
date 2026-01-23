/**
 * 인덱스드 엑세스 타입
 */

interface Post {
    title: string;
    content: string;
    author: {
        id: number;
        name: string;
    };
}
// "author" 부분은 string 리터럴 같은 타입들만 입력 가능함.
// []를 중첩해서 사용하여 더 깊은 타입도 접근 가능함.
// type Author = Post["author"];
// type AuthorName = Post["author"]["name"];
const getAuthorInfo = (author: Post["author"]) => {
    console.log(`${author.name} (ID: ${author.id})`);
};

type PostList = Post[];
const getAuthorInfoForArray = (author: PostList[number]["author"]) => {
    console.log(`${author.name} (ID: ${author.id})`);
};

type Tup = [number, string, boolean];
type First = Tup[0]; // number
type Second = Tup[1]; // string
type Third = Tup[2]; // boolean
type TupNum = Tup[number]; // number | string | boolean

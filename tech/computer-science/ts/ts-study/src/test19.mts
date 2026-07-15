/**
 * API 작성시에는 반환 타입을 큰 객체로 만들고 반환 타입 전체가 null이거나 null이 아니게 해야 함.
 *
 * 클래스 생성시 필요한 모든 값이 준비되었을 때 생성하여 null이 존재하지 않도록 하는 것이 좋음.
 */

interface UserInfo {}

interface Post {}

const fetchUserInfo = (userId: string) => {
    const result: UserInfo = {};

    return result;
};

const fetchPosts = (userId: string) => {
    const result: Post[] = [];

    return result;
};

class UserPost {
    userInfo: UserInfo;
    posts: Post[];

    constructor(userInfo: UserInfo, posts: Post[]) {
        this.userInfo = userInfo;
        this.posts = posts;
    }

    static async init(userId: string): Promise<UserPost> {
        const [userInfo, posts] = await Promise.all([
            fetchUserInfo(userId),
            fetchPosts(userId),
        ]);
        return new UserPost(userInfo, posts);
    }
}
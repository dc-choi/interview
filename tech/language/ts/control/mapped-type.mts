/**
 * 맵드 타입
 */

interface User {
    id: number;
    name: string;
    age: number;
}

type ReadOnlyPartialUser = {
    readonly [Key in keyof User]?: User[Key] | null | undefined;
};

const fetchUser = (): User => {
    return {
        id: 1,
        name: 'Mike',
        age: 30
    };
};

const updateUser = (user: ReadOnlyPartialUser) => {
    console.log(user);
};

const user = fetchUser();
updateUser({
    ...user,
});
const obj = {
    '2': '0',
    '0': '5',
    '5': '2'
};

const solution = rsp => {
    return rsp.split('').reduce((acc, cur) => {
        acc += obj[cur];
        return acc;
    }, '')
};
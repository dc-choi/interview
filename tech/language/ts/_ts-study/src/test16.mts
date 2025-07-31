// interface Request {
//     state: 'loading' | 'error' | 'success';
//     isLoading?: boolean;
//     error?: string;
//     response?: string;
// }

interface RequestLoading {
    state: 'loading';
    isLoading: boolean;
}

interface RequestError {
    state: 'error';
    error: string;
}

interface RequestSuccess {
    state: 'success';
    response: string;
}

type RequestResult = RequestSuccess | RequestError | RequestLoading;

interface State {
    page: string;
    requests: { [key: string]: RequestResult };
}

const render = (state: State) => {
    const { page, requests } = state;
    const requestState = requests[page];

    switch (requestState.state) {
        case 'loading':
            return `<div>${requestState.state}...</div>`;
        case 'error':
            return `<div>${requestState.state}... ${requestState.error}</div>`;
        case 'success':
            return `<div>${requestState.state}! ${requestState.response}</div>`;
    }
};

const changePage = (state: State, newPage: string) => {
    state.requests[newPage] = { state: 'loading', isLoading: true };
    state.page = newPage;

    const response = Math.random() > 0.4 ? 'success' : 'error';

    switch (response) {
        case 'success':
            state.requests[newPage] = { state: 'success', response: 'success' };
            break;
        case 'error':
            state.requests[newPage] = { state: 'error', error: 'error' };
            break;
    }
};

const state: State = {
    page: 'home',
    requests: {
        home: { state: 'loading', isLoading: true },
        about: { state: 'loading', isLoading: true },
        contact: { state: 'loading', isLoading: true },
    },
};

changePage(state, 'about');
console.log(render(state));

changePage(state, 'contact');
console.log(render(state));

changePage(state, 'home');
console.log(render(state));

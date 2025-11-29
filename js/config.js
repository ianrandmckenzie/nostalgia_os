const CONFIG = {
    development: {
        API_BASE_URL: 'http://abc.localhost:3000/',
        SUGGESTIONS_LIST_PATH: 'end_data/public/ananan',
        SUGGESTIONS_SUBMISSIONS_PATH: 'end_data/public/kfjbwef',
        TUBE_STREAMS_PATH: 'tube-streams.json'
    },
    production: {
        API_BASE_URL: 'https://www.failureunit.tv/',
        SUGGESTIONS_LIST_PATH: 'end_data/public/suggestions',
        SUGGESTIONS_SUBMISSIONS_PATH: 'end_data/public/submit-suggestion',
        TUBE_STREAMS_PATH: 'tube-streams.json'
    }
};

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
const currentEnv = isLocal ? 'development' : 'production';

export const API_BASE_URL = CONFIG[currentEnv].API_BASE_URL;
export const SUGGESTIONS_LIST_PATH = CONFIG[currentEnv].SUGGESTIONS_LIST_PATH;
export const SUGGESTIONS_SUBMISSIONS_PATH = CONFIG[currentEnv].SUGGESTIONS_SUBMISSIONS_PATH;
export const TUBE_STREAMS_PATH = CONFIG[currentEnv].TUBE_STREAMS_PATH;

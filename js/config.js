const CONFIG = {
    development: {
        API_BASE_URL: 'http://abc.localhost:3000/'
    },
    production: {
        API_BASE_URL: 'https://www.relentlesscurious.com/'
    }
};

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const currentEnv = isLocal ? 'development' : 'production';

export const API_BASE_URL = CONFIG[currentEnv].API_BASE_URL;

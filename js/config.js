const CONFIG = {
    development: {
        API_BASE_URL: 'http://abc.localhost:3000/',
        SUGGESTIONS_LIST_PATH: 'end_data/public/ananan',
        SUGGESTIONS_SUBMISSIONS_PATH: 'end_data/public/kfjbwef',
        TUBE_STREAMS_PATH: 'end_data/public/tube-streams',
        CUSTOM_APPS_PATH: 'end_data/public/custom_apps'
    },
    production: {
        API_BASE_URL: 'https://www.relentlesscurious.com/',
        SUGGESTIONS_LIST_PATH: 'end_data/public/suggestions',
        SUGGESTIONS_SUBMISSIONS_PATH: 'end_data/public/submit-suggestion',
        TUBE_STREAMS_PATH: 'end_data/public/tube-streams',
        CUSTOM_APPS_PATH: 'end_data/public/custom_apps'
    },
    trusted_providers: [
      {
        domains: ['s3.ca-central-1.amazonaws.com', 'www.relentlesscurious.com'],
        dev_domains: ['localhost', '*.localhost', 'abc.localhost:3000'],
        types: ['img', 'audio', 'video']
      },
      {
        domains: ['www.relentlesscurious.com'],
        dev_domains: ['abc.localhost:3000'],
        types: ['connect']
      },
      {
        domains: ['i.ytimg.com', 'img.youtube.com'],
        dev_domains: [],
        types: ['img']
      },
      {
        domains: ['www.youtube.com'],
        dev_domains: [],
        types: ['frame', 'script']
      }
    ],
    db_name: 'NostalgiaOS',
    site_name: 'Doorways ‘25',
    branding_images: 'default_branding'
};

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
const currentEnv = isLocal ? 'development' : 'production';

export const API_BASE_URL = CONFIG[currentEnv].API_BASE_URL;
export const SUGGESTIONS_LIST_PATH = CONFIG[currentEnv].SUGGESTIONS_LIST_PATH;
export const SUGGESTIONS_SUBMISSIONS_PATH = CONFIG[currentEnv].SUGGESTIONS_SUBMISSIONS_PATH;
export const TUBE_STREAMS_PATH = CONFIG[currentEnv].TUBE_STREAMS_PATH;
export const CUSTOM_APPS_PATH = CONFIG[currentEnv].CUSTOM_APPS_PATH;
export const DISABLE_DEVVIT = CONFIG.disable_devvit || false;

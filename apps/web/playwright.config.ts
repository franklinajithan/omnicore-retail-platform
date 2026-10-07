import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 fullyParallel:false,
 retries:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:3000',trace:'on-first-retry',screenshot:'only-on-failure',video:'retain-on-failure'},
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm run dev',url:'http://127.0.0.1:3000',reuseExistingServer:true,timeout:120000},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]
});

const puppeteer = require('puppeteer');
const genericPool = require('generic-pool');
const randomUseragent = require('random-useragent');
const dateformat = require('dateformat');
// const RandExp = require('randexp');
const faker = require('faker');
//const csv = require('csv-parser');
//const stringify = require('csv-stringify');
const fs = require('fs');

const {createAccount, torNewIp, delay} = require('./functions');
let options = require('./options');
let i = 0;
let proxies = [...options.proxy];

const delayMS = (ms) => {
    return new Promise(res=>{setTimeout(res,ms)})
}

const pool = genericPool.createPool({
    create: async () => {

        if (!proxies.length) {
            proxies = [...options.proxy];
        }
        let {control = null, proxy} = proxies.pop();
        let instance = await puppeteer.launch({
            headless: true,
            args: [
                `--proxy-server=${proxy}`,
                // `--ignore-certificate-errors`
            ]
        });
        i++;
        console.log(`create instance ${i}`);
        instance._own = {
            proxy,
            tor: control,
            numInstance: i,
        };
        return instance;
    },
    destroy: async instance => {
        console.log('destroy instance', instance._own.numInstance);
        await instance.close()
    },
}, {
    max: proxies.length, // maximum size of the pool
    // max: 1, // maximum size of the pool
    min: 1, // minimum size of the pool
});

let items = [];
let fails = [];

const getAvailableEmail = async () => {
    if(emails.length === 0){
        await pool.drain();
        await pool.clear();
        return;
    }//emails ended => clear all.
    return emails.pop();
}

async function run(emails = []) {
    console.log('Processing', emails.length);
    for (let email of emails) {
        console.log('send to queue', email);
        pool.acquire()
            .then(async browser => {
                let log = {};
                await delayMS(30000);//to test works all fine or no.
                const email = await getAvailableEmail();
                console.log(`${email} handled by ${browser._own.numInstance}`)
                pool.destroy(browser);})
                /*try {
                    console.log('Initializing')
                    const page = await browser.newPage();
                    await page.goto('https://api.ipify.org');
                    log.ip = await page.$eval('body', b => b.textContent.trim());
                    if (browser._own.ip && browser._own.ip === log.ip) {
                        throw Error(`IP isn't changed`)
                    }
                    browser._own.ip = log.ip;
                    console.log('Starting ', email, log.ip);
                    const UA = randomUseragent.getRandom()
                    await page.setUserAgent(randomUseragent.getRandom());
                    log = {...log, ...await createAccount(page, email, UA)};
                    console.log('Result', log);
                    await page.close();
                    return log;
                } catch (e) {
                    fails.push({email, error: e.toString(), log});
                    throw e;
                } finally {
                    if (browser._own.tor) {
                        await torNewIp(browser._own.tor);
                        await delay(10000);
                    }
                    // pool.release(browser);
                    pool.destroy(browser);
                }
            })
            .then(result => {
                items.push(result);
            });*/
    }
    await pool.drain();
    await pool.clear();}

let emails = [];
for (var e = 0; e < 10; e++) {
    // let val = new RandExp(options.regex).gen();
    let val = faker.internet.userName()
    emails.push(val);
}
run(emails)

/*stringify(items, {header: true}, function (err, output) {
    fs.writeFileSync(`items-${dateformat('m-d-yy')}.csv`, output);
});
if (fails.length) {
    stringify(fails, {header: true}, function (err, output) {
        fs.writeFileSync(`fails-${dateformat('m-d-yy')}.csv`, output);
    });
}

*/
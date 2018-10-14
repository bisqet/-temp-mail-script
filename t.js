const puppeteer = require('puppeteer');
//const genericPool = require('generic-pool');
const randomUseragent = require('random-useragent');
const dateformat = require('dateformat');
// const RandExp = require('randexp');
const faker = require('faker');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const fs = require('fs');

const events = require('events');
const eventEmitter = new events.EventEmitter();


const {createAccount, torNewIp, delay} = require('./functions');
let options = require('./options');
let countOfInstances = 0;
let proxies = {available:[...options.proxy], busy:[]};


const delayMS = (ms) => {
    return new Promise(res=>{setTimeout(res,ms)})
}//use this to check if some code have problem with async.
const getAvailableIndex = (arr) => {
    for (let i = arr.length-1; i>=0;i--){//reversed cycle for optimization
        if(arr[i]===undefined){
            return i
        }
    }
    return arr.length
}
const pool = {
    create: async () => {
        
        //await delayMS(1000);

        const currentProxy = proxies.available.pop();//get proxy and delete it from available list


        let {control = null, proxy} = currentProxy;
        instance = {};
        /*let instance = await puppeteer.launch({
            headless: true,
            args: [
                `--proxy-server=${proxy}`,
                // `--ignore-certificate-errors`
            ]
        });*/
        await delayMS(5000);
        const index = getAvailableIndex(proxies.busy);

        proxies.busy[index] = currentProxy;//add proxy to busy list

        //console.info(proxies.busy);

        console.log(`create instance ${index+1}`);

        instance._own = {
            proxy,
            tor: control,
            numInstance: countOfInstances,
        };
        
        return {instance, index};//index must be in instance to delete needed proxy from busy list when it available
    },
    destroy: async ({instance, index}) => {
        //countOfInstances--;
        proxies.available[getAvailableIndex(proxies.available)] = proxies.busy[index];
        proxies.busy[index] = undefined//mark this place for id as free for busy list

        //console.info(proxies.busy);
        console.log('destroy instance', index+1);

        //await instance.close()
        
        eventEmitter.emit('proxyAvailable')
    },
}

let items = [];
let fails = [];

const getAvailableEmail = () => {
    if(emails.length === 1){
        eventEmitter.removeListener("proxyAvailable",registerEmail)
    }//emails ended => no need subscription to proxyAvailable more.
    return emails.pop();
}

async function run(emails = []) {// needs to go through all available for first time
    console.log('Processing', emails.length);
    for (let i = proxies.available.length; i > 0; i--){//reverse cycle used to optimization.
        registerEmail();
    }

    //await pool.drain();
    //await pool.clear();
}

const registerEmail = () => {
pool.create()
            .then(async ({instance, index}) => {
                const browser = instance;
                let log = {};
                let email = getAvailableEmail();
                console.log(`handled ${email} by ${index+1}`)
                await delayMS(5000);
                pool.destroy({instance, index});
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
                    
                }*/
            })
            .then(result => {
                items.push(result);
            });
}

eventEmitter.on('proxyAvailable', registerEmail)

let emails = [];
for (var e = 0; e < 10; e++) {
    // let val = new RandExp(options.regex).gen();
    let val = faker.internet.userName()
    emails.push(val);
}
run(emails)

stringify(items, {header: true}, function (err, output) {
    fs.writeFileSync(`items-${dateformat('m-d-yy')}.csv`, output);
});
if (fails.length) {
    stringify(fails, {header: true}, function (err, output) {
        fs.writeFileSync(`fails-${dateformat('m-d-yy')}.csv`, output);
    });
}


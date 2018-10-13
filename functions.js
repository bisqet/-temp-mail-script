const faker = require('faker');
let options = require('./options');
var anticaptcha = require('./anticaptcha')(options.anticaptcha.accountkey);
const dateformat = require('dateformat');
const TorControl = require('tor-control');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


function resolveCaptcha(sitekey, UA) {
    //recaptcha key from target website
    anticaptcha.setWebsiteURL("https://service.mail.com/registration.html?edition=int&lang=en&#.1258-header-signup2-1");
    anticaptcha.setWebsiteKey(sitekey);

    //browser header parameters
    anticaptcha.setUserAgent(UA);

    // check balance first
    anticaptcha.getBalance(function (err, balance) {
        if (err) {
            console.error(err);
            return;
        }

        if (balance > 0) {
            anticaptcha.createTaskProxyless(function (err, taskId) {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log(taskId);

                anticaptcha.getTaskSolution(taskId, function (err, taskSolution) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    return taskSolution;
                });
            });
        }
    });

}

/**
 * Fill the register form
 * @param page
 * @param {str} data
 * @returns {Promise<{first_name: *, last_name: *, birthday, email: *, password: *,country: *, questions:*}>}
 */
async function createAccount(page, data, UA) {
    let details = {
        first_name: faker.name.firstName(),
        last_name: faker.name.lastName(),
        birthday: dateformat(faker.date.between("01 Jan 1970 00:00:00 GMT", "30 Dec 1986 00:00:00 GMT"), 'mm/dd/yyyy'),
        email: data,
        password: faker.internet.password(15, false, null, '2Wa$'),
    };
    details.country = null;
    details.questions = [];

    // define selectors
    monthSel = '.Text.ColouredFocus.MonthPos'
    daySel = 'Text.ColouredFocus.DayPos'
    yearSel = 'Text.ColouredFocus.YearPos'
    countrySel = 'Required.userdata-country div span select'
    passSel = 'input[tabindex="10"]'
    repassSel = 'input[tabindex="11"]'
    secQestionSel = 'select[tabindex="13"]'
    secAnswerSel = 'select[tabindex="14"]'

    // await page.goto('https://service.mail.com/registration.html?edition=int&lang=en&#.1258-header-signup2-1', {waitUntil: 'networkidle2'});
    await page.goto('https://service.mail.com/registration.html?edition=int&lang=en&#.1258-header-signup2-1');
    await page.type('.Required.userdata-firstname div span input', details.first_name);
    await page.type('.Required.userdata-lastname div span input', details.last_name);
    await delay(50);
    // month
    let month = await dropDown(page, monthSel);
    details.month = month.text;
    await page.select(monthSel, month.val);
    // day
    let day = await dropDown(page, daySel);
    details.day = day.text;
    await page.select(daySel, day.val);
    // year
    let year = await dropDown(page, yearSel);
    details.year = year.text;
    await page.select(yearSel, year.val);
    // country
    let country = await dropDown(page, countrySel);
    details.country = country.text;
    await page.select(countrySel, country.val);

    // await page.type('wc-birthday > div.birthday input', `${(details.birthday).replace(/\//g,'')}`);

    await page.type('.Text.EmailAddress > input', details.email);
    details.email = details.email + '@mail.com'
    await page.type(passSel, details.password);
    await page.type(repassSel, details.password);

    // Question
    let secQeustion = await dropDown(page, secQestionSel);
    details.secQeustion = secQeustion.text;
    await page.select(secQestionSel, secQeustion.val);

    // Answer
    details.answer = `${faker.hacker.adjective()} ${faker.lorem.words()} ${faker.commerce.productName()}`;
    await page.type(secAnswerSel, details.answer);
    
    // Resolve captcha
    let sitekey = await page.evaluate(() => document.getElementById("g-recaptcha-panel").getAttribute("data-sitekey"))
    let gcaptcharesponse = resolveCaptcha(sitekey, UA)
    await page.evaluate(x => {
        document.getElementsByName('g-recaptcha-response').value = x;
      }, gcaptcharesponse);

    await page.click('.InputSubmit.btn-cta span span input[class="Submit"]')
    
    //  *****************************
    await page.waitForNavigation();
    return details;
}

function dropDown(page, sel) {
    page.evaluate(() => {
        let e = document.querySelector(sel),
            random = ~~(Math.random() * e.length) + 1;
        let item = e.item(random);
        return {
            val: item.value,
            text: item.text
        };

    });
}

function torNewIp(control) {
    let controlPort = control.split(':');
    let conn = new TorControl({
        password: '1234567890',                     // Your password for tor-control
        persistent: false,                         // Keep connection (persistent)
        port: controlPort[1],
        host: controlPort[0]
    });
    return new Promise((resolve, reject) => {
        console.log('TOR signal Newnym');
        conn.signalNewnym((err, status) => {
            if (err) {
                return reject(err);
            }
            resolve(status.messages[0]);
        });
    })
}


module.exports = {
    createAccount,
    torNewIp,
    resolveCaptcha,
    delay
};
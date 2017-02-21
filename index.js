'use strict';
const Bluebird = require('bluebird');
const Csv = require('csv');
const Fs = require('fs');
const Request = require('request');
const _ = require('lodash');
const Debug = require('debug');
const Chalk = require('chalk');


const debug = Debug('inc500');
Bluebird.promisifyAll(Fs);
const requestAsync = Bluebird.promisify(Request, {multiArgs: true});
const stringifyCsvAsync = Bluebird.promisify(Csv.stringify);

const FROM_YEAR = 2007;
const TO_YEAR = 2016;

const internals = {};

internals.getList = function (year) {
    return requestAsync({
        url: `http://www.inc.com/inc5000list/json/inc5000_${year}.json`,
        json: true
    }).spread((response, body) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            throw new Error(`${response.request.method} ${response.request.href} ${response.statusCode}\n${JSON.stringify(body, null ,2)}`);
        }

        debug(`${response.request.method} ${Chalk.cyan(response.request.href)} ${response.statusCode} (${response.elapsedTime} ms)`);

        return _(body)
            .filter()   // remove empty items
            .forEach((item) => item.year = year);
    });
};

internals.getAllLists = function(fromYear, toYear) {
    const years = _.range(fromYear, toYear + 1);
    return Bluebird
        .map(years, internals.getList)
        .reduce((allList, yearList) => allList.concat(yearList), []);
};

internals.main = function () {
    return internals.getAllLists(FROM_YEAR, TO_YEAR).then((allLists) => {
        return stringifyCsvAsync(allLists, {
            header: true
        });
    }).then((rawCsv) => {
        Fs.writeFileAsync(`inc500-${FROM_YEAR}-${TO_YEAR}.csv`, rawCsv, 'utf8');
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    })
};

internals.main();

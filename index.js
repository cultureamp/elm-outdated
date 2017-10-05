const fs = require('fs');
const http = require('http');
const table = require('text-table');
const semver = require('semver');
const clc = require('cli-color');

const Elm = require('./elm.js');


let elmPackageJson;

try {
  elmPackageJson = fs.readFileSync('elm-package.json', { encoding: 'utf-8' });
}
catch (e) {
  console.error('There is no elm-package.json in the directory your are running elm-outdated from.');
  process.exit(1);
}

fetch("http://package.elm-lang.org/all-packages")
  .then(data => {
    let parsedJson;

    try {
      parsedJson = JSON.parse(elmPackageJson);
    }
    catch (e) {
      console.log('Your elm-package.json is corrupted.')
      process.exit(1);
    }

    const app = Elm.Main.worker({
      elmPackageJson: parsedJson,
      registry: data,
    });

    app.ports.sendError.subscribe(error => {
      console.log(error);
      process.exit(1);
    });

    app.ports.sendReports.subscribe(reports => {
      if (reports.length === 0) {
        console.log('Everything is up to date!');
      }
      else {
        console.log(
          table(
            [
              [clc.underline('Package'), clc.underline('Current'), clc.underline('Wanted'), clc.underline('Latest')],
              ...reports
                .map(([name, report]) => {
                  const coloredName = semver.lt(report.current, report.wanted) 
                    ? clc.red(name)
                    : name;

                  return !report
                    ? [name, 'custom', 'custom', 'custom']
                    : [coloredName, report.current, clc.green(report.wanted), clc.magenta(report.latest)]
                })
            ],
            {
              align: ['l', 'r', 'r', 'r'],
              stringLength: clc.getStrippedLength
            }
          )
        );
      }
    });
  })
  .catch(err => console.error(err));

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', data => {
        body += data;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        }
        catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    });
  });
}



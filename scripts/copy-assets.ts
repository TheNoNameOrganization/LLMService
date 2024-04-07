import * as fs from 'fs'
//copy config.json to build folder
fs.copyFileSync('./config.json', './build/config.json');

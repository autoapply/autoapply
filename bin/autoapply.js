#!/usr/bin/env node

const util = require('util');
const process = require('process');

const winston = require('winston');
const fsExtra = require('fs-extra');
const dateFormat = require('date-format');
const argparse = require('argparse');
const yaml = require('js-yaml');
const tmpPromise = require('tmp-promise');
const childProcessPromise = require('child-process-promise');
require('colors');

require('pkginfo')(module);

const logger = new winston.Logger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new (winston.transports.Console)({
            formatter: (msg) => {
                let s = dateFormat.asString() + ' ' + winston.config.colorize(msg.level);
                if (msg.message) {
                    s += ' ' + msg.message;
                }
                if (msg.meta && Object.keys(msg.meta).length) {
                    s += ' ' + util.inspect(msg.meta);
                }
                return s;
            }
        })
    ]
});

async function main() {
    const parser = new argparse.ArgumentParser({
        prog: module.exports.name,
        version: module.exports.version,
        addHelp: true,
        description: module.exports.description
    });
    parser.addArgument(['-d', '--debug'], {
        action: 'storeTrue',
        help: 'Show debugging output'
    });
    parser.addArgument(['config'], {
        nargs: '?',
        metavar: '<config-file>',
        help: 'Configuration file to use'
    });
    const args = parser.parseArgs();
    let configFile;
    if (args.config) {
        configFile = args.config;
    } else if (await fsExtra.exists('autoapply.yaml')) {
        configFile = 'autoapply.yaml';
    } else if (await fsExtra.exists('autoapply.yml')) {
        configFile = 'autoapply.yml';
    } else {
        console.error('no configuration file found and none given!');
        return 1;
    }
    const content = await fsExtra.readFile(configFile);
    const obj = yaml.safeLoad(content);
    await run(obj, args);
    return 0;
}

async function run(config, options) {
    if (!config.commands || !config.commands.length) {
        throw new Error('no commands given in the configuration file!');
    }

    const onerror = parseOnError(config.onerror);
    const sleepSec = parseSleep(config.sleep);
    const commands = config.commands.map(cmd => new Command(cmd));

    let loop = 1;
    const loops = options.loops;
    while (true) {
        const tmpDir = await tmpPromise.dir();
        try {
            for (const command of commands) {
                try {
                    await command.run(tmpDir.path);
                } catch (e) {
                    if (onerror === 'fail') {
                        throw e;
                    } else if (options.debug) {
                        logger.error('Command failed:', e);
                    } else {
                        if (e.code === 'ENOENT') {
                            logger.error('Command not found!');
                        } else if (e.message) {
                            logger.error(e.message);
                        } else if (e.code) {
                            logger.error(`Command failed with exit code ${e.code}`);
                        } else {
                            logger.error('Command failed!');
                        }
                    }
                }
            }
        } finally {
            await fsExtra.remove(tmpDir.path);
        }

        if (loops && ++loop > loops) {
            break;
        }

        logger.info(`Sleeping for ${sleepSec}s...`);
        await sleep(sleepSec * 1000);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Command {
    constructor(command) {
        this.command = command;
    }

    run(cwd) {
        let cmd;
        let stdout = 'pipe';
        let stderr = 'pipe';
        if (isObject(this.command)) {
            cmd = this.command['command'];
            stdout = parseStdio(this.command['stdout']);
            stderr = parseStdio(this.command['stderr']);
        } else {
            cmd = this.command;
        }

        logger.info('Executing command:', JSON.stringify(cmd));

        const shell = (typeof cmd === 'string');
        const options = {
            'cwd': cwd,
            'stdio': ['ignore', 'pipe', 'pipe'],
            'shell': shell
        };

        let promise;
        if (shell) {
            promise = childProcessPromise.spawn(cmd, [], options);
        } else if (Array.isArray(cmd)) {
            promise = childProcessPromise.spawn(cmd[0], cmd.slice(1), options);
        } else {
            throw new Error(`invalid type: ${this.cmd}`);
        }

        const childProcess = promise.childProcess;
        if (stdout === 'pipe') {
            childProcess.stdout.on('data', data => process.stdout.write(data));
        }
        if (stderr === 'pipe') {
            childProcess.stderr.on('data', data => process.stderr.write(data));
        }

        return promise;
    }
}

function isObject(value) {
    return value && typeof value === 'object' && value.constructor === Object;
}

function parseOnError(value) {
    if (!value) {
        return 'continue';
    } else if (value === 'continue' || value === 'fail') {
        return value;
    } else {
        throw new Error(`invalid onerror value: ${value}`);
    }
}

function parseSleep(value) {
    if (!value) {
        return 60;
    } else {
        const sleep = parseInt(value);
        if (sleep) {
            return sleep;
        } else {
            throw new Error(`invalid sleep value: ${value}`);
        }
    }
}

function parseStdio(value) {
    if (!value) {
        return 'pipe';
    } else if (value === 'ignore' || value === 'pipe') {
        return value;
    } else {
        throw new Error(`invalid stdio value: ${value}`);
    }
}

module.exports.logger = logger;
module.exports.run = run;

if (require.main === module) {
    main().then(status => process.exit(status)).catch(err => console.log(err));
}

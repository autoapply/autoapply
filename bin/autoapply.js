#!/usr/bin/env node

const util = require('util');
const http = require('http');
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

const logger = new winston.Logger();

/**
 * @param {string[]|*} argv the program arguments
 * @returns {Promise<Context>} the context
 */
async function main(argv = null) {
    logger.configure({
        level: process.env.LOG_LEVEL || 'info',
        transports: [
            new winston.transports.Console({
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
        metavar: '<configuration>',
        help: 'Configuration file to use'
    });
    const args = parser.parseArgs(argv);
    if (args.debug) {
        logger.level = 'debug';
    }
    let config;
    try {
        if (args.config.startsWith('env:')) {
            const envvar = args.config.substr('env:'.length);
            if (!envvar) {
                throw new Error('empty environment variable name!');
            }
            if (!process.env.hasOwnProperty(envvar)) {
                throw new Error(`environment variable does not exist: ${envvar}`);
            }
            config = yaml.safeLoad(process.env[envvar]);
        } else {
            const content = await fsExtra.readFile(args.config);
            config = yaml.safeLoad(content);
        }
        if (!config) {
            throw new Error('configuration is empty!');
        }
        if (args.debug) {
            logger.debug('Loaded configuration:', JSON.stringify(config, null, 2));
        }
    } catch (e) {
        if (args.debug) {
            throw new DebugError(e);
        } else {
            throw e;
        }
    }
    return run(config, args).then((ctx) => {
        setupSignalHandler(ctx);
        catchLoops(ctx);
        return ctx;
    });
}

class DebugError extends Error { }

function setupSignalHandler(ctx) {
    const track = { 'time': 0 };
    process.on('SIGINT', () => {
        const now = new Date().getTime();
        if ((now - track.time) > 5000) {
            logger.info('Signal SIGINT received, shutting down...');
            ctx.stop().catch((err) => {
                logger.error('Failed to shut down:', err.message || 'unknown error!');
            });
        } else {
            logger.warn('Terminated.');
            process.exit();
        }
        track.time = now;
    });
}

function catchLoops(ctx) {
    ctx.loops.forEach((loop) => loop.promise = loop.promise.catch((err) => {
        logger.warn('Error while running loop:', err.message || 'unknown error!');
    }));
}

/**
 * Run the loops given in the configuration
 *
 * @param {object} config 
 * @param {object} options 
 * @returns {Promise<Context>} the context
 */
async function run(config, options = {}) {
    const ctx = new Context();

    const init = (config.init ? new Init(config.init) : null);

    if (!config.loop) {
        throw new Error('invalid configuration, loop section missing!');
    } else if (Array.isArray(config.loop)) {
        config.loop.forEach((loop) => ctx.loops.push(new Loop(loop)));
    } else {
        ctx.loops.push(new Loop(config.loop));
    }

    if (ctx.loops.length === 1) {
        ctx.loops[0].name = 'Loop';
    } else {
        ctx.loops.forEach((loop, idx) => loop.name = `Loop ${idx + 1}`);
    }

    if (config.server && config.server.enabled !== false) {
        const port = (config.server ? config.server.port : 0) || 3000;
        ctx.server = await startServer(port);
    } else {
        logger.debug('Server is disabled');
    }

    if (init) {
        logger.info('Running init commands...');
        await runCommands(init.commands, init.cwd, init.onError, options.debug, 'Init: ', ctx);
    } else {
        logger.info('No init commands.');
    }

    logger.info('Running loop commands...');
    ctx.loops.forEach((loop) => loop.start(options, ctx));

    return ctx;
}

function startServer(port) {
    logger.debug('Starting server...');
    const server = http.createServer(handleRequest);
    return new Promise((resolve, reject) => {
        server.listen(port, (err) => {
            if (err) {
                reject(err);
            } else {
                logger.info(`Server is listening on port ${port}...`);
                resolve(server);
            }
        });
    });
}

function handleRequest(request, response) {
    logger.debug('Request received:', request.method, request.url);

    let handler;
    if (request.url === '/healthz') {
        handler = () => 'OK';
    } else {
        handler = null;
    }

    if (handler) {
        if (request.method === 'HEAD') {
            response.writeHead(200, http.STATUS_CODES[200]);
            response.end();
        } else if (request.method === 'GET') {
            let msg;
            try {
                msg = handler();
            } catch (e) {
                logger.info('Error handling request:', request.url, e.message || 'unknown error!');
                response.writeHead(500, http.STATUS_CODES[500]);
                response.end('Internal server error!');
                msg = null;
            }
            if (msg) {
                response.writeHead(200, http.STATUS_CODES[200]);
                response.end(msg);
            }
        } else {
            response.writeHead(405, http.STATUS_CODES[405]);
            response.end('Only GET or HEAD supported!');
        }
    } else {
        response.writeHead(404, http.STATUS_CODES[404]);
        response.end('Not found!');
    }
}

/**
 * Run the commands in the given loop until the program is stopped
 *
 * @param {Loop} loop 
 * @param {object} options 
 * @param {object} ctx 
 */
async function runLoop(loop, options, ctx) {
    const prefix = (loop.name ? `${loop.name}: ` : '');
    let cur = 1;
    const loops = options.loops;
    while (ctx.running) {
        if (loop.cwd) {
            await runCommands(loop.commands, loop.cwd, loop.onError,
                options.debug, prefix, ctx);
        } else {
            const tmpDir = await tmpPromise.dir();
            try {
                await runCommands(loop.commands, tmpDir.path, loop.onError,
                    options.debug, prefix, ctx);
            } finally {
                await fsExtra.remove(tmpDir.path);
                logger.debug(`${prefix}Deleted temporary directory.`);
            }
        }

        if (!ctx.running || (loops && ++cur > loops)) {
            break;
        }

        if (loop.sleep) {
            logger.info(`${prefix}Sleeping for ${loop.sleep}s...`);
            await loop.doSleep();
        } else {
            logger.debug(`${prefix}Not sleeping (sleep = 0)`);
        }
    }
}

/**
 * Run the given commands, one at a time
 *
 * @param {Command[]} commands
 * @param {string} cwd
 * @param {string} onerror
 * @param {boolean} debug
 * @param {string} prefix
 * @param {Context} ctx
 */
async function runCommands(commands, cwd, onerror, debug, prefix, ctx) {
    logger.debug('Executing in directory:', cwd);
    for (const command of commands) {
        if (!ctx.running) {
            break;
        }
        logger.info(`${prefix}Executing command:`, JSON.stringify(command.command));
        try {
            await command.run(cwd);
        } catch (e) {
            if (onerror === 'fail') {
                throw e;
            } else {
                if (debug) {
                    logger.silly('Command failed:', e);
                }
                if (e.code === 'ENOENT') {
                    logger.error('Command not found!');
                } else if (e.message) {
                    logger.error(e.message);
                } else if (e.code) {
                    logger.error(`Command failed with exit code ${e.code}`);
                } else {
                    logger.error('Command failed!');
                }
                if (onerror === 'ignore') {
                    continue;
                } else if (onerror === 'continue') {
                    // stop any remaining commands and continue with the next loop iteration
                    break;
                } else {
                    throw new Error('invalid onerror value!');
                }
            }
        }
    }
}

class Context {
    constructor() {
        this.running = true;
        this.active = 0;
        this.loops = [];
        this.server = null;
    }

    stop() {
        this.running = false;
        this.loops.forEach((loop) => loop.stop());
        let promise;
        if (this.server) {
            promise = new Promise((resolve) => {
                this.server.close((err) => {
                    if (err) {
                        logger.warn('Could not stop server:', err.message || 'unknown error!');
                    }
                    this.server = null;
                    resolve();
                });
            });
        } else {
            promise = Promise.resolve();
        }
        return promise.then(() => this.wait());
    }

    wait() {
        return Promise.all(this.loops.map((loop) => loop.promise));
    }
}

class Init {
    constructor(init) {
        if (!init.commands || !init.commands.length) {
            throw new Error('no init commands given!');
        }
        this.cwd = init.cwd || '.';
        this.onError = parseOnError(init.onerror, 'fail');
        this.commands = init.commands.map((cmd) => new Command(cmd));
    }
}

class Loop {
    constructor(loop) {
        if (!loop.commands || !loop.commands.length) {
            throw new Error('no loop commands given!');
        }
        this.cwd = loop.cwd || null;
        this.sleep = parseSleep(loop.sleep);
        this.onError = parseOnError(loop.onerror, 'continue');
        this.commands = loop.commands.map((cmd) => new Command(cmd));
    }

    start(options, ctx) {
        ctx.active += 1;
        function stopped() {
            ctx.active -= 1;
            if (ctx.active === 0) {
                logger.info('Exit.');
            }
        }
        this.promise = doFinally(runLoop(this, options, ctx), stopped);
    }

    doSleep() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this._wait = null;
                resolve();
            }, this.sleep * 1000);
            this._wait = [timeout, resolve];
        });
    }

    stop() {
        if (this._wait) {
            const [timeout, resolve] = this._wait;
            clearTimeout(timeout);
            setImmediate(resolve);
            this._wait = null;
            logger.debug(`${this.name} has been stopped.`);
        }
    }
}

class Command {
    constructor(command) {
        if (isObject(command)) {
            this.command = command['command'];
            this.stdout = parseStdio(command['stdout']);
            this.stderr = parseStdio(command['stderr']);
        } else {
            this.command = command;
            this.stdout = 'pipe';
            this.stderr = 'pipe';
        }
        if (typeof this.command === 'string') {
            this.command = this.command.trim();
            if (!this.command) {
                throw new Error('command is empty!');
            }
        } else if (Array.isArray(this.command)) {
            if (!this.command.length || !this.command[0]) {
                throw new Error(`invalid command: ${this.command}`);
            }
            for (const cmd of this.command) {
                if (typeof cmd !== 'string') {
                    throw new Error(`invalid command: ${this.command}`);
                }
            }
        } else {
            throw new Error(`invalid command: ${this.command}`);
        }
    }

    run(cwd) {
        const shell = (typeof this.command === 'string');
        const options = {
            'cwd': cwd,
            'stdio': ['ignore', this.stdout, this.stderr],
            'shell': shell
        };

        let promise;
        if (shell) {
            promise = childProcessPromise.spawn(this.command, [], options);
        } else {
            promise = childProcessPromise.spawn(this.command[0], this.command.slice(1), options);
        }

        const childProcess = promise.childProcess;
        if (this.stdout === 'pipe') {
            childProcess.stdout.on('data', (data) => process.stdout.write(data));
        }
        if (this.stderr === 'pipe') {
            childProcess.stderr.on('data', (data) => process.stderr.write(data));
        }

        return promise;
    }
}

function isObject(value) {
    return value && typeof value === 'object' && value.constructor === Object;
}

function doFinally(promise, callback) {
    function onThen(result) {
        callback();
        return result;
    }
    function onCatch(err) {
        callback();
        throw err;
    }
    return promise.then(onThen, onCatch);
}

function parseOnError(value, defaultValue) {
    if (!value) {
        return defaultValue;
    } else if (value === 'ignore' || value === 'continue' || value === 'fail') {
        return value;
    } else {
        throw new Error(`invalid onerror value: ${value}`);
    }
}

function parseSleep(value) {
    if (value === 0 || value === '0') {
        return 0;
    } else if (!value || value < 0) {
        logger.debug('using default sleep value!');
        return 60;
    } else {
        const sleep = parseFloat(value);
        if (sleep || sleep === 0) {
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

module.exports.main = main;
module.exports.run = run;

if (require.main === module) {
    main().catch((err) => {
        process.exitCode = 1;
        if (err instanceof DebugError) {
            logger.error(err.stack);
        } else {
            logger.error(err.message || 'unknown error!');
        }
    });
}

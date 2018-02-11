#!/usr/bin/env node

'use strict';

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
    if (args.debug && logger.level === 'info') {
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

    if (!config.loop && !config.call) {
        throw new Error('invalid configuration, neither loop nor call section given!');
    }

    if (Array.isArray(config.loop)) {
        config.loop.forEach((loop) => ctx.loops.push(new Loop(loop)));
    } else if (config.loop) {
        ctx.loops.push(new Loop(config.loop));
    }

    if (Array.isArray(config.call)) {
        config.call.forEach((call) => ctx.calls.push(new Call(call)));
    } else if (config.call) {
        ctx.calls.push(new Call(config.call));
    }

    if (ctx.loops.length === 1) {
        ctx.loops[0].name = 'Loop';
    } else {
        ctx.loops.forEach((loop, idx) => loop.name = `Loop ${idx + 1}`);
    }

    if (ctx.calls.length || (config.server && config.server.enabled !== false)) {
        const port = (config.server ? config.server.port : 0) || 3000;
        ctx.server = await startServer(port, ctx);
    } else {
        logger.debug('Server is disabled');
    }

    if (init) {
        logger.info('Running init commands...');
        await runCommands(init.commands, init.cwd, init.onError, 'Init: ', {}, null, ctx);
    } else {
        logger.info('No init commands.');
    }

    logger.info('Running loop commands...');
    ctx.loops.forEach((loop) => loop.start(options, ctx));

    return ctx;
}

function startServer(port, ctx) {
    logger.debug('Starting server...');
    const server = http.createServer((req, res) => handleRequest(req, res, ctx));
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

/**
 * @param {http.IncomingMessage} request
 * @param {http.ServerResponse} response
 * @param {Context} ctx
 */
async function handleRequest(request, response, ctx) {
    logger.debug('Request received:', request.method, request.url);

    let handler = null;
    if (request.url === '/healthz') {
        handler = (request, response) => {
            if (request.method === 'HEAD') {
                response.writeHead(200, http.STATUS_CODES[200]);
                response.end();
            } else if (request.method === 'GET') {
                response.end('OK');
            } else {
                response.writeHead(405, http.STATUS_CODES[405]);
                response.end('Only GET or HEAD supported!');
            }
        };
    } else {
        const call = ctx.calls.find((call) => call.path === request.url);
        if (call) {
            handler = call.call.bind(call);
        }
    }

    if (handler) {
        try {
            await handler(request, response, ctx);
        } catch (e) {
            logger.info('Error handling request:', request.url, e.message || 'unknown error!');
        } finally {
            response.end();
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
    const prefix = `${loop.name}: `;
    let cur = 1;
    const loops = options.loops;
    while (ctx.running) {
        if (loop.cwd) {
            await runCommands(loop.commands, loop.cwd, loop.onError,
                prefix, {}, null, ctx);
        } else {
            const tmpDir = await tmpPromise.dir();
            try {
                await runCommands(loop.commands, tmpDir.path, loop.onError,
                    prefix, {}, null, ctx);
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
 * @param {string} prefix
 * @param {object} env
 * @param {object} stdio
 * @param {Context} ctx
 */
async function runCommands(commands, cwd, onerror, prefix, env, stdio, ctx) {
    logger.debug('Executing in directory:', cwd);
    for (const command of commands) {
        if (!ctx.running) {
            break;
        }
        if (command.command) {
            logger.info(`${prefix}Executing command:`, JSON.stringify(command.command));
        } else {
            logger.info(`${prefix}Executing script...`);
        }
        try {
            await command.run(cwd, env, stdio);
        } catch (e) {
            logger.silly('Command failed:', e);
            if (e.code === 'ENOENT') {
                logger.error('Command not found!');
            } else if (e.message) {
                logger.error(e.message);
            } else if (e.code) {
                logger.error(`Command failed with exit code ${e.code}`);
            } else {
                logger.error('Command failed!');
            }
            if (onerror === 'fail') {
                throw e;
            } else {
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
        this.calls = [];
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

class Call {
    constructor(call) {
        if (!call.path) {
            throw new Error('call: no path given!');
        }
        if (!call.commands || !call.commands.length) {
            throw new Error('call: no commands given!');
        }
        this.path = call.path;
        this.methods = parseMethods(call.methods);
        this.headers = parseHeaders(call.headers);
        this.stream = parseBoolean(call.stream, false);
        this.cwd = call.cwd || null;
        this.commands = call.commands.map((cmd) => new Command(cmd));
    }

    async call(request, response, ctx) {
        if (this.methods.length && this.methods.indexOf(request.method) < 0) {
            response.writeHead(405, http.STATUS_CODES[405]);
            response.end(`Unsupported method: ${request.method}`);
            return;
        }
        for (const [name, value] of Object.entries(this.headers)) {
            response.setHeader(name, value);
        }
        const env = {};
        env['REQUEST_METHOD'] = request.method;
        env['REQUEST_URI'] = request.url;
        env['REMOTE_ADDR'] = request.socket.address().address;
        for (const [name, value] of Object.entries(request.headers)) {
            const normalized = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
            env[`HTTP_${normalized}`] = value.toString();
        }
        const prefix = `Call ${this.path}: `;
        if (this.stream) {
            const stdio = {
                'stdout': (data) => response.write(data),
                'stderr': (data) => response.write(data)
            };
            response.writeHead(200, http.STATUS_CODES[200]);
            await runCommands(this.commands, this.cwd, 'continue', prefix, env, stdio, ctx);
        } else {
            let str = '';
            const stdio = {
                'stdout': (data) => str += data,
                'stderr': (data) => str += data
            };
            let err = null;
            try {
                await runCommands(this.commands, this.cwd, 'fail', prefix, env, stdio, ctx);
            } catch (e) {
                err = e;
            }
            if (err) {
                response.writeHead(500, http.STATUS_CODES[500]);
            } else {
                response.writeHead(200, http.STATUS_CODES[200]);
            }
            response.write(str);
        }
    }
}

class Command {
    constructor(command) {
        if (isObject(command)) {
            if (command['command'] && command['script']) {
                throw new Error('cannot combine command and script!');
            }
            if (command['script']) {
                this.script = command['script'];
            } else {
                this.command = command['command'];
            }
            this.stdout = parseStdio(command['stdout']);
            this.stderr = parseStdio(command['stderr']);
        } else {
            this.command = command;
            this.stdout = 'pipe';
            this.stderr = 'pipe';
        }
        if (this.script) {
            if (typeof this.script === 'string') {
                this.script = this.script.trim();
                if (!this.script) {
                    throw new Error('script is empty!');
                }
            } else {
                throw new Error(`invalid script: ${this.script}`);
            }
        } else {
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
    }

    async run(cwd, env, stdio) {
        const shell = (typeof this.script === 'string' || typeof this.command === 'string');
        const options = {
            'cwd': cwd,
            'env': Object.assign({}, process.env, env),
            'stdio': ['ignore', this.stdout, this.stderr],
            'shell': shell
        };

        if (!stdio) {
            stdio = {
                'stdout': (data) => process.stdout.write(data),
                'stderr': (data) => process.stderr.write(data)
            };
        }

        if (this.script) {
            const tmp = await tmpPromise.file();
            try {
                await fsExtra.writeFile(tmp.path, this.script, 'utf8');
                await fsExtra.close(tmp.fd);
                await fsExtra.chmod(tmp.path, 0o700);

                logger.debug(`Script written: ${tmp.path}`);
                await this._spawn(tmp.path, [], options, stdio);
            } finally {
                await fsExtra.unlink(tmp.path);
                logger.debug(`Script deleted: ${tmp.path}`);
            }
        } else {
            if (shell) {
                await this._spawn(this.command, [], options, stdio);
            } else {
                await this._spawn(this.command[0], this.command.slice(1), options, stdio);
            }
        }
    }

    _spawn(cmd, args, options, stdio) {
        const promise = childProcessPromise.spawn(cmd, args, options);
        const childProcess = promise.childProcess;
        if (this.stdout === 'pipe') {
            childProcess.stdout.on('data', (data) => stdio.stdout(data));
        }
        if (this.stderr === 'pipe') {
            childProcess.stderr.on('data', (data) => stdio.stderr(data));
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

function parseMethods(methods) {
    if (!methods) {
        return ['GET'];
    } else if (Array.isArray(methods)) {
        if (methods.length === 0 || (methods.length === 1 && methods[0] === '*')) {
            // accept all methods
            return [];
        } else {
            return methods.map((str) => {
                if (typeof str !== 'string') {
                    throw new Error(`method is not a string: ${str}`);
                }
                return str.toUpperCase();
            });
        }
    } else {
        throw new Error(`invalid methods value: ${methods}`);
    }
}

function parseHeaders(headers) {
    if (!headers) {
        return {};
    } else if (Array.isArray(headers)) {
        return headers.reduce((map, obj) => {
            if (!obj.name || typeof obj.name !== 'string') {
                throw new Error(`header name is not a string: ${obj.name}`);
            }
            if (!obj.value || typeof obj.value !== 'string') {
                throw new Error(`header value is not a string: ${obj.value}`);
            }
            map[obj.name] = obj.value;
            return map;
        }, {});
    } else if (isObject(headers)) {
        for (const value of Object.values(headers)) {
            if (typeof value !== 'string') {
                throw new Error(`header value is not a string: ${value}`);
            }
        }
        return headers;
    } else {
        throw new Error(`invalid header value: ${headers}`);
    }
}

function parseBoolean(value, def) {
    if (value === true || value === 'true') {
        return true;
    } else if (value === false || value === 'false') {
        return false;
    } else {
        return def;
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

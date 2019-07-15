const fsExtra = require("fs-extra");
const tmpPromise = require("tmp-promise");

const {
  logger,
  runCommands,
  parseSleep,
  parseOnError,
  doFinally
} = require("./common");
const { Command } = require("./Command");

class Loop {
  constructor(loop) {
    if (!loop.commands || !loop.commands.length) {
      throw new Error("no loop commands given!");
    }
    this.cwd = loop.cwd || null;
    this.sleep = parseSleep(loop.sleep);
    this.onError = parseOnError(loop.onerror, "continue");
    this.commands = loop.commands.map(cmd => new Command(cmd));
  }

  start(options, ctx) {
    ctx.active += 1;
    function stopped() {
      ctx.active -= 1;
      if (ctx.active === 0) {
        logger.info("Exit.");
      }
    }
    this.promise = doFinally(runLoop(this, options, ctx), stopped);

    /*
function catchLoops(ctx) {
  ctx.loops.forEach(
    loop =>
      (loop.promise = loop.promise.catch(err => {
        logger.warn(
          "Error while running loop: %s",
          err.message || "unknown error!"
        );
      }))
  );
}*/
  }

  doSleep() {
    return new Promise(resolve => {
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
      await runCommands(
        loop.commands,
        loop.cwd,
        loop.onError,
        prefix,
        {},
        null,
        ctx
      );
    } else {
      const tmpDir = await tmpPromise.dir();
      try {
        await runCommands(
          loop.commands,
          tmpDir.path,
          loop.onError,
          prefix,
          {},
          null,
          ctx
        );
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

module.exports = { Loop };

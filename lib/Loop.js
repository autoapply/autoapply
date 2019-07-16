const fsExtra = require("fs-extra");
const tmpPromise = require("tmp-promise");

const {
  logger,
  loggerWithName,
  parseSleep,
  parseOnError,
  doFinally
} = require("./common");
const { Batch } = require("./Batch");
const { Command } = require("./Command");

class Loop {
  constructor(loop, name) {
    if (!loop.commands || !loop.commands.length) {
      throw new Error("no loop commands given!");
    }
    this.cwd = loop.cwd || null;
    this.sleep = parseSleep(loop.sleep);
    this.logger = loggerWithName(name);
    const onError = parseOnError(loop.onerror, "continue");
    const commands = loop.commands.map(cmd => new Command(cmd));
    this.batch = new Batch(name, commands, onError);
  }

  start(options, ctx) {
    ctx.active += 1;
    function stopped() {
      ctx.active -= 1;
      if (ctx.active === 0) {
        logger.info("Exit.");
      }
    }

    this.promise = this.runLoop(options, ctx);

    if (options.catchErrors) {
      this.promise = this.promise.catch(err => {
        this.logger.warn(
          "Error while running loop: %s",
          err.message || "unknown error!"
        );
      });
    }

    this.promise = doFinally(this.promise, stopped);
  }

  /**
   * Run the commands in the given loop until the program is stopped
   *
   * @param {object} options
   * @param {object} ctx
   */
  async runLoop(options, ctx) {
    let cur = 1;
    const loops = options.loops;
    while (ctx.running) {
      if (this.cwd) {
        await this.batch.run(this.cwd, {}, null);
      } else {
        const tmpDir = await tmpPromise.dir();
        try {
          await this.batch.run(tmpDir.path, {}, null);
        } finally {
          await fsExtra.remove(tmpDir.path);
          this.logger.debug("Deleted temporary directory.");
        }
      }

      if (loops && ++cur > loops) {
        break;
      }

      if (this.sleep) {
        this.logger.info("Sleeping for %ds...", this.sleep);
        await this.doSleep();
      } else {
        this.logger.debug("Not sleeping (sleep = 0)");
      }
    }
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
      this.logger.debug("Loop has been stopped.");
    }
  }
}

module.exports = { Loop };

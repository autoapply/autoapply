const { logger } = require("./common");

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
    this.loops.forEach(loop => loop.stop());
    let promise;
    if (this.server) {
      promise = new Promise(resolve => {
        this.server.close(err => {
          if (err) {
            logger.warn(
              "Could not stop server: %s",
              err.message || "unknown error!"
            );
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
    return Promise.all(this.loops.map(loop => loop.promise));
  }
}

module.exports = { Context };

class Context {
  constructor() {
    this.running = true;
    this.active = 0;
    this.loops = [];
    this.calls = [];
    this.server = null;
  }

  async stop() {
    this.running = false;

    this.loops.forEach(loop => loop.stop());

    if (this.server) {
      await this.server.stop();
      this.server = null;
    }

    await this.wait();
  }

  wait() {
    return Promise.all(this.loops.map(loop => loop.promise));
  }
}

module.exports = { Context };

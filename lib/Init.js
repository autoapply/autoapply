const { parseOnError } = require("./common");
const { Batch } = require("./Batch");
const { Command } = require("./Command");

class Init {
  constructor(init) {
    if (!init.commands || !init.commands.length) {
      throw new Error("no init commands given!");
    }
    this.cwd = init.cwd || ".";
    const onError = parseOnError(init.onerror, "fail");
    const commands = init.commands.map(cmd => new Command(cmd));
    this.batch = new Batch("Init", commands, onError);
  }

  async run() {
    await this.batch.run(this.cwd, {}, null);
  }
}

module.exports = { Init };

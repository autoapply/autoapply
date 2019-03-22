const { parseOnError } = require("./common");
const { Command } = require("./Command");

class Init {
  constructor(init) {
    if (!init.commands || !init.commands.length) {
      throw new Error("no init commands given!");
    }
    this.cwd = init.cwd || ".";
    this.onError = parseOnError(init.onerror, "fail");
    this.commands = init.commands.map(cmd => new Command(cmd));
  }
}

module.exports = { Init };

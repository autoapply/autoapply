const { loggerWithName } = require("./common");

class Batch {
  /**
   * @param {string} name
   * @param {Command[]} commands
   * @param {string} onerror
   */
  constructor(name, commands, onerror) {
    this.name = name;
    this.commands = commands;
    this.onerror = onerror;
    this.logger = loggerWithName(name);
  }

  /**
   * Run the given commands, one at a time
   *
   * @param {string} cwd
   * @param {object} env
   * @param {object} stdio
   */
  async run(cwd, env, stdio) {
    this.logger.debug("Executing in directory: %s", cwd);
    for (const command of this.commands) {
      if (command.command) {
        this.logger.info(
          "Executing command: %s",
          JSON.stringify(command.command)
        );
      } else {
        this.logger.info("Executing script...");
      }
      try {
        await command.run(cwd, env, stdio);
      } catch (e) {
        this.logger.debug("Command failed! %s", e.stack);
        if (e.code === "ENOENT") {
          this.logger.error("Command not found!");
        } else if (e.exitCode) {
          this.logger.error("Command exited with code %s", e.exitCode);
        } else if (e.message) {
          this.logger.error("Command execution failed: %s", e.message);
        } else {
          this.logger.error("Command execution failed!");
        }
        if (this.onerror === "fail") {
          throw e;
        } else {
          if (this.onerror === "ignore") {
            continue;
          } else if (this.onerror === "continue") {
            // stop any remaining commands and continue with the next loop iteration
            break;
          } else {
            throw new Error("invalid onerror value!");
          }
        }
      }
    }
  }
}

module.exports = { Batch };

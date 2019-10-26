const { spawn } = require("child_process");

const fsExtra = require("fs-extra");
const tmpPromise = require("tmp-promise");

const { logger, isObject, parseStdio } = require("./common");

class Command {
  constructor(command) {
    if (isObject(command)) {
      if (command["command"] && command["script"]) {
        throw new Error("cannot combine command and script!");
      }
      if (command["script"]) {
        this.script = command["script"];
      } else {
        this.command = command["command"];
      }
      this.stdout = parseStdio(command["stdout"]);
      this.stderr = parseStdio(command["stderr"]);
    } else {
      this.command = command;
      this.stdout = "pipe";
      this.stderr = "pipe";
    }
    if (this.script) {
      if (typeof this.script === "string") {
        this.script = this.script.trim();
        if (!this.script) {
          throw new Error("script is empty!");
        }
      } else {
        throw new Error(`invalid script: ${this.script}`);
      }
    } else {
      if (typeof this.command === "string") {
        this.command = this.command.trim();
        if (!this.command) {
          throw new Error("command is empty!");
        }
      } else if (Array.isArray(this.command)) {
        if (!this.command.length || !this.command[0]) {
          throw new Error(`invalid command: ${this.command}`);
        }
        for (const cmd of this.command) {
          if (typeof cmd !== "string") {
            throw new Error(`invalid command: ${this.command}`);
          }
        }
      } else {
        throw new Error(`invalid command: ${this.command}`);
      }
    }
  }

  async run(cwd, env, stdio) {
    const shell =
      typeof this.script === "string" || typeof this.command === "string";
    const options = {
      cwd: cwd,
      env: env == null ? process.env : env,
      stdio: ["ignore", this.stdout, this.stderr],
      shell: shell
    };

    if (!stdio) {
      stdio = {
        stdout: data => process.stdout.write(data),
        stderr: data => process.stderr.write(data)
      };
    }

    if (this.script) {
      const tmp = await tmpPromise.file({ mode: 0o700 });
      try {
        await fsExtra.writeFile(tmp.path, this.script, "utf8");
        await fsExtra.close(tmp.fd);

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
        await this._spawn(
          this.command[0],
          this.command.slice(1),
          options,
          stdio
        );
      }
    }
  }

  _spawn(cmd, args, options, stdio) {
    return new Promise((resolve, reject) => {
      const process = spawn(cmd, args, options);
      const { stdout, stderr } = process;
      if (stdout) {
        stdout.on("data", data => stdio.stdout(data));
      }
      if (stderr) {
        stderr.on("data", data => stdio.stderr(data));
      }
      process.on("error", reject);
      process.on("close", code => {
        if (code === 0) {
          resolve();
        } else {
          const error = new Error(`command failed with code ${code}`);
          error.exitCode = code;
          reject(error);
        }
      });
    });
  }
}

module.exports = { Command };

const http = require("http");

const {
  runCommands,
  parseMethods,
  parseHeaders,
  parseBoolean
} = require("./common");
const { Command } = require("./Command");

class Call {
  constructor(call) {
    if (!call.path) {
      throw new Error("call: no path given!");
    }
    if (!call.commands || !call.commands.length) {
      throw new Error("call: no commands given!");
    }
    this.path = call.path;
    this.methods = parseMethods(call.methods);
    this.headers = parseHeaders(call.headers);
    this.stream = parseBoolean(call.stream, false);
    this.cwd = call.cwd || null;
    this.commands = call.commands.map(cmd => new Command(cmd));
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
    env["REQUEST_METHOD"] = request.method;
    env["REQUEST_URI"] = request.url;
    env["REMOTE_ADDR"] = request.socket.address().address;
    for (const [name, value] of Object.entries(request.headers)) {
      const normalized = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      env[`HTTP_${normalized}`] = value.toString();
    }
    const prefix = `Call ${this.path}: `;
    if (this.stream) {
      const stdio = {
        stdout: data => response.write(data),
        stderr: data => response.write(data)
      };
      response.writeHead(200, http.STATUS_CODES[200]);
      await runCommands(
        this.commands,
        this.cwd,
        "continue",
        prefix,
        env,
        stdio,
        ctx
      );
    } else {
      let str = "";
      const stdio = {
        stdout: data => (str += data),
        stderr: data => (str += data)
      };
      let err = null;
      try {
        await runCommands(
          this.commands,
          this.cwd,
          "fail",
          prefix,
          env,
          stdio,
          ctx
        );
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

module.exports = { Call };

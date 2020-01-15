const http = require("http");
const process = require("process");

const {
  logger,
  errorMessage,
  parseMethods,
  parseHeaders,
  parseAuthentication,
  parseBoolean,
  parseOnError
} = require("./common");
const { Batch } = require("./Batch");
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
    this.auth = parseAuthentication(call.authentication);
    this.stream = parseBoolean(call.stream, false);
    this.onError = parseOnError(call.onerror, "fail");
    this.cwd = call.cwd || null;
    this.commands = call.commands.map(cmd => new Command(cmd));
  }

  async handle(request, response, query) {
    let username = null;
    if (this.auth) {
      username = this.authenticate(request);
      if (username == null) {
        response.setHeader("WWW-Authenticate", 'Basic realm="Protected call"');
        response.writeHead(401, http.STATUS_CODES[401]);
        response.end("Unauthorized!");
        return;
      }
    }

    if (this.methods.length && this.methods.indexOf(request.method) < 0) {
      response.writeHead(405, http.STATUS_CODES[405]);
      response.end(`Unsupported method: ${request.method}`);
      return;
    }

    for (const [name, value] of Object.entries(this.headers)) {
      response.setHeader(name, value);
    }

    const env = buildEnv(request, query, username);

    const name = `Call ${this.path}`;
    if (this.stream) {
      const stdio = {
        stdout: data => response.write(data),
        stderr: data => response.write(data)
      };
      response.writeHead(200, http.STATUS_CODES[200]);
      try {
        const batch = new Batch(name, this.commands, this.onError);
        await batch.run(this.cwd, env, stdio);
      } catch (e) {
        logger.debug("%s failed: %s", name, errorMessage(e));
      }
    } else {
      const buffers = [];
      const stdio = {
        stdout: data => buffers.push(data),
        stderr: data => buffers.push(data)
      };
      let err = null;
      try {
        const batch = new Batch(name, this.commands, this.onError);
        await batch.run(this.cwd, env, stdio);
      } catch (e) {
        err = e;
      }
      if (err != null) {
        if (err.exitCode) {
          response.setHeader("X-Exit-Code", `${err.exitCode}`);
        }
        response.writeHead(500, http.STATUS_CODES[500]);
      } else {
        response.writeHead(200, http.STATUS_CODES[200]);
      }
      response.write(Buffer.concat(buffers));
    }
  }

  authenticate(request) {
    const { headers } = request;
    const header = headers && headers["authorization"];
    if (typeof header === "string" && header.startsWith("Basic ")) {
      const key = header.substr(6);
      if (Object.hasOwnProperty.call(this.auth, key)) {
        return this.auth[key];
      }
    }
    return null;
  }
}

function buildEnv(request, query, username) {
  const env = Object.assign({}, process.env);

  env["REQUEST_METHOD"] = request.method;
  env["REQUEST_URI"] = request.url;
  env["REMOTE_ADDR"] = request.socket.address().address;

  for (const [name, value] of Object.entries(request.headers)) {
    if (!skipHeader(name)) {
      env[`HTTP_${normalize(name)}`] = value.toString();
    }
  }

  for (const [name, value] of Object.entries(query)) {
    env[`QUERY_${normalize(name)}`] = value.toString();
  }

  if (username != null) {
    env["REQUEST_USERNAME"] = username;
  }

  return env;
}

function skipHeader(name) {
  return name === "authorization";
}

function normalize(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

module.exports = { Call };

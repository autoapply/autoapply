const http = require("http");

const { logger } = require("./common");

class Server {
  constructor(server, calls) {
    this.port = (server ? server.port : 0) || 3000;
    this.calls = calls;
    this.server = null;
  }

  start() {
    logger.debug("Starting server...");
    this.server = http.createServer((req, res) =>
      this.handleRequest(req, res, this.ctx)
    );
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, err => {
        if (err) {
          reject(err);
        } else {
          logger.info(`Server is listening on port ${this.port}...`);
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise(resolve => {
      this.server.close(err => {
        if (err) {
          logger.warn(
            "Could not stop server: %s",
            err.message || "unknown error!"
          );
        }
        resolve();
      });
    });
  }

  /**
   * @param {http.IncomingMessage} request
   * @param {http.ServerResponse} response
   */
  async handleRequest(request, response) {
    logger.debug("Request received: %s %s", request.method, request.url);

    let handler = null;
    if (request.url === "/healthz") {
      handler = this.healthz;
    } else {
      const call = this.calls.find(call => call.path === request.url);
      if (call) {
        handler = call.handle.bind(call);
      }
    }

    if (handler) {
      try {
        await handler(request, response);
      } catch (e) {
        logger.info(
          "Error handling request: %s -- %s",
          request.url,
          e.message || "unknown error!"
        );
      } finally {
        response.end();
      }
    } else {
      response.writeHead(404, http.STATUS_CODES[404]);
      response.end("Not found!");
    }
  }

  healthz(request, response) {
    if (request.method === "HEAD") {
      response.writeHead(200, http.STATUS_CODES[200]);
      response.end();
    } else if (request.method === "GET") {
      response.end("OK");
    } else {
      response.writeHead(405, http.STATUS_CODES[405]);
      response.end("Only GET or HEAD supported!");
    }
  }
}

module.exports = { Server };

const http = require("http");

const { logger, runCommands } = require("./common");
const { Context } = require("./Context");
const { Init } = require("./Init");
const { Loop } = require("./Loop");
const { Call } = require("./Call");

/**
 * Run the loops given in the configuration
 *
 * @param {object} config
 * @param {object} options
 * @returns {Promise<Context>} the context
 */
async function run(config, options = {}) {
  const ctx = new Context();

  const init = config.init ? new Init(config.init) : null;

  if (!config.loop && !config.call) {
    throw new Error(
      "invalid configuration, neither loop nor call section given!"
    );
  }

  if (Array.isArray(config.loop)) {
    config.loop.forEach(loop => ctx.loops.push(new Loop(loop)));
  } else if (config.loop) {
    ctx.loops.push(new Loop(config.loop));
  }

  if (Array.isArray(config.call)) {
    config.call.forEach(call => ctx.calls.push(new Call(call)));
  } else if (config.call) {
    ctx.calls.push(new Call(config.call));
  }

  if (ctx.loops.length === 1) {
    ctx.loops[0].name = "Loop";
  } else {
    ctx.loops.forEach((loop, idx) => (loop.name = `Loop ${idx + 1}`));
  }

  if (ctx.calls.length || (config.server && config.server.enabled !== false)) {
    const port = (config.server ? config.server.port : 0) || 3000;
    ctx.server = await startServer(port, ctx);
  } else {
    logger.debug("Server is disabled");
  }

  if (init) {
    logger.info("Running init commands...");
    await runCommands(
      init.commands,
      init.cwd,
      init.onError,
      "Init: ",
      {},
      null,
      ctx
    );
  } else {
    logger.info("No init commands.");
  }

  logger.info("Running loop commands...");
  ctx.loops.forEach(loop => loop.start(options, ctx));

  return ctx;
}

function startServer(port, ctx) {
  logger.debug("Starting server...");
  const server = http.createServer((req, res) => handleRequest(req, res, ctx));
  return new Promise((resolve, reject) => {
    server.listen(port, err => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Server is listening on port ${port}...`);
        resolve(server);
      }
    });
  });
}

/**
 * @param {http.IncomingMessage} request
 * @param {http.ServerResponse} response
 * @param {Context} ctx
 */
async function handleRequest(request, response, ctx) {
  logger.debug("Request received: %s %s", request.method, request.url);

  let handler = null;
  if (request.url === "/healthz") {
    handler = (request, response) => {
      if (request.method === "HEAD") {
        response.writeHead(200, http.STATUS_CODES[200]);
        response.end();
      } else if (request.method === "GET") {
        response.end("OK");
      } else {
        response.writeHead(405, http.STATUS_CODES[405]);
        response.end("Only GET or HEAD supported!");
      }
    };
  } else {
    const call = ctx.calls.find(call => call.path === request.url);
    if (call) {
      handler = call.call.bind(call);
    }
  }

  if (handler) {
    try {
      await handler(request, response, ctx);
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

module.exports = { run };

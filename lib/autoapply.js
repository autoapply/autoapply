const { logger } = require("./common");
const { Context } = require("./Context");
const { Server } = require("./Server");
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
  const ctx = createContext(config);

  if (ctx.server) {
    await ctx.server.start();
  } else {
    logger.debug("Server is disabled");
  }

  if (ctx.init) {
    logger.info("Running init commands...");
    await ctx.init.run();
  } else {
    logger.info("No init commands.");
  }

  logger.info("Running loop commands...");
  ctx.loops.forEach(loop => loop.start(options, ctx));

  return ctx;
}

function createContext(config) {
  if (!config.loop && !config.call) {
    throw new Error(
      "invalid configuration, neither loop nor call section given!"
    );
  }

  const ctx = new Context();

  ctx.init = config.init ? new Init(config.init) : null;

  if (Array.isArray(config.loop)) {
    config.loop.forEach((loop, idx) =>
      ctx.loops.push(new Loop(loop, `Loop ${idx + 1}`))
    );
  } else if (config.loop) {
    ctx.loops.push(new Loop(config.loop, "Loop"));
  }

  if (Array.isArray(config.call)) {
    config.call.forEach(call => ctx.calls.push(new Call(call)));
  } else if (config.call) {
    ctx.calls.push(new Call(config.call));
  }

  if (ctx.calls.length || (config.server && config.server.enabled)) {
    ctx.server = new Server(config.server, ctx.calls);
  }

  return ctx;
}

module.exports = { run };

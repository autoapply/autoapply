const { logger, runCommands } = require("./common");
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
    ctx.server = new Server(port, ctx);
    await ctx.server.start();
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

module.exports = { run };

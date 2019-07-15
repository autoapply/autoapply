#!/usr/bin/env node

const process = require("process");

const argparse = require("argparse");
const fsExtra = require("fs-extra");
const yaml = require("js-yaml");
const winston = require("winston");

const { logger } = require("../lib/common");
const { run } = require("../lib/autoapply");

const pkg = require("../package.json");

/**
 * @param {string[]|*} argv the program arguments
 * @returns {Promise<Context>} the context
 */
async function main(argv = null) {
  logger.configure({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.splat(),
      winston.format.printf(
        info => `${info.timestamp} ${info.level} ${info.message}`
      )
    ),
    transports: [new winston.transports.Console()]
  });

  const parser = new argparse.ArgumentParser({
    prog: pkg.name,
    version: pkg.version,
    addHelp: true,
    description: pkg.description
  });
  parser.addArgument(["-d", "--debug"], {
    action: "storeTrue",
    help: "Show debugging output"
  });
  parser.addArgument(["config"], {
    metavar: "<configuration>",
    help: "Configuration file to use"
  });

  const args = parser.parseArgs(argv);
  if (args.debug && logger.level === "info") {
    logger.level = "debug";
  }

  let config;
  try {
    if (args.config.startsWith("env:")) {
      const envvar = args.config.substr("env:".length);
      if (!envvar) {
        throw new Error("empty environment variable name!");
      }
      if (!Object.prototype.hasOwnProperty.call(process.env, envvar)) {
        throw new Error(`environment variable does not exist: ${envvar}`);
      }
      config = yaml.safeLoad(process.env[envvar]);
    } else {
      const content = await fsExtra.readFile(args.config);
      config = yaml.safeLoad(content);
    }
    if (!config) {
      throw new Error("configuration is empty!");
    }
    if (args.debug) {
      logger.debug("Loaded configuration: %s", JSON.stringify(config, null, 2));
    }
  } catch (e) {
    if (args.debug) {
      throw new DebugError(e);
    } else {
      throw e;
    }
  }

  return run(config, args);
}

class DebugError extends Error {}

if (require.main === module) {
  main().catch(err => {
    process.exitCode = 1;
    if (err instanceof DebugError) {
      logger.error(err.stack);
    } else {
      logger.error(err.message || "unknown error!");
    }
  });
}

module.exports.main = main;

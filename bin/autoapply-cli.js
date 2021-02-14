#!/usr/bin/env node

const process = require("process");

const argparse = require("argparse");
const { readFile } = require("fs-extra");
const yaml = require("js-yaml");
const winston = require("winston");

const { logger } = require("../lib/common");
const { run } = require("../lib/autoapply");

const pkg = require("../package.json");

/**
 * @param {string[]|*} argv the program arguments
 * @returns {Promise<Context>} the context
 */
async function main(argv, catchErrors = true) {
  let debug = false;
  try {
    configureLogger();

    const args = parseArguments(argv);
    debug = args.debug;

    if (debug && logger.level === "info") {
      logger.level = "debug";
    }

    return await start(args);
  } catch (e) {
    if (catchErrors) {
      process.exitCode = 1;
      if (debug) {
        logger.error(e.stack);
      } else {
        logger.error(e.message || "unknown error!");
      }
    } else {
      throw e;
    }
  }
}

function configureLogger() {
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
}

function parseArguments(argv) {
  const parser = new argparse.ArgumentParser({
    prog: pkg.name,
    add_help: true,
    description: pkg.description
  });
  parser.add_argument("-v", "--version", {
    action: "version",
    version: pkg.version,
    help: "show version number and exit"
  });
  parser.add_argument("-d", "--debug", {
    action: "store_true",
    help: "show debugging output"
  });
  parser.add_argument("config", {
    metavar: "<configuration>",
    help: "configuration file to use"
  });
  return parser.parse_args(argv);
}

async function start(args) {
  let config;
  if (args.config.startsWith("env:")) {
    const envvar = args.config.substr("env:".length);
    if (!envvar) {
      throw new Error("empty environment variable name!");
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, envvar)) {
      throw new Error(`environment variable does not exist: ${envvar}`);
    }
    config = yaml.load(process.env[envvar]);
  } else {
    const content = await readFile(args.config);
    config = yaml.load(content);
  }

  if (!config) {
    throw new Error("configuration is empty!");
  }

  if (args.debug) {
    logger.debug("Loaded configuration: %s", JSON.stringify(config, null, 2));
  }

  return run(config, { catchErrors: true });
}

if (require.main === module) {
  main();
}

module.exports = { main };

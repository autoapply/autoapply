"use strict";

const winston = require("winston");

const logger = winston.createLogger();

/**
 * Run the given commands, one at a time
 *
 * @param {Command[]} commands
 * @param {string} cwd
 * @param {string} onerror
 * @param {string} prefix
 * @param {object} env
 * @param {object} stdio
 * @param {Context} ctx
 */
async function runCommands(commands, cwd, onerror, prefix, env, stdio, ctx) {
  logger.debug("Executing in directory: %s", cwd);
  for (const command of commands) {
    if (!ctx.running) {
      break;
    }
    if (command.command) {
      logger.info(
        `${prefix}Executing command: %s`,
        JSON.stringify(command.command)
      );
    } else {
      logger.info(`${prefix}Executing script...`);
    }
    try {
      await command.run(cwd, env, stdio);
    } catch (e) {
      logger.silly("Command failed: %s", e);
      if (e.code === "ENOENT") {
        logger.error(`${prefix}Command not found!`);
      } else if (e.code) {
        logger.error(`${prefix}Command exited with code ${e.code}`);
      } else if (e.message) {
        logger.error(`${prefix}${e.message}`);
      } else {
        logger.error(`${prefix}Command execution failed!`);
      }
      if (onerror === "fail") {
        throw e;
      } else {
        if (onerror === "ignore") {
          continue;
        } else if (onerror === "continue") {
          // stop any remaining commands and continue with the next loop iteration
          break;
        } else {
          throw new Error("invalid onerror value!");
        }
      }
    }
  }
}

function isObject(value) {
  return value && typeof value === "object" && value.constructor === Object;
}

function doFinally(promise, callback) {
  function onThen(result) {
    callback();
    return result;
  }
  function onCatch(err) {
    callback();
    throw err;
  }
  return promise.then(onThen, onCatch);
}

function parseOnError(value, defaultValue) {
  if (!value) {
    return defaultValue;
  } else if (value === "ignore" || value === "continue" || value === "fail") {
    return value;
  } else {
    throw new Error(`invalid onerror value: ${value}`);
  }
}

function parseSleep(value) {
  if (value === 0 || value === "0") {
    return 0;
  } else if (!value || value < 0) {
    logger.debug("Using default sleep value!");
    return 60;
  } else {
    const sleep = parseFloat(value);
    if (sleep || sleep === 0) {
      return sleep;
    } else {
      throw new Error(`invalid sleep value: ${value}`);
    }
  }
}

function parseStdio(value) {
  if (!value) {
    return "pipe";
  } else if (value === "ignore" || value === "pipe") {
    return value;
  } else {
    throw new Error(`invalid stdio value: ${value}`);
  }
}

function parseMethods(methods) {
  if (!methods) {
    return ["GET"];
  } else if (Array.isArray(methods)) {
    if (methods.length === 0 || (methods.length === 1 && methods[0] === "*")) {
      // accept all methods
      return [];
    } else {
      return methods.map(str => {
        if (typeof str !== "string") {
          throw new Error(`method is not a string: ${str}`);
        }
        return str.toUpperCase();
      });
    }
  } else {
    throw new Error(`invalid methods value: ${methods}`);
  }
}

function parseHeaders(headers) {
  if (!headers) {
    return {};
  } else if (Array.isArray(headers)) {
    return headers.reduce((map, obj) => {
      if (!obj.name || typeof obj.name !== "string") {
        throw new Error(`header name is not a string: ${obj.name}`);
      }
      if (!obj.value || typeof obj.value !== "string") {
        throw new Error(`header value is not a string: ${obj.value}`);
      }
      map[obj.name] = obj.value;
      return map;
    }, {});
  } else if (isObject(headers)) {
    for (const value of Object.values(headers)) {
      if (typeof value !== "string") {
        throw new Error(`header value is not a string: ${value}`);
      }
    }
    return headers;
  } else {
    throw new Error(`invalid header value: ${headers}`);
  }
}

function parseBoolean(value, def) {
  if (value === true || value === "true") {
    return true;
  } else if (value === false || value === "false") {
    return false;
  } else {
    return def;
  }
}

module.exports = {
  logger,
  runCommands,
  isObject,
  doFinally,
  parseOnError,
  parseSleep,
  parseStdio,
  parseMethods,
  parseHeaders,
  parseBoolean
};

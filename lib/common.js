"use strict";

const process = require("process");
const { readFileSync } = require("fs");

const winston = require("winston");

const logger = winston.createLogger();

function loggerWithName(name) {
  return {
    debug: (message, ...meta) => logger.debug(`${name}: ${message}`, ...meta),
    info: (message, ...meta) => logger.info(`${name}: ${message}`, ...meta),
    warn: (message, ...meta) => logger.warn(`${name}: ${message}`, ...meta),
    error: (message, ...meta) => logger.error(`${name}: ${message}`, ...meta)
  };
}

function errorMessage(err) {
  return (err && err.message) || "unknown error!";
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

function parseAuthentication(authentication) {
  function parseStr(str = "") {
    const map = {};
    for (const line of str.split(/\n|\r\n/)) {
      if (line.length > 0 && !line.startsWith("#")) {
        const [username, password] = line.split(":", 2);
        if (!username) {
          throw new Error("username is missing or invalid!");
        } else if (!password) {
          throw new Error("password is missing or invalid!");
        }
        const key = `${username}:${password}`;
        map[Buffer.from(key).toString("base64")] = username;
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  }

  if (!authentication) {
    return null;
  } else if (typeof authentication.file === "string") {
    let content;
    try {
      content = readFileSync(authentication.file, "utf8");
    } catch (e) {
      throw new Error(
        `could not read authentication file: ${authentication.file}`
      );
    }
    const auth = parseStr(content);
    if (!auth) {
      throw new Error(`no authentication entries: ${authentication.file}`);
    }
    return auth;
  } else if (typeof authentication.env === "string") {
    const content = process.env[authentication.env];
    const auth = parseStr(content);
    if (!auth) {
      throw new Error(`no authentication entries: ${authentication.env}`);
    }
    return auth;
  } else if (Array.isArray(authentication)) {
    return authentication.length === 0
      ? null
      : authentication.reduce((map, obj) => {
          if (!obj.username || typeof obj.username !== "string") {
            throw new Error("username is missing or invalid!");
          } else if (!obj.password || typeof obj.password !== "string") {
            throw new Error("password is missing or invalid!");
          }
          const key = `${obj.username}:${obj.password}`;
          map[Buffer.from(key).toString("base64")] = obj.username;
          return map;
        }, {});
  } else {
    throw new Error(
      `invalid authentication value: ${JSON.stringify(authentication)}`
    );
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
  loggerWithName,
  errorMessage,
  isObject,
  doFinally,
  parseOnError,
  parseSleep,
  parseStdio,
  parseMethods,
  parseHeaders,
  parseAuthentication,
  parseBoolean
};

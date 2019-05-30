const winston = require("winston");

const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;

const { logger } = require("../lib/common");
const { Context } = require("../lib/Context");

logger.configure({
  level: "off",
  transports: [new winston.transports.Console()]
});

describe("Context", () => {
  it("should log a warning when the server cannot be stopped", () => {
    const ctx = new Context();
    ctx.server = {
      close: callback => callback(new Error("Failed!"))
    };
    ctx.stop();
  });
});

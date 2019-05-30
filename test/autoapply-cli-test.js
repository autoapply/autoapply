const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const path = require("path");
const process = require("process");
const yaml = require("js-yaml");
const tmp = require("tmp");
const fsExtra = require("fs-extra");

process.env.LOG_LEVEL = "-1";

const { main } = require("../bin/autoapply-cli");

function interceptStdio() {
  const stdout = process.stdout.write;
  const stderr = process.stderr.write;
  process.stdout.write = () => {};
  process.stderr.write = () => {};
  return () => {
    process.stdout.write = stdout;
    process.stderr.write = stderr;
  };
}

describe("autoapply-cli", () => {
  it("should execute the commands given in the environment variable", () => {
    const envName = `AUTOAPPLY_TEST_${new Date().getTime()}`;
    process.env.LOG_LEVEL = "info";
    process.env[envName] =
      "loop:\n  onerror: fail\n  commands: [ 'ls nonexisting' ]";
    const reset = interceptStdio();
    return main(["-d", `env:${envName}`])
      .then(ctx => ctx.stop())
      .then(() => reset())
      .then(() => process.removeAllListeners("SIGINT"))
      .then(() => (process.env.LOG_LEVEL = "-1"));
  });

  it("should execute the commands given in the config file", () => {
    const d = tmp.dirSync();
    const config = {
      loop: {
        onerror: "fail",
        commands: [["false"]]
      }
    };
    const configFile = path.join(d.name, "config.yaml");
    fsExtra.writeFileSync(configFile, yaml.safeDump(config));
    return main([configFile])
      .then(ctx => ctx.stop())
      .then(() => process.removeAllListeners("SIGINT"))
      .then(() => fsExtra.removeSync(d.name));
  });

  it("should throw an error when an empty config is given", () => {
    const d = tmp.dirSync();
    const config = {};
    const configFile = path.join(d.name, "config.yaml");
    fsExtra.writeFileSync(configFile, yaml.safeDump(config));
    return expect(main([configFile])).to.be.rejectedWith(
      "invalid configuration"
    );
  });

  it("should throw an error when no environment variable name is given", () => {
    return expect(main(["env:"])).to.be.rejectedWith(
      "empty environment variable name"
    );
  });

  it("should throw an error when the environment variable is missing", () => {
    return expect(main(["env:DOESNTEXIST"])).to.be.rejectedWith(
      "environment variable does not exist"
    );
  });

  it("should throw a DebugError when an empty config is given", () => {
    const d = tmp.dirSync();
    const config = {};
    const configFile = path.join(d.name, "config.yaml");
    fsExtra.writeFileSync(configFile, yaml.safeDump(config));
    return expect(main(["-d", configFile])).to.be.rejectedWith(
      "invalid configuration"
    );
  });
});

const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const process = require("process");
const yaml = require("js-yaml");
const tmp = require("tmp");
const fsExtra = require("fs-extra");

process.env.LOG_LEVEL = "-1";

tmp.setGracefulCleanup();

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

function writeConfig(config) {
  const file = tmp.fileSync({ postfix: ".yaml" });
  fsExtra.writeFileSync(file.name, yaml.dump(config));
  return file.name;
}

describe("autoapply-cli", () => {
  it("should execute the commands given in the environment variable", () => {
    const envName = `AUTOAPPLY_TEST_${new Date().getTime()}`;
    process.env.LOG_LEVEL = "info";
    process.env[envName] =
      "loop:\n  onerror: fail\n  commands: [ 'ls nonexisting' ]";
    const reset = interceptStdio();
    return main(["-d", `env:${envName}`], false)
      .then(ctx => ctx.stop())
      .then(() => reset())
      .then(() => (process.env.LOG_LEVEL = "-1"));
  });

  it("should execute the commands given in the config file", () => {
    const configFile = writeConfig({
      loop: {
        onerror: "fail",
        commands: [["false"]]
      }
    });
    return main([configFile], false).then(ctx => ctx.stop());
  });

  it("should not throw an error when catchErrors is true", () => {
    return main(["."], true);
  });

  it("should not throw an error when catchErrors is true (debug)", () => {
    return main(["--debug", "."], true);
  });

  it("should throw an error when an empty config is given", () => {
    const configFile = writeConfig("");
    return expect(main([configFile], false)).to.be.rejectedWith(
      "configuration is empty!"
    );
  });

  it("should throw an error when an empty object config is given", () => {
    const configFile = writeConfig({});
    return expect(main([configFile], false)).to.be.rejectedWith(
      "invalid configuration"
    );
  });

  it("should throw an error when no environment variable name is given", () => {
    return expect(main(["env:"], false)).to.be.rejectedWith(
      "empty environment variable name"
    );
  });

  it("should throw an error when the environment variable is missing", () => {
    return expect(main(["env:DOESNTEXIST"], false)).to.be.rejectedWith(
      "environment variable does not exist"
    );
  });
});

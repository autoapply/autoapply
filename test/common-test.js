const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const expect = chai.expect;

const process = require("process");
const { writeFileSync } = require("fs");
const tmp = require("tmp");

const { errorMessage, parseAuthentication } = require("../lib/common");

describe("common", () => {
  describe("errorMessage", () => {
    it("should return a default message (1)", () => {
      expect(errorMessage(null)).to.not.be.empty;
    });

    it("should return a default message (2)", () => {
      expect(errorMessage({})).to.not.be.empty;
    });
  });

  describe("parseAuthentication", () => {
    it("should throw an error on invalid input (1)", () => {
      expect(() => parseAuthentication({})).to.throw(
        /invalid authentication value/
      );
    });

    it("should throw an error on invalid input (2)", () => {
      expect(() => parseAuthentication([{}])).to.throw(
        /username is missing or invalid/
      );
    });

    it("should throw an error on invalid input (3)", () => {
      expect(() => parseAuthentication([{ username: 1 }])).to.throw(
        /username is missing or invalid/
      );
    });

    it("should throw an error on invalid input (4)", () => {
      expect(() => parseAuthentication([{ username: "x" }])).to.throw(
        /password is missing or invalid/
      );
    });

    it("should throw an error on invalid input (5)", () => {
      expect(() =>
        parseAuthentication([{ username: "x", password: "" }])
      ).to.throw(/password is missing or invalid/);
    });

    it("should throw an error on invalid input (6)", () => {
      expect(() => parseAuthentication({ file: "x" })).to.throw(
        "could not read authentication file: x"
      );
    });

    it("should successfully parse the input (1)", () => {
      const auth = parseAuthentication([]);
      expect(auth).to.be.null;
    });

    it("should successfully parse the input (2)", () => {
      const auth = parseAuthentication([
        { username: "username", password: "password" }
      ]);
      expect(auth).to.deep.equal({ "dXNlcm5hbWU6cGFzc3dvcmQ=": "username" });
    });

    it("should successfully parse the input from a file (1)", () => {
      const file = tmp.fileSync();
      try {
        writeFileSync(file.name, "# comment\n\nusername:password\n");

        const auth = parseAuthentication({ file: file.name });
        expect(auth).to.deep.equal({ "dXNlcm5hbWU6cGFzc3dvcmQ=": "username" });
      } finally {
        file.removeCallback();
      }
    });

    it("should successfully parse the input from a file (2)", () => {
      const file = tmp.fileSync();
      try {
        writeFileSync(file.name, "username:password\nusername2:password");

        const auth = parseAuthentication({ file: file.name });
        expect(auth).to.deep.equal({
          "dXNlcm5hbWU6cGFzc3dvcmQ=": "username",
          dXNlcm5hbWUyOnBhc3N3b3Jk: "username2"
        });
      } finally {
        file.removeCallback();
      }
    });

    it("should throw an error when file input is invalid", () => {
      const file = tmp.fileSync();
      try {
        writeFileSync(file.name, "");

        expect(() => parseAuthentication({ file: file.name })).to.throw(
          /no authentication entries/
        );
      } finally {
        file.removeCallback();
      }
    });

    it("should throw an error when environment input is invalid (1)", () => {
      const envName = `COMMON_TEST_${new Date().getTime()}`;
      process.env[envName] = ":password";

      expect(() => parseAuthentication({ env: envName })).to.throw(
        "username is missing or invalid!"
      );
    });

    it("should throw an error when environment input is invalid (2)", () => {
      const envName = `COMMON_TEST_${new Date().getTime()}`;
      process.env[envName] = "username:";

      expect(() => parseAuthentication({ env: envName })).to.throw(
        "password is missing or invalid!"
      );
    });

    it("should throw an error when environment input is invalid (3)", () => {
      const envName = `INVALID_${new Date().getTime()}`;

      expect(() => parseAuthentication({ env: envName })).to.throw(
        /no authentication entries/
      );
    });

    it("should successfully parse the input from the environment", () => {
      const envName = `COMMON_TEST_${new Date().getTime()}`;
      process.env[envName] = "username:password";

      const auth = parseAuthentication({ env: envName });
      expect(auth).to.deep.equal({ "dXNlcm5hbWU6cGFzc3dvcmQ=": "username" });
    });
  });
});

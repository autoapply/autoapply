const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const expect = chai.expect;

const { Init } = require("../lib/Init");

describe("Init", () => {
  it("should throw an error on missing commands", () => {
    expect(() => new Init({})).to.throw;
  });

  it("should throw an error on empty commands", () => {
    expect(() => new Init({ commands: [] })).to.throw;
  });
});

const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const expect = chai.expect;

const { Loop } = require("../lib/Loop");

describe("Loop", () => {
  it("should throw an error on missing commands", () => {
    expect(() => new Loop({})).to.throw("no loop commands given!");
  });

  it("should throw an error on empty commands", () => {
    expect(() => new Loop({ commands: [] })).to.throw(
      "no loop commands given!"
    );
  });
});

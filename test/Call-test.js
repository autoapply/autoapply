const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const expect = chai.expect;

const { Call } = require("../lib/Call");

describe("Call", () => {
  it("should throw an error on missing commands", () => {
    expect(() => new Call({ path: "/" })).to.throw("call: no commands given!");
  });

  it("should throw an error on empty commands", () => {
    expect(() => new Call({ path: "/", commands: [] })).to.throw(
      "call: no commands given!"
    );
  });
});

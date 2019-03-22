"use strict";

const mocha = require("mocha");
const describe = mocha.describe;
const it = mocha.it;
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const chaiHttp = require("chai-http");
const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiHttp);

const path = require("path");
const process = require("process");
const yaml = require("js-yaml");
const tmp = require("tmp");
const fsExtra = require("fs-extra");

const autoapply = require("../bin/autoapply");

process.env.LOG_LEVEL = "-1";

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

describe("autoapply", () => {
  it("should execute the commands given in the environment variable", () => {
    const envName = `AUTOAPPLY_TEST_${new Date().getTime()}`;
    process.env.LOG_LEVEL = "info";
    process.env[envName] =
      "loop:\n  onerror: fail\n  commands: [ 'ls nonexisting' ]";
    const reset = interceptStdio();
    return autoapply
      .main(["-d", `env:${envName}`])
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
    return autoapply
      .main([configFile])
      .then(ctx => ctx.stop())
      .then(() => process.removeAllListeners("SIGINT"))
      .then(() => fsExtra.removeSync(d.name));
  });

  it("should fail when an invalid onerror is given", () => {
    const config = {
      loop: {
        commands: ["ls"],
        onerror: "x"
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "invalid onerror value: x"
    );
  });

  it("should fail when an invalid sleep is given", () => {
    const config = {
      loop: {
        commands: ["ls"],
        sleep: "x"
      }
    };
    return expect(autoapply.run(config, { loops: 1 })).to.be.rejectedWith(
      Error,
      "invalid sleep value: x"
    );
  });

  it("should fail when an invalid stdout is given", () => {
    const config = {
      loop: {
        commands: [
          {
            command: "ls",
            stdout: "unknown"
          }
        ]
      }
    };
    return expect(autoapply.run(config, { loops: 1 })).to.be.rejectedWith(
      Error,
      "invalid stdio"
    );
  });

  it("should fail when no commands are given", () => {
    return expect(autoapply.run({})).to.be.rejectedWith(
      Error,
      "invalid configuration, neither loop nor call section given!"
    );
  });

  it("should fail when an empty command is given", () => {
    const config = {
      loop: {
        commands: ["ls", [""]]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "invalid command: "
    );
  });

  it("should fail when a blank command is given", () => {
    const config = {
      loop: {
        commands: [" "]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "command is empty!"
    );
  });

  it("should fail when a blank script is given", () => {
    const config = {
      loop: {
        commands: [{ script: " " }]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "script is empty!"
    );
  });

  it("should fail when an invalid command object is given", () => {
    const config = {
      loop: {
        commands: [{}]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "invalid command: undefined"
    );
  });

  it("should fail when an invalid script is given", () => {
    const config = {
      loop: {
        commands: [{ script: [] }]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "invalid script"
    );
  });

  it("should fail when both command and script are given", () => {
    const config = {
      loop: {
        commands: [
          {
            command: "command",
            script: "script"
          }
        ]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "cannot combine command and script!"
    );
  });

  it("should fail when the call has no path", () => {
    const config = {
      call: {
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "call: no path given!"
    );
  });

  it("should fail when the header value invalid", () => {
    const config = {
      call: {
        path: "/date",
        headers: "a",
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "invalid header value: a"
    );
  });

  it("should fail when the header value is not a string", () => {
    const config = {
      call: {
        path: "/date",
        headers: { a: 1 },
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "header value is not a string: 1"
    );
  });

  it("should fail when the header array name is not a string", () => {
    const config = {
      call: {
        path: "/date",
        headers: [{ name: 1, value: "a" }],
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "header name is not a string: 1"
    );
  });

  it("should fail when the header array value is not a string", () => {
    const config = {
      call: {
        path: "/date",
        headers: [{ name: "a", value: 1 }],
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "header value is not a string: 1"
    );
  });

  it("should fail when the method value is invalid", () => {
    const config = {
      call: {
        path: "/date",
        methods: 1,
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "invalid methods value: 1"
    );
  });

  it("should fail when the method array value is not a string", () => {
    const config = {
      call: {
        path: "/date",
        methods: ["GET", 1],
        commands: ["date"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      "method is not a string: 1"
    );
  });

  it("should fail when the initialization fails", () => {
    const config = {
      init: {
        commands: [
          {
            command: "nonexistingcommand",
            stderr: "ignore"
          }
        ]
      },
      loop: {
        commands: ["ls"]
      }
    };
    return expect(autoapply.run(config)).to.be.rejectedWith(
      Error,
      /failed with code 127/
    );
  });

  it("should execute the given commands", () => {
    const config = {
      loop: {
        onerror: "fail",
        sleep: 0,
        commands: [
          {
            command: "ls",
            stdout: "ignore"
          },
          {
            command: ["date"],
            stdout: "ignore"
          }
        ]
      }
    };
    return autoapply.run(config, { loops: 1 }).then(ctx => ctx.wait());
  });

  it("should execute the given script", () => {
    const config = {
      loop: {
        onerror: "fail",
        commands: [
          {
            script: "#!/bin/sh\nfalse\ntrue\ndate",
            stdout: "ignore"
          }
        ]
      }
    };
    return autoapply.run(config, { loops: 1 }).then(ctx => ctx.wait());
  });

  it("should execute the commands when calling the URL", done => {
    const config = {
      call: [
        {
          path: "/echo",
          methods: [],
          headers: { "Content-Type": "text/plain" },
          commands: ["echo hello", "echo world >&2"]
        }
      ]
    };
    autoapply.run(config).then(ctx => {
      chai
        .request("http://localhost:3000")
        .get("/echo")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res).to.have.header("Content-Type", "text/plain");
          expect(res.text).to.equal("hello\nworld\n");
          ctx.stop().then(() => done());
        });
    });
  });

  it("should be able to read the HTTP headers when calling the URL", done => {
    const config = {
      call: [
        {
          path: "/header",
          methods: ["*"],
          commands: ['echo "hello from ${HTTP_HOST}"']
        }
      ]
    };
    autoapply.run(config).then(ctx => {
      chai
        .request("http://localhost:3000")
        .get("/header")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.equal("hello from localhost:3000\n");
          ctx.stop().then(() => done());
        });
    });
  });

  it("should return 500 when the call failed", done => {
    const config = {
      call: [
        {
          path: "/error",
          commands: ["ls nonexisting"]
        }
      ]
    };
    autoapply.run(config).then(ctx => {
      chai
        .request("http://localhost:3000")
        .get("/error")
        .end((err, res) => {
          expect(res).to.have.status(500);
          ctx.stop().then(() => done());
        });
    });
  });

  it("should return 405 when the method is unsupported", done => {
    const config = {
      call: [
        {
          path: "/date",
          commands: ["date"]
        }
      ]
    };
    autoapply.run(config).then(ctx => {
      chai
        .request("http://localhost:3000")
        .post("/date")
        .end((err, res) => {
          expect(res).to.have.status(405);
          ctx.stop().then(() => done());
        });
    });
  });

  it("should stream the data when calling the URL", done => {
    const config = {
      call: [
        {
          path: "/echo",
          stream: true,
          commands: ["echo hello", "echo world >&2"]
        }
      ]
    };
    autoapply.run(config).then(ctx => {
      chai
        .request("http://localhost:3000")
        .get("/echo")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.equal("hello\nworld\n");
          ctx.stop().then(() => done());
        });
    });
  });

  it("should execute multiple loops", () => {
    const config = {
      loop: [
        {
          commands: [["true"]]
        },
        {
          commands: [["true"]]
        }
      ]
    };
    return autoapply.run(config, { loops: 1 }).then(ctx => ctx.stop());
  });

  it("should execute the initializations in the given directory", () => {
    const d = tmp.dirSync();
    fsExtra.writeFileSync(path.join(d.name, "file1"), "");

    const config = {
      init: {
        cwd: d.name,
        commands: ["ls file1 >/dev/null"]
      },
      loop: {
        commands: [["true"]]
      }
    };

    return autoapply
      .run(config, { loops: 1 })
      .then(ctx => ctx.stop())
      .then(() => fsExtra.removeSync(d.name));
  });

  it("should execute the commands in the given directory", () => {
    const d = tmp.dirSync();
    fsExtra.writeFileSync(path.join(d.name, "file1"), "");

    const config = {
      loop: {
        cwd: d.name,
        onerror: "fail",
        commands: ["ls file1 >/dev/null"],
        sleep: 0.01
      }
    };

    return autoapply
      .run(config, { loops: 1 })
      .then(ctx => ctx.wait())
      .then(() => fsExtra.removeSync(d.name));
  });

  it("should use the default sleep value", () => {
    const config = {
      loop: {
        sleep: "-0.3",
        commands: [
          {
            command: "date",
            stdout: "ignore"
          }
        ]
      }
    };
    return autoapply.run(config, { loops: 1 }).then(ctx => ctx.wait());
  });

  it("should cancel the sleep when being stopped", done => {
    const config = {
      loop: {
        commands: [["true"]]
      }
    };
    autoapply.run(config).then(ctx => {
      setTimeout(() => ctx.stop().then(() => done()), 50);
    });
  });

  it("should sleep when executing the commands", () => {
    const config = {
      loop: {
        sleep: "0.01",
        onerror: "continue",
        commands: [
          {
            command: ["nonexistingcommand"],
            stdout: "ignore"
          }
        ]
      }
    };
    return autoapply.run(config, { loops: 2 }).then(ctx => ctx.wait());
  });

  it("should throw an error when the command does not exist", () => {
    const config = {
      loop: {
        onerror: "fail",
        commands: [
          {
            command: "nonexistingcommand",
            stderr: "ignore"
          }
        ]
      }
    };
    return autoapply
      .run(config, { loops: 1 })
      .then(ctx =>
        expect(ctx.loops[0].promise).to.be.rejectedWith(
          Error,
          /nonexistingcommand/
        )
      );
  });

  it("should provide a /healthz endpoint", done => {
    const config = {
      server: {
        enabled: true,
        port: 3001
      },
      loop: {
        commands: [["true"]]
      }
    };

    autoapply.run(config, { loops: 1 }).then(ctx => {
      chai
        .request("http://localhost:3001")
        .get("/healthz")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.equal("OK");
          ctx.stop().then(() => done());
        });
    });
  });

  it("should return 200 for valid HEAD requests", done => {
    const config = {
      server: {
        enabled: true
      },
      loop: {
        commands: [["true"]]
      }
    };

    autoapply.run(config, { loops: 1 }).then(ctx => {
      chai
        .request("http://localhost:3000")
        .head("/healthz")
        .end((err, res) => {
          expect(res).to.have.status(200);
          ctx.stop().then(() => done());
        });
    });
  });

  it("should return 404 for unknown URLs", done => {
    const config = {
      server: {
        enabled: true
      },
      loop: {
        commands: [["true"]]
      }
    };

    autoapply.run(config, { loops: 1 }).then(ctx => {
      chai
        .request("http://localhost:3000")
        .get("/123")
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.text).to.equal("Not found!");
          ctx.stop().then(() => done());
        });
    });
  });

  it("should return 405 for unknown methods", done => {
    const config = {
      server: {
        enabled: true
      },
      loop: {
        commands: [["true"]]
      }
    };

    autoapply.run(config, { loops: 1 }).then(ctx => {
      chai
        .request("http://localhost:3000")
        .put("/healthz")
        .end((err, res) => {
          expect(res).to.have.status(405);
          expect(res.text).to.equal("Only GET or HEAD supported!");
          ctx.stop().then(() => done());
        });
    });
  });
});

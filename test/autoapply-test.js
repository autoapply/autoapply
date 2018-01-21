const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiHttp = require('chai-http');
const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiHttp);

const path = require('path');
const yaml = require('js-yaml');
const tmp = require('tmp');
const fsExtra = require('fs-extra');

const autoapply = require('../bin/autoapply');

autoapply.logger.level = -1;

describe('autoapply', () => {
    it('should execute the commands given in the config file', () => {
        const d = tmp.dirSync();
        const config = {
            'loop': {
                'commands': [
                    ['true']
                ],
                'sleep': 0.01
            }
        };
        const configFile = path.join(d.name, 'config.yaml');
        fsExtra.writeFileSync(configFile, yaml.safeDump(config));
        return autoapply.main([configFile])
            .then((ctx) => ctx.stop())
            .then(() => fsExtra.removeSync(d.name));
    });

    it('should fail when an invalid onerror is given', () => {
        const config = {
            'loop': {
                'commands': ['ls'],
                'onerror': 'x'
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error, 'invalid onerror value: x');
    });

    it('should fail when an invalid sleep is given', () => {
        const config = {
            'loop': {
                'commands': ['ls'],
                'sleep': 'x'
            }
        };
        return expect(autoapply.run(config, { 'loops': 1 })).to.be.rejectedWith(Error,
            'invalid sleep value: x');
    });

    it('should fail when an invalid stdout is given', () => {
        const config = {
            'loop': {
                'commands': [
                    {
                        'command': 'ls',
                        'stdout': 'unknown'
                    }
                ]
            }
        };
        return expect(autoapply.run(config, { 'loops': 1 })).to.be.rejectedWith(Error,
            'invalid stdio');
    });

    it('should fail when no commands are given', () => {
        return expect(autoapply.run({})).to.be.rejectedWith(Error,
            'invalid configuration, loop section missing!');
    });

    it('should fail when an empty command is given', () => {
        const config = {
            'loop': {
                'commands': ['ls', ['']]
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error, 'invalid command: ');
    });

    it('should fail when a blank command is given', () => {
        const config = {
            'loop': {
                'commands': [' ']
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error, 'command is empty!');
    });

    it('should fail when an invalid command object is given', () => {
        const config = {
            'loop': {
                'commands': [{}]
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error,
            'invalid command: undefined');
    });

    it('should fail when the initialization fails', () => {
        const config = {
            'server': {
                'enabled': false
            },
            'init': {
                'commands': [
                    {
                        'command': 'nonexistingcommand',
                        'stderr': 'ignore'
                    }
                ]
            },
            'loop': {
                'commands': ['ls']
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error, /failed with code 127/);
    });

    it('should execute the given commands', () => {
        const config = {
            'server': {
                'enabled': false
            },
            'loop': {
                'onerror': 'fail',
                'sleep': 0,
                'commands': [
                    {
                        'command': 'ls',
                        'stdout': 'ignore'
                    },
                    {
                        'command': ['date'],
                        'stdout': 'ignore'
                    }
                ]
            }
        };
        return autoapply.run(config, { 'loops': 1 }).then((ctx) => ctx.loop);
    });

    it('should use the default sleep value', () => {
        const config = {
            'server': {
                'enabled': false
            },
            'loop': {
                'sleep': '-0.3',
                'commands': [
                    {
                        'command': 'date',
                        'stdout': 'ignore'
                    }
                ]
            }
        };
        return autoapply.run(config, { 'loops': 1 }).then((ctx) => ctx.loop);
    });

    it('should sleep when executing the commands', () => {
        const config = {
            'server': {
                'enabled': false
            },
            'loop': {
                'sleep': '0.01',
                'onerror': 'continue',
                'commands': [
                    {
                        'command': ['nonexistingcommand'],
                        'stdout': 'ignore'
                    }
                ]
            }
        };
        return autoapply.run(config, { 'loops': 2 }).then((ctx) => ctx.loop);
    });

    it('should throw an error when the command does not exist', () => {
        const config = {
            'server': {
                'enabled': false
            },
            'loop': {
                'onerror': 'fail',
                'commands': [
                    {
                        'command': 'nonexistingcommand',
                        'stderr': 'ignore'
                    }
                ]
            }
        };
        return autoapply.run(config, { 'loops': 1 }).then((ctx) =>
            expect(ctx.loop).to.be.rejectedWith(Error, /nonexistingcommand/));
    });

    it('should provide a /healthz endpoint', (done) => {
        const config = {
            'server': {
                'enabled': true,
                'port': 3001
            },
            'loop': {
                'commands': [
                    ['true']
                ]
            }
        };

        autoapply.run(config, { 'loops': 1 }).then((ctx) => {
            chai.request('http://localhost:3001').get('/healthz').end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.text).to.equal('OK');
                ctx.stop().then(done);
            });
        });
    });

    it('should return 404 for unknown URLs', (done) => {
        const config = {
            'loop': {
                'commands': [
                    ['true']
                ]
            }
        };

        autoapply.run(config, { 'loops': 1 }).then((ctx) => {
            chai.request('http://localhost:3000').get('/123').end((err, res) => {
                expect(res).to.have.status(404);
                expect(res.text).to.equal('Not found!');
                ctx.stop().then(done);
            });
        });
    });

    it('should return 405 for unknown methods', (done) => {
        const config = {
            'loop': {
                'commands': [
                    ['true']
                ]
            }
        };

        autoapply.run(config, { 'loops': 1 }).then((ctx) => {
            chai.request('http://localhost:3000').put('/healthz').end((err, res) => {
                expect(res).to.have.status(405);
                expect(res.text).to.equal('Only GET or HEAD supported!');
                ctx.stop().then(done);
            });
        });
    });
});

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

const autoapply = require('../bin/autoapply');

autoapply.logger.level = -1;

describe('autoapply', () => {
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
        return expect(autoapply.run(config, { 'loops': 1 })).to.be.rejectedWith(Error, 'invalid sleep value: x');
    });

    it('should fail when no commands are given', () => {
        return expect(autoapply.run({})).to.be.rejectedWith(Error, 'invalid configuration!');
    });

    it('should fail when an empty command is given', () => {
        const config = {
            'loop': {
                'commands': ['ls', ['']]
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error, 'invalid command: ');
    });

    it('should fail when an invalid command object is given', () => {
        const config = {
            'loop': {
                'commands': [{}]
            }
        };
        return expect(autoapply.run(config)).to.be.rejectedWith(Error, 'invalid command: ');
    });

    it('should fail when the initialization fails', () => {
        const config = {
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
            'loop': {
                'onerror': 'fail',
                'commands': [
                    {
                        'command': 'ls',
                        'stdout': 'ignore'
                    },
                    {
                        'command': 'date',
                        'stdout': 'ignore'
                    }
                ]
            }
        };
        return autoapply.run(config, { 'loops': 1 });
    });

    it('should throw an error when the command does not exist', () => {
        const config = {
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
        return expect(autoapply.run(config, { 'loops': 1 })).to.be.rejectedWith(Error, /nonexistingcommand/);
    });
});

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
        return expect(autoapply.run({ 'onerror': 'x' })).to.be.rejectedWith(Error);
    });

    it('should fail when an invalid sleep is given', () => {
        const config = {
            'sleep': 'x',
            'commands': ['ls']
        };
        return expect(autoapply.run(config, { 'loops': 1 })).to.be.rejectedWith(Error);
    });

    it('should fail when no commands are given', () => {
        return expect(autoapply.run({})).to.be.rejectedWith(Error);
    });

    it('should execute the given commands', () => {
        const config = {
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
        };
        return autoapply.run(config, { 'loops': 1 });
    });

    it('should throw an error when the command does not exist', () => {
        const config = {
            'onerror': 'fail',
            'commands': [
                {
                    'command': 'nonexistingcommand',
                    'stderr': 'ignore'
                }
            ]
        };
        return expect(autoapply.run(config, { 'loops': 1 })).to.be.rejectedWith(Error);
    });
});

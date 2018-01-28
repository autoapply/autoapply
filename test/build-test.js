const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;

const path = require('path');
const fsExtra = require('fs-extra');

describe('build', () => {
    it('should match the version in the package.json file', () => {
        const pkg = fsExtra.readJsonSync('package.json');
        walk('build', (f) => {
            const str = fsExtra.readFileSync(f, 'utf8');
            expect(str).to.include(`autoapply@${pkg.version}`);
        });
    });
});

function walk(dir, cb) {
    fsExtra.readdirSync(dir).forEach((p) => {
        const rel = path.join(dir, p);
        const stats = fsExtra.statSync(rel);
        if (stats.isDirectory()) {
            walk(rel, cb);
        } else {
            cb(rel);
        }
    });
}

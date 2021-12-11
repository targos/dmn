var fs = require('fs-extra'),
    os = require('os'),
    path = require('path'),
    co = require('co'),
    console = require('../../lib/console_ex'),
    dmn = require('../../index');


/**
 * Get test working directory path
 */
var tmpPath = path.join(__dirname, '../tmp');


/**
 * Wrap fs thunks, so they can be safely passed to Array.map()
 * (learn more: http://www.wirfs-brock.com/allen/posts/166)
 */
function ensureDir(dir) {
    return fs.ensureDir(dir, 0777);
}

function ensureFile(file) {
    return fs.ensureFile(file);
}


describe('gen', function () {

    /**
     * Test setup / teardown
     */
    beforeEach(co(function* () {
        yield ensureDir(tmpPath);
        process.chdir(tmpPath);
    }));

    afterEach(co(function* () {
        process.chdir(__dirname);
        yield fs.remove(tmpPath);
    }));


    /**
     * Tests
     */
    it('should add ignores with respect to existing .npmignore file', co(function* () {
        // We should keep original line endings, to test this we'll choose
        // line endings for ignore file which are opposite to the
        // current OS's line endings .
        var srcEol = os.EOL === '\n' ? '\r\n' : '\n',
            caseInsensitiveFS = true,
            projectFiles = [
                '.travis.yml',
                'Gulpfile.js',
                'index.js',
                'package.json',
                'HISTORY',
                'Makefile'
            ],

            projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.travis.yml',
                '!Makefile',
                'test',
                'example/',
                '!benchmark/'
            ].join(srcEol);

        yield[
            projectFiles.map(ensureFile),
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        try {
            yield fs.readFile('.NpMiGnore');
        }

        catch (err) {
            caseInsensitiveFS = false;
        }

        var status = yield dmn.gen(tmpPath, {force: true}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: saved');

        if (caseInsensitiveFS) {
            ignoreFile.should.eql([
                '.travis.yml',
                '!Makefile',
                'test',
                'example/',
                '!benchmark/',
                '',
                '.npmignore',
                'coverage/',
                'Gulpfile.*',
                'HISTORY',
                'History'
            ].join(srcEol));
        }

        else {
            ignoreFile.should.eql([
                '.travis.yml',
                '!Makefile',
                'test',
                'example/',
                '!benchmark/',
                '',
                '.npmignore',
                'coverage/',
                'Gulpfile.*',
                'HISTORY'
            ].join(srcEol));
        }
    }));


    it('should create new .npmignore file if it does not exists', co(function* () {
        var projectDirs = [
            'lib',
            'test',
            'coverage',
            'benchmark'
        ];

        yield projectDirs.map(ensureDir);

        var status = yield dmn.gen(tmpPath, {force: true}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: saved');
        ignoreFile.should.eql([
            '# Generated by dmn (https://github.com/inikulin/dmn)',
            '',
            '.npmignore',
            'benchmark/',
            'coverage/',
            'test/'
        ].join(os.EOL));
    }));


    it('should not modify .npmignore if it is already perfect', co(function* () {
        var projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.npmignore',
                'coverage/',
                'test/',
                'benchmark/'
            ].join(os.EOL);

        yield [
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        var status = yield dmn.gen(tmpPath, {force: true}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: already-perfect');
        ignoreFile.should.eql(srcIgnoreFile);

    }));


    it('should cancel .npmignore file update on user demand if "force" flag disabled', co(function* () {
        var projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.npmignore',
                'benchmark/'
            ].join(os.EOL);

        yield [
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        console.confirm = function (what, callback) {
            callback(false);
        };

        var status = yield dmn.gen(tmpPath, {force: false}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: canceled');
        ignoreFile.should.eql(srcIgnoreFile);
    }));


    it('should update .npmignore file update on user confirmation if "force" flag disabled', co(function* () {
        var projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.npmignore',
                'benchmark/'
            ].join(os.EOL);

        yield [
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        console.confirm = function (what, callback) {
            callback(true);
        };

        var status = yield dmn.gen(tmpPath, {force: false}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: saved');
        ignoreFile.should.eql([
            '.npmignore',
            'benchmark/',
            '',
            'coverage/',
            'test/'
        ].join(os.EOL));
    }));
});

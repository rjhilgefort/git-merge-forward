#!/usr/bin/env node

// TODO:
// - Use 'semver' to handle semantic version sorting after getting branches

// Declare common vars
var shell, _, program,
	branches, setupBranch, mergeFrom, silent, output;

shell = require('shelljs');
_ = require('lodash');
program = require('commander');

// Process arguments
program
	.version('0.0.1')
	.usage("[options]")
	.option("-r, --remote [value]", "Specify the remote, defaults to 'origin'")
	.option("-p, --prefix [value]", "Specify the branch prefix to target, defaults to 'release'")
	.parse(process.argv);

if (!_.isString(program.remote)) program.remote = 'origin';
if (!_.isString(program.prefix)) program.prefix = 'release';

// Make sure branch is up to date locally and set stage
setupBranch = function(branch) {
	shell.echo("\n\n" + "==> Processing: " + branch);
	shell.exec('git checkout ' + branch);
	shell.exec('git pull');
};

// Merge from branch into current
mergeFrom = function(branch) {
	output = shell.exec('git merge ' + branch);

	// Handle conflicts
	if (/CONFLICT/.test(output.output)) {
		shell.exec("git mergetool");
		shell.exec("git add -A");
		shell.exec("git commit --no-edit");
	}

	shell.exec('git push');
};

// Shortcut
silent = { silent: true };

///////////////////////////////////////////////////////////////////////////////
// Start Script
///////////////////////////////////////////////////////////////////////////////

shell.echo();
shell.echo("==> Using remote: " + program.remote);
shell.echo("==> Using prefix: " + program.prefix);

// Update remotes
shell.exec('git fetch');

// Get branches
branches = shell.exec('git branch -r | ag "' + program.remote + '\/' + program.prefix + '\/"', silent);
if (branches.code !== 0) {
	shell.echo("No branches found to merge to/with");
	shell.exit(1);
}

// Parse branches
branches = _(branches.output.split('\n'))
	.chain()
	.map(function(branch) {
		return branch.trim().replace(program.remote + '/', '');
	})
	.compact()
	.value();

// Merge all the found branches
_.forEach(branches, function(branch, i) {
	setupBranch(branch);

	// Skip merge process when processing first
	if (i === 0) return true;

	mergeFrom(branches[(i - 1)]);
});

// Finally, merge into master
setupBranch('master');
mergeFrom(_.last(branches));


#!/usr/bin/env node

// TODO:
// - Use 'semver' to handle semantic version sorting after getting branches

// Declare common vars
var shell, _, program, colors,
	branches, setupBranch, mergeFrom, silent, output;

shell = require('shelljs');
_ = require('lodash');
program = require('commander');
colors = require('colors');

// Process arguments
program
	.version('0.0.2')
	.usage("[options]")
	.option("-r, --remote [value]", "The remote ['origin']", 'origin')
	.option("-b, --branchPrefix [value]", "The branch prefix to target ['release']", 'release')
	.option("-m, --no-master", "Don't merge changes up through master")
	.option("-p, --push", "Push changes to remote")
	.parse(process.argv);

if (_.isUndefined(program.push)) program.push = false;

// Make sure branch is up to date locally and set stage
setupBranch = function(branch) {
	shell.echo(("\n\n" + "==> Processing: " + branch).underline.green);
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

	if (program.push) shell.exec('git push');
};

// Shortcut
silent = { silent: true };

///////////////////////////////////////////////////////////////////////////////
// Start Script
///////////////////////////////////////////////////////////////////////////////

shell.echo();
shell.echo("==> Settings (run `--help` for info)".underline.green);
shell.echo(("remote: " + program.remote).magenta);
shell.echo(("branchPrefix: " + program.branchPrefix).magenta);
shell.echo(("master: " + program.master).magenta);
shell.echo(("push: " + program.push).magenta);

// Update remotes
shell.exec('git fetch');

// Get branches
branches = shell.exec('git branch -r | ag "' + program.remote + '\/' + program.branchPrefix + '\/"', silent);
if (branches.code !== 0) {
	shell.echo("No branches found to merge to/with".red);
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

// Add master to the list
if (program.master) branches.push('master');

// Merge all the found branches
_.forEach(branches, function(branch, i) {
	setupBranch(branch);

	// Skip merge process when processing first
	if (i === 0) return true;

	mergeFrom(branches[(i - 1)]);
});

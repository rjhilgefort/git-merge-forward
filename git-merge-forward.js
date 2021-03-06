#!/usr/bin/env node

var shell, _, program, colors, inquirer, semver,
	branches, setupBranch, mergeFrom, silent, output, proceed;

shell = require('shelljs');
_ = require('lodash');
program = require('commander');
colors = require('colors');
inquirer = require('inquirer');
semver = require('semver');

// Process arguments
program
	.version('0.0.3')
	.usage("[options]")
	.option("-r, --remote [value]", "The remote ['origin']", 'origin')
	.option("-b, --branchPrefix [value]", "The branch prefix to target ['release']", 'release')
	.option("-m, --no-master", "Don't merge changes up through master")
	.option("-p, --push", "Push changes to remote")
	.option("-g, --grepTool [value]", "Tool to grep with ['grep']", 'grep')
	.parse(process.argv);

if (_.isUndefined(program.push)) program.push = false;

// Make sure branch is up to date locally and set stage
setupBranch = function(branch) {
	shell.echo(("\n\n" + "> Processing: " + branch).underline.green);
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

	if (program.push) shell.exec('git push --no-verify');
};

// Shortcut
silent = { silent: true };

// Proceed dialogue
proceed = {
	type: 'checkbox',
	name: 'branches',
	message: "Select branches to merge forward:".underline.green,
	choices: []
};

///////////////////////////////////////////////////////////////////////////////
// Start Script
///////////////////////////////////////////////////////////////////////////////

shell.echo();
shell.echo("> ".green + "Settings (run `--help` for info)".underline.green);
shell.echo(("remote: " + program.remote).magenta);
shell.echo(("branchPrefix: " + program.branchPrefix).magenta);
// shell.echo(("master: " + program.master).magenta);
shell.echo(("push: " + program.push).magenta);
// shell.echo(("grepTool: " + program.grepTool).magenta);

// Update remotes
shell.exec('git fetch');

// Get branches
branches = shell.exec('git branch -r | ' + program.grepTool + ' "' + program.remote + '\/' + program.branchPrefix + '\/"', silent);
if (branches.code !== 0) {
	shell.echo("No branches found to merge to/with".red);
	shell.exit(1);
}

// Parse and setup branches
branches = branches.output.split('\n');
branches = _.compact(branches);
branches = _.map(branches, function(branch) {
	return branch.trim().replace(program.remote + '/' + program.branchPrefix + '/', '');
});
branches = branches.sort(semver.compare);
branches = _.map(branches, function(branch) {
	return {
		name: program.branchPrefix + '/' + branch,
		checked: true
	};
});

// Add master to the list
branches.push({
	name: 'master',
	checked: program.master
});

// Make sure this is what they want
proceed.choices = branches;
shell.echo("\n");
inquirer.prompt(proceed, function(response) {
	// Merge desired branches forward
	_.forEach(response.branches, function(branch, i) {
		setupBranch(branch);

		// Skip merge process when processing first
		if (i === 0) return true;

		mergeFrom(response.branches[(i - 1)]);
	});
});


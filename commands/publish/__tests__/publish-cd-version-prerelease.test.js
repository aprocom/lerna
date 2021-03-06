"use strict";

// local modules _must_ be explicitly mocked
jest.mock("../lib/git-push");
jest.mock("../lib/is-behind-upstream");

const fs = require("fs-extra");
const path = require("path");

// mocked modules
const collectUpdates = require("@lerna/collect-updates");

// certain tests need to use the real thing
const collectUpdatesActual = require.requireActual("@lerna/collect-updates");

// helpers
const initFixture = require("@lerna-test/init-fixture")(__dirname);
const showCommit = require("@lerna-test/show-commit");
const gitAdd = require("@lerna-test/git-add");
const gitTag = require("@lerna-test/git-tag");
const gitCommit = require("@lerna-test/git-commit");

// test command
const lernaPublish = require("@lerna-test/command-runner")(require("../command"));

// stabilize commit SHA
expect.addSnapshotSerializer(require("@lerna-test/serialize-git-sha"));

describe("publish --cd-version with previous prerelease", () => {
  const setupChanges = async cwd => {
    await gitTag(cwd, "v1.0.0-beta.3");
    await fs.outputFile(path.join(cwd, "packages/package-3/hello.js"), "world");
    await gitAdd(cwd, ".");
    await gitCommit(cwd, "setup");
  };

  it("publishes changed & prereleased packages if --cd-version is non-prerelease", async () => {
    const testDir = await initFixture("republish-prereleased");
    // should republish 3, 4, and 5 because:
    // package 3 changed
    // package 5 has a prerelease version
    // package 4 depends on package 5
    collectUpdates.mockImplementationOnce(collectUpdatesActual);

    await setupChanges(testDir);
    await lernaPublish(testDir)("--cd-version", "patch");

    const patch = await showCommit(testDir);
    expect(patch).toMatchSnapshot();
  });

  it("should not publish prereleased packages if --cd-version is a pre-* increment", async () => {
    const testDir = await initFixture("republish-prereleased");
    // should republish only package 3, because only it changed
    collectUpdates.mockImplementationOnce(collectUpdatesActual);

    await setupChanges(testDir);
    await lernaPublish(testDir)("--cd-version", "prerelease", "---preid", "beta");

    const patch = await showCommit(testDir);
    expect(patch).toMatchSnapshot();
  });
});

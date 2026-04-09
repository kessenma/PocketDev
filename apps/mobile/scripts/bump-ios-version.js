#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_FILE = path.join(__dirname, '../ios/Mobile.xcodeproj/project.pbxproj');
const VERSION_FILE = path.join(__dirname, '../ios-version.json');

// Default version if file doesn't exist
const DEFAULT_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: 1
};

function readCurrentVersion() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch (error) {
    console.log('Could not read version file, using defaults');
  }
  return { ...DEFAULT_VERSION };
}

function writeVersion(version) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2));
}

function updateXcodeProject(version) {
  const marketingVersion = `${version.major}.${version.minor}.${version.patch}`;
  const buildVersion = version.build.toString();

  console.log(`Updating Xcode project to version ${marketingVersion} (${buildVersion})`);

  let projectContent = fs.readFileSync(PROJECT_FILE, 'utf8');

  // Update MARKETING_VERSION
  projectContent = projectContent.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${marketingVersion};`
  );

  // Update CURRENT_PROJECT_VERSION
  projectContent = projectContent.replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${buildVersion};`
  );

  fs.writeFileSync(PROJECT_FILE, projectContent);
}

function bumpVersion(type = 'patch') {
  const currentVersion = readCurrentVersion();
  const newVersion = { ...currentVersion };

  switch (type) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
    default:
      newVersion.patch += 1;
      break;
  }

  // Always increment build number
  newVersion.build += 1;

  const oldVersionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch} (${currentVersion.build})`;
  const newVersionString = `${newVersion.major}.${newVersion.minor}.${newVersion.patch} (${newVersion.build})`;

  console.log(`Bumping version from ${oldVersionString} to ${newVersionString}`);

  // Update files
  writeVersion(newVersion);
  updateXcodeProject(newVersion);

  return newVersion;
}

function getCurrentVersionString() {
  const version = readCurrentVersion();
  return `${version.major}.${version.minor}.${version.patch} (${version.build})`;
}

function displayCurrentVersion() {
  const version = readCurrentVersion();
  const versionString = `${version.major}.${version.minor}.${version.patch}`;
  console.log(`App Version: ${versionString}`);
  console.log(`Build Number: ${version.build}`);
  console.log(`Full Version: ${versionString} (${version.build})`);
}

// CLI interface
const command = process.argv[2];
const bumpType = process.argv[3] || 'patch';

switch (command) {
  case 'bump':
    bumpVersion(bumpType);
    break;
  case 'current':
    displayCurrentVersion();
    break;
  case 'init':
    // Initialize version file from current Xcode project
    const version = readCurrentVersion();
    writeVersion(version);
    updateXcodeProject(version);
    console.log(`Initialized version tracking at ${getCurrentVersionString()}`);
    break;
  default:
    console.log(`
Usage: node bump-ios-version.js <command> [type]

Commands:
  bump [patch|minor|major]  Bump version (default: patch)
  current                   Show current version
  init                      Initialize version tracking

Examples:
  node bump-ios-version.js bump patch    # 1.0.0 -> 1.0.1
  node bump-ios-version.js bump minor    # 1.0.1 -> 1.1.0
  node bump-ios-version.js bump major    # 1.1.0 -> 2.0.0
  node bump-ios-version.js current       # Show current version
`);
    process.exit(1);
}

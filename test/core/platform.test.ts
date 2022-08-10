// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import mockFS = require("mock-fs");
import FileSystem = require("mock-fs/lib/filesystem");
import * as fs from "fs";
import * as path from "path";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as platform from "../../src/platform";

class TestFileStat implements vscode.FileStat {
    type: vscode.FileType;
    ctime: number = 0;
    mtime: number = 0;
    size: number = 0;
    constructor(fsStats: fs.Stats) {
        this.type = fsStats.isFile() ? vscode.FileType.File : vscode.FileType.Directory;
        if (fsStats.isSymbolicLink()) {
            // tslint:disable-next-line:no-bitwise
            this.type |= vscode.FileType.SymbolicLink;
        }
    }
}

class TestFS implements vscode.FileSystemProvider {
    onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;
    watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        throw new Error("Method not implemented.");
    }
    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        return new TestFileStat(fs.lstatSync(uri.fsPath));
    }
    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        throw new Error("Method not implemented.");
    }
    createDirectory(uri: vscode.Uri): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        throw new Error("Method not implemented.");
    }
    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
    delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
    copy?(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
}

const testFS = new TestFS();
try {
    vscode.workspace.registerFileSystemProvider("file", testFS);
} catch {
    // NOTE: This throws an error because it's not supposed to allow us to
    // register the file provider...but it does, and it's super useful here.
}

/**
 * Describes a platform on which the PowerShell extension should work,
 * including the test conditions (filesystem, environment variables).
 */
interface ITestPlatform {
    name: string;
    platformDetails: platform.IPlatformDetails;
    filesystem: FileSystem.DirectoryItems;
    environmentVars?: Record<string, string>;
}

/**
 * A platform where the extension should find a PowerShell,
 * including the sequence of PowerShell installations that should be found.
 * The expected default PowerShell is the first installation.
 */
interface ITestPlatformSuccessCase extends ITestPlatform {
    expectedPowerShellSequence: platform.IPowerShellExeDetails[];
}

// Platform configurations where we expect to find a set of PowerShells
let successTestCases: ITestPlatformSuccessCase[];

let msixAppDir = null;
let pwshMsixPath = null;
let pwshPreviewMsixPath = null;
if (process.platform === "win32") {
    msixAppDir = path.join(process.env.LOCALAPPDATA, "Microsoft", "WindowsApps");
    pwshMsixPath = path.join(msixAppDir, "Microsoft.PowerShell_8wekyb3d8bbwe", "pwsh.exe");
    pwshPreviewMsixPath = path.join(msixAppDir, "Microsoft.PowerShellPreview_8wekyb3d8bbwe", "pwsh.exe");

    successTestCases = [
        {
            name: "Windows 64-bit, 64-bit VSCode (all installations)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Windows,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            environmentVars: {
                "ProgramFiles": "C:\\Program Files",
                "ProgramFiles(x86)": "C:\\Program Files (x86)",
                "windir": "C:\\WINDOWS",
            },
            expectedPowerShellSequence: [
                {
                    exePath: "C:\\Program Files\\PowerShell\\6\\pwsh.exe",
                    displayName: "PowerShell (x64)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files (x86)\\PowerShell\\6\\pwsh.exe",
                    displayName: "PowerShell (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: pwshMsixPath,
                    displayName: "PowerShell (Store)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe",
                    displayName: "PowerShell Preview (x64)",
                    supportsProperArguments: true
                },
                {
                    exePath: pwshPreviewMsixPath,
                    displayName: "PowerShell Preview (Store)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files (x86)\\PowerShell\\7-preview\\pwsh.exe",
                    displayName: "PowerShell Preview (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x64)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x86)",
                    supportsProperArguments: true
                },
            ],
            filesystem: {
                "C:\\Program Files\\PowerShell": {
                    "6": {
                        "pwsh.exe": "",
                    },
                    "7-preview": {
                        "pwsh.exe": "",
                    },
                },
                "C:\\Program Files (x86)\\PowerShell": {
                    "6": {
                        "pwsh.exe": "",
                    },
                    "7-preview": {
                        "pwsh.exe": "",
                    },
                },
                [msixAppDir]: {
                    "Microsoft.PowerShell_8wekyb3d8bbwe": {
                        "pwsh.exe": "",
                    },
                    "Microsoft.PowerShellPreview_8wekyb3d8bbwe": {
                        "pwsh.exe": "",
                    },
                },
                "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
                "C:\\WINDOWS\\SysWOW64\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
            },
        },
        {
            name: "Windows 64-bit, 64-bit VSCode (only Windows PowerShell)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Windows,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            environmentVars: {
                "ProgramFiles": "C:\\Program Files",
                "ProgramFiles(x86)": "C:\\Program Files (x86)",
                "windir": "C:\\WINDOWS",
            },
            expectedPowerShellSequence: [
                {
                    exePath: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x64)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x86)",
                    supportsProperArguments: true
                },
            ],
            filesystem: {
                "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
                "C:\\WINDOWS\\SysWOW64\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
            },
        },
        {
            name: "Windows 64-bit, 32-bit VSCode (all installations)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Windows,
                isOS64Bit: true,
                isProcess64Bit: false,
            },
            environmentVars: {
                "ProgramFiles": "C:\\Program Files (x86)",
                "ProgramFiles(x86)": "C:\\Program Files (x86)",
                "windir": "C:\\WINDOWS",
            },
            expectedPowerShellSequence: [
                {
                    exePath: "C:\\Program Files (x86)\\PowerShell\\6\\pwsh.exe",
                    displayName: "PowerShell (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files\\PowerShell\\6\\pwsh.exe",
                    displayName: "PowerShell (x64)",
                    supportsProperArguments: true
                },
                {
                    exePath: pwshMsixPath,
                    displayName: "PowerShell (Store)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files (x86)\\PowerShell\\7-preview\\pwsh.exe",
                    displayName: "PowerShell Preview (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: pwshPreviewMsixPath,
                    displayName: "PowerShell Preview (Store)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe",
                    displayName: "PowerShell Preview (x64)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x64)",
                    supportsProperArguments: true
                },
            ],
            filesystem: {
                "C:\\Program Files\\PowerShell": {
                    "6": {
                        "pwsh.exe": "",
                    },
                    "7-preview": {
                        "pwsh.exe": "",
                    },
                },
                "C:\\Program Files (x86)\\PowerShell": {
                    "6": {
                        "pwsh.exe": "",
                    },
                    "7-preview": {
                        "pwsh.exe": "",
                    },
                },
                [msixAppDir]: {
                    "Microsoft.PowerShell_8wekyb3d8bbwe": {
                        "pwsh.exe": "",
                    },
                    "Microsoft.PowerShellPreview_8wekyb3d8bbwe": {
                        "pwsh.exe": "",
                    },
                },
                "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
                "C:\\WINDOWS\\Sysnative\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
            },
        },
        {
            name: "Windows 64-bit, 32-bit VSCode (Windows PowerShell only)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Windows,
                isOS64Bit: true,
                isProcess64Bit: false,
            },
            environmentVars: {
                "ProgramFiles": "C:\\Program Files (x86)",
                "ProgramFiles(x86)": "C:\\Program Files (x86)",
                "windir": "C:\\WINDOWS",
            },
            expectedPowerShellSequence: [
                {
                    exePath: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x64)",
                    supportsProperArguments: true
                },
            ],
            filesystem: {
                "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
                "C:\\WINDOWS\\Sysnative\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
            },
        },
        {
            name: "Windows 32-bit, 32-bit VSCode (all installations)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Windows,
                isOS64Bit: false,
                isProcess64Bit: false,
            },
            environmentVars: {
                "ProgramFiles": "C:\\Program Files (x86)",
                "ProgramFiles(x86)": "C:\\Program Files (x86)",
                "windir": "C:\\WINDOWS",
            },
            expectedPowerShellSequence: [
                {
                    exePath: "C:\\Program Files (x86)\\PowerShell\\6\\pwsh.exe",
                    displayName: "PowerShell (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: pwshMsixPath,
                    displayName: "PowerShell (Store)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\Program Files (x86)\\PowerShell\\7-preview\\pwsh.exe",
                    displayName: "PowerShell Preview (x86)",
                    supportsProperArguments: true
                },
                {
                    exePath: pwshPreviewMsixPath,
                    displayName: "PowerShell Preview (Store)",
                    supportsProperArguments: true
                },
                {
                    exePath: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x86)",
                    supportsProperArguments: true
                },
            ],
            filesystem: {
                "C:\\Program Files (x86)\\PowerShell": {
                    "6": {
                        "pwsh.exe": "",
                    },
                    "7-preview": {
                        "pwsh.exe": "",
                    },
                },
                [msixAppDir]: {
                    "Microsoft.PowerShell_8wekyb3d8bbwe": {
                        "pwsh.exe": "",
                    },
                    "Microsoft.PowerShellPreview_8wekyb3d8bbwe": {
                        "pwsh.exe": "",
                    },
                },
                "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
            },
        },
        {
            name: "Windows 32-bit, 32-bit VSCode (Windows PowerShell only)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Windows,
                isOS64Bit: false,
                isProcess64Bit: false,
            },
            environmentVars: {
                "ProgramFiles": "C:\\Program Files (x86)",
                "ProgramFiles(x86)": "C:\\Program Files (x86)",
                "windir": "C:\\WINDOWS",
            },
            expectedPowerShellSequence: [
                {
                    exePath: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    displayName: "Windows PowerShell (x86)",
                    supportsProperArguments: true
                },
            ],
            filesystem: {
                "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0": {
                    "powershell.exe": "",
                },
            },
        },
    ];
} else {
    successTestCases = [
        {
            name: "Linux (all installations)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Linux,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            expectedPowerShellSequence: [
                { exePath: "/usr/bin/pwsh", displayName: "PowerShell", supportsProperArguments: true },
                { exePath: "/snap/bin/pwsh", displayName: "PowerShell Snap", supportsProperArguments: true },
                { exePath: "/usr/bin/pwsh-preview", displayName: "PowerShell Preview", supportsProperArguments: true },
                { exePath: "/snap/bin/pwsh-preview", displayName: "PowerShell Preview Snap", supportsProperArguments: true },
            ],
            filesystem: {
                "/usr/bin": {
                    "pwsh": "",
                    "pwsh-preview": "",
                },
                "/snap/bin": {
                    "pwsh": "",
                    "pwsh-preview": "",
                },
            },
        },
        {
            name: "MacOS (all installations)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.MacOS,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            expectedPowerShellSequence: [
                { exePath: "/usr/local/bin/pwsh", displayName: "PowerShell", supportsProperArguments: true },
                { exePath: "/usr/local/bin/pwsh-preview", displayName: "PowerShell Preview", supportsProperArguments: true },
            ],
            filesystem: {
                "/usr/local/bin": {
                    "pwsh": "",
                    "pwsh-preview": "",
                },
            },
        },
        {
            name: "Linux (stable only)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Linux,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            expectedPowerShellSequence: [
                { exePath: "/usr/bin/pwsh", displayName: "PowerShell", supportsProperArguments: true },
            ],
            filesystem: {
                "/usr/bin": {
                    pwsh: "",
                },
            },
        },
        {
            name: "Linux (stable snap only)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.Linux,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            expectedPowerShellSequence: [
                { exePath: "/snap/bin/pwsh", displayName: "PowerShell Snap", supportsProperArguments: true },
            ],
            filesystem: {
                "/snap/bin": {
                    pwsh: "",
                },
            },
        },
        {
            name: "MacOS (stable only)",
            platformDetails: {
                operatingSystem: platform.OperatingSystem.MacOS,
                isOS64Bit: true,
                isProcess64Bit: true,
            },
            expectedPowerShellSequence: [
                { exePath: "/usr/local/bin/pwsh", displayName: "PowerShell", supportsProperArguments: true },
            ],
            filesystem: {
                "/usr/local/bin": {
                    pwsh: "",
                },
            },
        },
    ];
}

const errorTestCases: ITestPlatform[] = [
    {
        name: "Linux (no PowerShell)",
        platformDetails: {
            operatingSystem: platform.OperatingSystem.Linux,
            isOS64Bit: true,
            isProcess64Bit: true,
        },
        filesystem: {},
    },
    {
        name: "MacOS (no PowerShell)",
        platformDetails: {
            operatingSystem: platform.OperatingSystem.MacOS,
            isOS64Bit: true,
            isProcess64Bit: true,
        },
        filesystem: {},
    },
];

function setupTestEnvironment(testPlatform: ITestPlatform) {
    mockFS(testPlatform.filesystem);

    if (testPlatform.environmentVars) {
        for (const envVar of Object.keys(testPlatform.environmentVars)) {
            sinon.stub(process.env, envVar).value(testPlatform.environmentVars[envVar]);
        }
    }
}

describe("Platform module", function () {
    it("Gets the correct platform details", function () {
        const platformDetails: platform.IPlatformDetails = platform.getPlatformDetails();
        switch (process.platform) {
            case "darwin":
                assert.strictEqual(
                    platformDetails.operatingSystem,
                    platform.OperatingSystem.MacOS,
                    "Platform details operating system should be MacOS");
                assert.strictEqual(
                    platformDetails.isProcess64Bit,
                    true,
                    "VSCode on darwin should be 64-bit");
                assert.strictEqual(
                    platformDetails.isOS64Bit,
                    true,
                    "Darwin is 64-bit only");
                break;

            case "linux":
                assert.strictEqual(
                    platformDetails.operatingSystem,
                    platform.OperatingSystem.Linux,
                    "Platform details operating system should be Linux");
                assert.strictEqual(
                    platformDetails.isProcess64Bit,
                    true,
                    "Only 64-bit VSCode supported on Linux");
                assert.strictEqual(
                    platformDetails.isOS64Bit,
                    true,
                    "Only 64-bit Linux supported by PowerShell");
                return;

            case "win32":
                assert.strictEqual(
                    platformDetails.operatingSystem,
                    platform.OperatingSystem.Windows,
                    "Platform details operating system should be Windows");
                assert.strictEqual(
                    platformDetails.isProcess64Bit,
                    process.arch === "x64",
                    "Windows process bitness should match process arch");
                assert.strictEqual(
                    platformDetails.isOS64Bit,
                    !!(platformDetails.isProcess64Bit || process.env.ProgramW6432),
                    "Windows OS arch should match process bitness unless 64-bit env var set");
                return;

            default:
                assert.fail("This platform is unsupported");
        }
    });

    describe("Default PowerShell installation", async function () {
        afterEach(function () {
            sinon.restore();
            mockFS.restore();
        });

        for (const testPlatform of successTestCases) {
            it(`Finds it on ${testPlatform.name}`, async function () {
                setupTestEnvironment(testPlatform);

                const powerShellExeFinder = new platform.PowerShellExeFinder(testPlatform.platformDetails);

                const defaultPowerShell = await powerShellExeFinder.getFirstAvailablePowerShellInstallation();
                const expectedPowerShell = testPlatform.expectedPowerShellSequence[0];

                assert.strictEqual(defaultPowerShell.exePath, expectedPowerShell.exePath);
                assert.strictEqual(defaultPowerShell.displayName, expectedPowerShell.displayName);
            });
        }

        for (const testPlatform of errorTestCases) {
            it(`Fails gracefully on ${testPlatform.name}`, async function () {
                setupTestEnvironment(testPlatform);

                const powerShellExeFinder = new platform.PowerShellExeFinder(testPlatform.platformDetails);

                const defaultPowerShell = await powerShellExeFinder.getFirstAvailablePowerShellInstallation();
                assert.strictEqual(defaultPowerShell, undefined);
            });
        }
    });

    describe("Expected PowerShell installation list", function () {
        afterEach(function () {
            sinon.restore();
            mockFS.restore();
        });

        for (const testPlatform of successTestCases) {
            it(`Finds them on ${testPlatform.name}`, async function () {
                setupTestEnvironment(testPlatform);

                const powerShellExeFinder = new platform.PowerShellExeFinder(testPlatform.platformDetails);

                const foundPowerShells = await powerShellExeFinder.getAllAvailablePowerShellInstallations();

                for (let i = 0; i < testPlatform.expectedPowerShellSequence.length; i++) {
                    const foundPowerShell = foundPowerShells[i];
                    const expectedPowerShell = testPlatform.expectedPowerShellSequence[i];

                    assert.strictEqual(foundPowerShell && foundPowerShell.exePath, expectedPowerShell.exePath);
                    assert.strictEqual(foundPowerShell && foundPowerShell.displayName, expectedPowerShell.displayName);
                }

                assert.strictEqual(
                    foundPowerShells.length,
                    testPlatform.expectedPowerShellSequence.length,
                    "Number of expected PowerShells found does not match");
            });
        }

        for (const testPlatform of errorTestCases) {
            it(`Fails gracefully on ${testPlatform.name}`, async function () {
                setupTestEnvironment(testPlatform);

                const powerShellExeFinder = new platform.PowerShellExeFinder(testPlatform.platformDetails);

                const foundPowerShells = await powerShellExeFinder.getAllAvailablePowerShellInstallations();
                assert.strictEqual(foundPowerShells.length, 0);
            });
        }
    });

    describe("Windows PowerShell path fix", function () {
        afterEach(function () {
            sinon.restore();
            mockFS.restore();
        });

        for (const testPlatform of successTestCases
            .filter((tp) => tp.platformDetails.operatingSystem === platform.OperatingSystem.Windows)) {

            it(`Corrects the Windows PowerShell path on ${testPlatform.name}`, function () {
                setupTestEnvironment(testPlatform);

                function getWinPSPath(systemDir: string) {
                    return path.join(
                        testPlatform.environmentVars.windir,
                        systemDir,
                        "WindowsPowerShell",
                        "v1.0",
                        "powershell.exe");
                }

                const winPSPath = getWinPSPath("System32");

                let altWinPSPath;
                if (testPlatform.platformDetails.isProcess64Bit) {
                    altWinPSPath = getWinPSPath("SysWOW64");
                } else if (testPlatform.platformDetails.isOS64Bit) {
                    altWinPSPath = getWinPSPath("Sysnative");
                } else {
                    altWinPSPath = null;
                }

                const powerShellExeFinder = new platform.PowerShellExeFinder(testPlatform.platformDetails);

                assert.strictEqual(powerShellExeFinder.fixWindowsPowerShellPath(winPSPath), winPSPath);

                if (altWinPSPath) {
                    assert.strictEqual(powerShellExeFinder.fixWindowsPowerShellPath(altWinPSPath), winPSPath);
                }
            });
        }
    });
});

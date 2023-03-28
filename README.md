# Ultimate Automizer VS Code Extension

This extension runs a formal verification on the current active C file. It relies on [Ultimate Automizer](https://github.com/ultimate-pa/ultimate) as external tool.

## Features

After activation of this extension, on each saving of a C file, a formal verification by Ultimate Automizer on the file is performed.

![demonstration](images/demo.gif)

## Requirements

Connection to a public server running Ultimate Automizer, e.g. https://monteverdi.informatik.uni-freiburg.de/ 

Alternatively a container providing the API can be executed inside Docker.

<!-- ## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---
-->

# Ultimate Automizer VS Code Extension

This extension runs a formal verification on the current active C file. It relies on [Ultimate Automizer](https://github.com/ultimate-pa/ultimate) as external tool.

## Features

A formal verification by Ultimate Automizer on the file is performed and the results are embedded into the VS Code diagnostics.

![demonstration](images/demo.gif)

## Requirements

Connection to a public server running Ultimate Automizer, e.g. <https://monteverdi.informatik.uni-freiburg.de/> or <https://ultimate.sopranium.de>.

Alternatively a container providing the API can be executed inside Docker.

## Extension Settings

This extension contributes the following settings:

* `ultimate.mode`: `"REST API"`/`"stdout"` to specify if Ultimate will be accessed by accessing a REST API or the output of the command line.
* `ultimate.url`: Base URL of the REST API endpoint.
* `ultimate.executablePath`: Path to the executable of Ultimate is NOT accessed by the REST API. This can either be Ultimate itself or the [wrapper script for MacOS](https://github.com/FahrJo/ultimate-automizer-docker).
* `ultimate.settingsPath`: Path to the settings (*.epf) of Ultimate is not accessed by the REST API.
* `ultimate.toolchainPath`: Path to the toolchain (*.xml) of Ultimate is NOT accessed by the REST API.
* `ultimate.verifyOnSave`: Enables verification on each file save (false by default)

## Known Issues

* Make sure the right Java version us used as default version if running Ultimate locally.
* Windows version only working properly by using the REST API mode since Ultimate 0.2.3 was not working on my Windows test machine properly.
* The result representation (code highlighting, log output etc.) so far looks differently for `REST API` and `stdout` mode. This is due to the output of Ultimate in the two different modes.
* So far there is no Dockerfile/Image available to host the REST API backend locally in a container.

## Release Notes

### 0.1.2

Add command to trigger verification manually (default now)

### 0.1.1

Add icon and compatibility for *.epf files.

### 0.1.0

Initial release

### Acknowledgements

The icon is used from the original Ultimate project [here](https://github.com/ultimate-pa/ultimate).

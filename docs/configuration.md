# Configuration format

The autoapply configuration is specified in [YAML](http://yaml.org/) and has the following structure:

<pre>
<a href="#init">init</a>:
  <a href="#cwd">cwd</a>: ...
  <a href="#commands">commands</a>:
  - ...
<a href="#loop">loop</a>:
  <a href="#sleep">sleep</a>: 60
  <a href="#onerror">onerror</a>: continue
  <a href="#cwd-1">cwd</a>: ...
  <a href="#commands-1">commands</a>:
  - ...
<a href="#server">server</a>:
  <a href="#enabled">enabled</a>: false
  <a href="#port">port</a>: 3000
<a href="#call">call</a>:
  <a href="#path">path</a>: /path
  <a href="#headers">headers</a>:
  - ...
  <a href="#stream">stream</a>: false
  <a href="#cwd-2">cwd</a>: ...
  <a href="#commands-2">commands</a>:
  - ...
</pre>

All sections are optional, but you have to configure at least one [`loop`](#loop) or [`call`](#call).

## `init`

Define any commands that should be executed on startup.
If any of the commands fail, autoapply will exit.

### `cwd`

Directory in which to execute the commands (working directory).
If unset, the directory in which autoapply was started will be used.

Example: `cwd: /tmp`

### `commands`

List of commands that should be run on startup. See [commands](#commands-3).

## `loop`

Define the loop commands. If you only need one loop, you can just specify an object:

```yaml
loop:
  cwd: /tmp
  commands:
  - ls
```

If you want to run multiple loops in parallel, you can specify an array:

```yaml
loop:
- cwd: .
  commands:
  - echo "This is loop 1"
- sleep: 120
  commands:
  - echo "This is loop 2"
```

### `cwd`

Directory in which to execute the commands (working directory).
If unset, a new temporary directory will be created for each loop iteration

### `sleep`

Time to wait (in seconds) between each iteration.
A value of 0 disables sleeping, default is 60 (1 minute).

### `onerror`

What should happen when a command fails? Possible values:

- `ignore` - ignore the error and continue with the next command
- `continue` (default) - don't execute any remaining commands and continue with the next loop iteration
- `fail` - exit the loop with an error message

Example:

```yaml
loop:
  onerror: ignore
  commands:
  - git pull
  - make &> .build
  - slackcli -h '#build' -m "Build status $(cat .build)"
```

### `commands`

List of commands that should be run in a loop, after the commands
defined in the [init](#init) section have finished successfully.
See [commands](#commands-3).

## `server`

Configuration of the internal HTTP server.

When the server is running, it provides the endpoint `/healthz`, which just
responds with `OK` and can be used as a [liveness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/).

### `enabled`

Set this to `true` if you want to have the HTTP server running (default is `false`).

The server will be enabled automatically when you specify [calls](#call).

### `port`

The HTTP port that the server will listen on, default is 3000.

## `call`

Define web commands that will be executed when the URL is called.
If you only need one call, you can just specify an object:

```yaml
call:
  path: /echo
  commands: [ 'echo hello' ]
```

If you want to provide multiple calls, you can specify an array:

```yaml
call:
- path: /echo1
  commands: [ 'echo hello' ]
- path: /echo2
  commands: [ 'echo world' ]
```

The following environment variables will be set for each call:

- `REQUEST_METHOD` - the HTTP method, for example `GET` or `POST`
- `REQUEST_URI` - the requested URI, for example `/echo1`
- `REMOTE_ADDR` - the IP address of the requesting client

Additionally, all request HTTP headers will be available as environment
variables. To improve compatibility with existing shells, the header names
will be prefixed with `HTTP_`, translated to uppercase and all special
characters will be replaced with `_`.
For example, the HTTP header `User-Agent` will be available as `HTTP_USER_AGENT`.

### `path`

The path to bind this call to:

```yaml
call:
- path: /date
  commands:
  - date
```

### `headers`

HTTP headers to send for each request

```yaml
call:
- path: /index.html
  headers:
  - name: Content-Type
    value: text/plain; charset=utf-8
  commands:
  - echo '<html><body>Hello!</body></html>'
```

You could also pass the headers as an object:

```yaml
  headers:
    Content-Type: text/plain; charset=utf-8
```

### `methods`

List of HTTP methods that this call accepts.
By default, only `GET` methods are supported, requests with any other method
will be answered by HTTP error 405 (method not allowed).

To support `GET` and `POST`:

```yaml
call:
- path: /clear
  methods: ['GET', 'POST']
  commands:
  - rm -rf /tmp/*
```

If you want to support all methods:

```yaml
call:
- path: /check
  methods: ['*']
  commands:
  - echo $HTTP_METHOD
```

### `stream`

Start to send available data to the client before all commands have finished?
Default is `false`.

```yaml
call:
- path: /access.log
  stream: true
  headers:
  # See https://stackoverflow.com/a/35848615
  - name: X-Content-Type-Options
    value: nosniff
  commands:
  - tail -f /var/log/access.log
```

### `cwd`

Directory in which to execute the commands (working directory).
If unset, a new temporary directory will be created for each call.

### `commands`

List of commands that should be run when the URL is called.
See [commands](#commands-3).

## Common

### `commands`

An array of commands to run.

The simple string form will use the shell, so environment variables etc. can be used:

```yaml
commands:
- ls ${HOME}
- "echo $(pwd)"
```

The array form will not use the shell. In this case, `ls` will try to list the contents of a directory with the literal name `${HOME}`. This will likely fail with "No such file or directory":

```yaml
commands:
- ['ls', '${HOME}']
```

It is also possible to specify full scripts to be executed:

```yaml
commands:
- script: |
    #!/usr/bin/env node
    console.log('Hello, world!');
```

#### `stdout`

How to treat the standard output of the command?
Possible values:

- `pipe` (default) - print the output as the standard output of the autoapply process
- `ignore` - discard any output (like redirecting to /dev/null)

Example:

```yaml
commands:
- command: ls "${HOME}/.ssh/id_rsa"
  stdout: ignore
```

#### `stderr`

The same option as [stdout](#stdout), but for the error output of the command:

```yaml
commands:
- command: curl "$URL"
  stdout: ignore
  stderr: ignore
```

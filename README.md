# autoapply

[![Build Status](https://img.shields.io/travis/pascalgn/autoapply.svg?style=flat-square)](https://travis-ci.org/pascalgn/autoapply) [![NPM version](https://img.shields.io/npm/v/autoapply.svg?style=flat-square)](https://www.npmjs.org/package/autoapply)

Automatically apply changes to a Kubernetes cluster.

## Usage

To start the service locally, run

    $ yarn global add autoapply
    $ vim autoapply.yaml
    $ autoapply autoapply.yaml

For a docker version, use

    $ vim autoapply.yaml
    $ docker run --detach -v $(pwd)/autoapply.yaml:/home/autoapply/autoapply.yaml pascalgn/autoapply

## Configuration

A basic configuration file will look like this:

    loop:
      sleep: 60
      commands:
      - git clone --depth 1 https://github.com/pascalgn/hostinfo
      - kubectl apply -f hostinfo/examples/kubernetes.yaml

When running, autoapply will fetch the latest commit from the git repository and then apply the
configuration to the Kubernetes cluster. After sleeping for 60 seconds, the commands will be
executed again.

See [kubernetes-simple.yaml](examples/kubernetes-simple.yaml) for a simple working example
or [kubernetes-ssh.yaml](examples/kubernetes-ssh.yaml) for a more avanced setup.

# License

Autoapply is licensed under the [MIT License](LICENSE)

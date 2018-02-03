# autoapply

[![Build Status](https://img.shields.io/travis/pascalgn/autoapply.svg?style=flat-square)](https://travis-ci.org/pascalgn/autoapply) [![Coverage status](https://img.shields.io/coveralls/github/pascalgn/autoapply.svg?style=flat-square)](https://coveralls.io/github/pascalgn/autoapply) [![Docker build status](https://img.shields.io/docker/build/pascalgn/autoapply.svg?style=flat-square)](https://hub.docker.com/r/pascalgn/autoapply/) [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/pascalgn/autoapply/blob/master/LICENSE)

Run scripts in a Kubernetes cluster with as little setup as possible.

## Examples

- Automatically apply changes from a Git repository to the Kubernetes cluster
  ([kubernetes-simple.yaml](examples/kubernetes-simple.yaml))
- Serve a static [Gatsby](https://www.gatsbyjs.org/) site, watching repository changes
  ([gatsby-hello-world.yaml](examples/gatsby-hello-world.yaml))
- [...](examples/)

## Usage

To start autoapply locally, run

    $ yarn global add autoapply
    $ vim autoapply.yaml
    $ autoapply autoapply.yaml

For a docker version, use

    $ vim autoapply.yaml
    $ docker run --detach -v $(pwd)/autoapply.yaml:/home/autoapply/autoapply.yaml pascalgn/autoapply autoapply.yaml

## Docker images

* `latest` provides a minimal image with just *autoapply* installed ([Dockerfile](build/Dockerfile))
* `kubectl` also provides *git*, *kubectl* and *[dockerize](https://github.com/jwilder/dockerize)* ([Dockerfile](build/kubectl/Dockerfile))
* `helm` also provides *[helm](https://github.com/kubernetes/helm)* ([Dockerfile](build/helm/Dockerfile))
* `jekyll` also provides *git* and *[jekyll](https://jekyllrb.com)* ([Dockerfile](build/jekyll/Dockerfile))

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

For the full documentation of the configuration, see [autoapply.yaml](examples/autoapply.yaml).

# License

Autoapply is licensed under the [MIT License](LICENSE)

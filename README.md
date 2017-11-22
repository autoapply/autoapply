# autoapply

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

    sleep: 60
    commands:
    - git clone --depth 1 https://github.com/pascalgn/hostinfo
    - kubectl apply -f hostinfo/examples/kubernetes.yaml

When running, autoapply will fetch the latest commit from the git repository and then apply the
configuration to the Kubernetes cluster. After sleeping for 60 seconds, the commands will be
executed again.

See [kubernetes.yaml](examples/kubernetes.yaml) for a working example.

# License

Autoapply is licensed under the [MIT License](LICENSE)

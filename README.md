# autoapply

Automatically apply changes from a remote URL to the Kubernetes cluster

## Usage

To start the service locally, run

    $ export URL=https://user:password123@example.com/repository/my-service.yaml
    $ export SLEEP=60
    $ export KUBECONFIG=~/.kube/config
    $ ./autoapply.py

For a docker version, use

    $ docker run -d -e URL=https://example.com/my-service.yaml pascalgn/autoapply

## License

Autoapply is licensed under the ISC License

FROM python:3.6-alpine

ENV KUBECTL_VERSION v1.8.0
ENV KUBECTL_URL "https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"

RUN apk add --no-cache --virtual build-dependencies curl gcc libffi libffi-dev openssl-dev musl-dev \
    && pip install 'cryptography==2.1.2' 'PyYAML==3.12' \
    && curl --fail "${KUBECTL_URL}" > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && apk del build-dependencies \
    && rm -rf /root/.cache \
    && apk add --no-cache git openssh-client tar \
    && echo 'StrictHostKeyChecking no' >> /etc/ssh/ssh_config \
    && adduser -D -g autoapply autoapply

RUN pip install 'autoapply==0.3.1'

USER autoapply
WORKDIR /home/autoapply

ENV PYTHONUNBUFFERED 1
ENTRYPOINT [ "/usr/local/bin/autoapply-server" ]

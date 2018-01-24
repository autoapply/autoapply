FROM node:alpine

RUN adduser -D -g autoapply autoapply

ENV KUBECTL_URL "https://storage.googleapis.com/kubernetes-release/release/v1.9.0/bin/linux/amd64/kubectl"
RUN apk add --no-cache curl git openssh-client tar \
    && rm -rf /root/.cache \
    && echo 'StrictHostKeyChecking no' >> /etc/ssh/ssh_config \
    && curl --fail "${KUBECTL_URL}" > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && yarn global add forever yaml-crypt slack-cli yaml-cli

RUN yarn global add 'autoapply@0.6.1'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "autoapply" ]

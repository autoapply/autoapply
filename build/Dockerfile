FROM node:9-alpine

ENV KUBECTL_VERSION v1.8.0
ENV KUBECTL_URL "https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"

RUN apk add --no-cache curl git openssh-client tar \
    && rm -rf /root/.cache \
    && curl --fail "${KUBECTL_URL}" > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && echo 'StrictHostKeyChecking no' >> /etc/ssh/ssh_config \
    && adduser -D -g autoapply autoapply

RUN yarn global add yaml-crypt

COPY autoapply.sh /usr/local/bin/autoapply.sh
RUN yarn global add 'autoapply@0.5.3'

USER autoapply
WORKDIR /home/autoapply

ENTRYPOINT [ "sh", "/usr/local/bin/autoapply.sh" ]

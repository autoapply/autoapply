FROM node:alpine

RUN adduser -D -g autoapply autoapply && apk add --no-cache tini

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src \
    && autoapply --version

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]

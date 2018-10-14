FROM node:alpine

RUN adduser -D -g autoapply autoapply && apk add --no-cache tini

RUN yarn global add 'autoapply@0.8.0'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]

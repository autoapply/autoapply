FROM node:9.4.0-alpine

RUN adduser -D -g autoapply autoapply

RUN yarn global add 'autoapply@0.6.1'

USER autoapply
WORKDIR /home/autoapply

ENTRYPOINT [ "autoapply" ]

FROM node:24-alpine@sha256:5fa278c599dbba0c8f873d8717d50ecbb57c5ae6a53b7ab240c25135e0b65995

RUN apk add --no-cache python2 make g++ git bash

WORKDIR /app
ENV PATH="/app/node_modules/.bin:${PATH}"

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["bash"]

FROM node:10-alpine

RUN apk add --no-cache python2 make g++ git bash

WORKDIR /app
ENV PATH="/app/node_modules/.bin:${PATH}"

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["bash"]

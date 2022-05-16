FROM node:14

WORKDIR /usr/server

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "./server/index.js"]
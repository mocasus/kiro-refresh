#!/usr/bin/env node

const { main } = require("../src/cli");

Promise.resolve(main(process.argv.slice(2)))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

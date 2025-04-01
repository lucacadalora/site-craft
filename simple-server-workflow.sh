#!/bin/bash

# Use nodemon for automatic restarting on changes if available
if command -v npx &> /dev/null
then
  echo "Starting server with nodemon..."
  npx nodemon api-server-with-db.js
else
  echo "Starting server with node..."
  node api-server-with-db.js
fi
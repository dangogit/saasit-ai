#!/bin/bash
# Cloudflare Pages build script for frontend

cd frontend
yarn install --frozen-lockfile
yarn build
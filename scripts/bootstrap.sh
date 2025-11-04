#!/usr/bin/env bash
set -euo pipefail

echo "Bootstrapping Solana Axie-style MVP workspace..."

# TODO: detect package manager preference (npm, pnpm, yarn)
echo ">> Installing Node dependencies via npm workspaces"
npm install

# TODO: install Anchor CLI and Solana toolchain if not present
echo ">> Ensure Anchor CLI and Solana toolchain are installed"

# TODO: add steps to initialize environment files
echo ">> Copy .env.example files into place where necessary"

# TODO: run lint and format checks to verify setup
echo ">> Run initial lint and format checks"

echo "Bootstrap skeleton complete. Customize commands before first team run."
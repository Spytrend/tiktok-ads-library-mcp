#!/usr/bin/env node
// tiktok-ads-library-mcp: TikTok ad research tools over the hosted Spytrend MCP server, source pinned to TikTok.
import { readFile } from "node:fs/promises";
import { adapterConfig } from "./src/adapter-config.js";
import { startAdapter } from "./src/adapter.js";

const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
startAdapter({ name: "tiktok-ads-library-mcp", version: pkg.version, config: adapterConfig });

#!/usr/bin/env bun
import { $ } from "bun";

const sizeResult = await $`du -sk dist/client`.text();
const sizeKB = Number.parseInt(sizeResult.split("\t")[0]);

const chunkCount = await $`ls dist/client/assets/*.js | wc -l`.text();
const chunks = Number.parseInt(chunkCount.trim());

console.log(`dist/client (${sizeKB} kB | ${chunks} chunks)`);

#!/usr/bin/env bun
import { $ } from "bun"

const sizeResult = await $`du -sk .output/public`.text()
const sizeKB = Number.parseInt(sizeResult.split("\t")[0], 10)

const chunkCount = await $`ls .output/public/assets/*.js | wc -l`.text()
const chunks = Number.parseInt(chunkCount.trim(), 10)

console.log(`.output/public (${sizeKB} kB | ${chunks} chunks)`)

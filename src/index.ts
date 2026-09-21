#!/usr/bin/env node

import { buildProgram } from "./cli.js";

const program = buildProgram();
await program.parseAsync(process.argv);

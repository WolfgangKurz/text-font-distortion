import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import cp from "node:child_process";

import express from "express";
import mustache from "mustache";
import { createSeedFromUint8Array, seededShuffle } from "./shuffle.mjs";

const __dirname = import.meta.dirname;

const content = fs.readFileSync(path.resolve(__dirname, "..", "res", "content.txt"), "utf-8");

function getFontPath (hash) {
    return path.resolve(__dirname, "..", "cache", `TFD_${hash}.woff`);
}

express()
    .get("/", (req, res) => {
        const token = new Uint8Array(32);
        crypto.getRandomValues(token);
        const hash = Buffer.from(token).toString("hex");

        let sig;
        {
            const used_chars = [...new Set(content.split(""))]
                .sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
            const used_chars_str = used_chars.join("");

            sig = crypto.hash("sha1", used_chars_str, "hex");
            if (!fs.existsSync(getFontPath(sig))) {
                cp.spawnSync("py",
                    [
                        path.resolve(__dirname, "..", "ext", "subset.py"),
                        used_chars_str,
                        sig,
                    ],
                );
            }
        }

        {
            const fontPath = getFontPath(sig);
            const used_chars = fs.readFileSync(
                path.join(
                    path.dirname(fontPath),
                    path.basename(fontPath, ".woff") + ".txt"
                ),
                "utf-8"
            ).split("");

            const lcgSeed = createSeedFromUint8Array(token);
            const shuffled_array = seededShuffle(new Array(used_chars.length).fill(0).map((_, i) => i), lcgSeed);

            const ref_table = {}; // make reverse table
            used_chars.forEach(c => (ref_table[c] = used_chars[shuffled_array.findIndex(v => used_chars[v] === c)]));

            const template = fs.readFileSync(path.resolve(__dirname, "..", "res", "template.html"), "utf-8");
            res.send(
                mustache.render(template, {
                    content: content.split("")
                        .map(c => {
                            if (c in ref_table) return ref_table[c];
                            return c;
                        })
                        .join(""),
                    token: hash,
                    sig,
                })
            );
        }
    })
    .get("/@tfd.woff", (req, res) => {
        if (!("token" in req.query)) return res.sendStatus(404);

        const token = req.query["token"];
        const sig = req.query["sig"];
        const fontPath = path.resolve(__dirname, "..", "cache", `TFD_${sig}.woff`);
        if (!fs.existsSync(fontPath)) return res.sendStatus(404);

        res.setHeader("Content-Type", "font/woff");

        const p = cp.spawn("py",
            [
                path.resolve(__dirname, "..", "ext", "font.py"),
                token,
                sig,
            ],
        );
        p.stdout.pipe(res);
    })
    .listen(8080);

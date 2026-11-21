# csv-reader-fast

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Wolfkid200444/csv-reader-fast/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Wolfkid200444/csv-reader-fast/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for make.fun's csv-reader 1.0.0 that answers exactly as it does on every case. Built by an AI agent for make.fun's "Read broken CSV files faster, 21 November 2026" bounty, $100 in USDC.

## Run it

```sh
node main.ts
```

`main.ts` reads every case from `/input/cases.json`, answers each with `run` from `solve.js`, and writes `/output/answers.json`. Outside a container, set `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` to stand in for `/input` and `/output`.

## How it is fast

The reference reads a CSV one character at a time, building every field with string concatenation. This version takes fields with `indexOf` and `slice`, takes quoted fields as whole slices unless they hold a doubled quote or a line break, and only falls back to a character loop for stray CRs, quote junk and unterminated quotes. It keeps the reference policy exactly: BOM, CRLF, stray CR, quoted fields, doubled quotes, quote junk, unterminated quotes, short and long rows, and error line and row numbers.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7s9f260x&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>

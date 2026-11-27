#!/usr/bin/env bash
# Download the quirq.ai research + writing pages into ./pages (git-ignored), then run:
#   python3 gen.py ../../js
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p pages
get() { curl -sL -A "Mozilla/5.0" "https://www.quirq.ai/$1" -o "pages/$2.html"; }
for s in routing-with-levanto-sage the-quirq unit-of-work the-quirq-calculus the-company-dashboard validation research-series \
  environment-and-token-cost the-incurious-agent the-self-sufficient-agent relevance-not-volume curiosity-comparison \
  coding-model-eval-harness harvey-case-study alignment-environments tokenizer-not-the-language organic-vs-synthetic-evaluation-data; do
  get "research/$s" "research_$s"
done
for s in the-orientation-tax synthetic-data-never-beats-the-real-thing your-ai-knows-when-its-being-tested rtfm \
  agents-look-a-lot-like-quiet-quitters the-agent-she-told-you-not-to-worry-about the-language-is-not-the-problem \
  point-and-call the-advantage-was-never-the-model the-benchmark-that-did-not-finish; do
  get "writing/$s" "writing_$s"
done
get whitepaper paper_whitepaper
echo "Fetched. Cover images live in ../../assets/research and ../../assets/writing."

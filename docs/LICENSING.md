# Licensing decision

Status: recommend retaining MIT; explicit owner confirmation of the project
licensing policy is pending.

## Existing evidence

The initial repository already contains [LICENSE](../LICENSE), an MIT license
with the notice `Copyright (c) 2026 Bekzhan Izbassar`. This foundation change
preserves that file byte for byte and does not replace, revoke, or add conditions
to its existing grant. Its presence is evidence of the repository's current text,
not a new owner approval obtained during this task.

## Recommendation

Retain MIT because its short permissive terms allow reuse and contribution with
limited administrative burden, while requiring preservation of the notice and
disclaimer. MIT does not promise a working product, grant rights to third-party
models or provider services, or replace those parties' terms.

The owner should explicitly confirm retaining the current license. If a change
is desired, review existing contributions and rights before editing LICENSE.
Do not insert the assistant, a guessed organization, or another project's authors
into copyright notices. Preserve notices for any future third-party material.

## Experimental provider dependencies

The Node-only proof pins AI SDK 7.0.148, its provider protocol 4.0.31 and the
community ollama-ai-provider-v2 4.0.1 (Apache-2.0), plus Zod 4.6.7 (MIT).
Installed packages retain their upstream license files; these dependencies do not
replace the project's MIT notice. No third-party source was copied into the office.

The verification host installed official Ollama 0.40.8 outside the repository and
pulled qwen3:1.7b through that daemon. The model's installed metadata includes an
Apache-2.0 license; its manifest digest is recorded in the
[real proof evidence](proofs/ollama-notes-2026-10-22.json). No daemon binary,
model weights, private keys or downloaded assets are committed or redistributed.
Recheck upstream notices and model terms before packaging or redistribution.

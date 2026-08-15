# SmokeStack database harvesters

SmokeStack harvesters collect source-backed candidates for every shared knowledge database without automatically trusting or publishing them.

## Covered databases

| Harvester | Published record type | Approved source class |
|---|---|---|
| Smokers and grills | `smoker` | Official manufacturer |
| Pellets | `fuel` with pellet classification | Official pellet or equipment manufacturer |
| Other BBQ fuels | `fuel` | Official fuel or equipment manufacturer |
| Meat cuts and anatomy | `meat` | Government, university, or approved primary industry source |
| Meat safety and BBQ cook targets | `temperature` | USDA/FSIS or approved culinary/meat-science source |
| Mods and accessories | `mod` | Official manufacturer |
| Recipes and techniques | `recipe` | Approved government, culinary education, or primary industry source |
| Retail fuel prices | `retailer_price` | Approved retailer; observation expires after 24 hours |

## Constitutional workflow

1. An OWNER registers an HTTPS source in SmokeStack Operations.
2. SmokeStack validates the source against the database-specific allowlist.
3. The source is harvested immediately and then rechecked every Tuesday.
4. Exact source evidence and structured values are stored in Firestore as `pending_review`.
5. Identical evidence is deduplicated. Changed evidence creates a new review candidate.
6. An OWNER opens the source and either publishes or rejects the candidate.
7. Only published records may be retrieved by CharGPT.

Harvesters never publish automatically, infer unsupported specifications, convert user submissions into manufacturer facts, or repurpose user-owned account data.

## Scheduled operation

The `Harvest SmokeStack databases` GitHub Actions workflow uses Workload Identity Federation and the dedicated `smokestack-harvester` service account. That identity receives only Firestore data access and cannot deploy Cloud Run, edit Firebase rules, publish containers, or manage IAM.

Before the first scheduled run, an OWNER must run the updated idempotent bootstrap once to create the dedicated identity:

```bash
bash scripts/bootstrap-cloudrun-github.sh
```

This is a one-time sensitive authorization. Normal harvesting afterward is automatic.

## OWNER controls

Open **SmokeStack Operations → Knowledge → All Database Harvesters** to:

- register an official source and harvest it immediately;
- view every scheduled source and its latest result;
- pause or resume a source;
- run all registered sources immediately;
- approve or reject every resulting candidate in the existing Pending Review queue.

A failed source records its error without replacing or unpublishing previously reviewed knowledge.

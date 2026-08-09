# Important: reproducible upstream workflow

This directory is the source of truth for modifications to the StackChan
firmware in `../upstream/`.

## Mandatory rule

Before modifying anything inside `../upstream/`, read this file.

Every intentional firmware change must be represented by a patch in this
directory. Do not leave important changes only as uncommitted edits inside
`../upstream/`.

The reproducible workflow is:

```text
clean upstream clone + patches/0001...0006.patch = working firmware
```

## Before changing upstream

1. Read this file and inspect the current patch list.
2. Confirm the current upstream state and configuration.
3. Decide which existing patch should be updated or whether a new numbered
   patch is needed.
4. Make the smallest necessary change in `../upstream/`.
5. Generate or update a patch immediately.
6. Test that the patch applies to a fresh upstream clone.

## Patch order

`bootstrap.sh` applies patches in this order:

```text
0001-cores3-spiffs-config-fallback.patch
0002-english-default-role.patch
0003-realtime-audio-playback-queue.patch
0004-malay-default-role.patch
0005-reduce-realtime-serial-logging.patch
0006-revospeech-local-bridge.patch
```

New patches must use the next number and must be added to
`scripts/bootstrap.sh` in the correct order.

## Recovery workflow

If `../upstream/` becomes broken or contains experimental edits:

```bash
cd ..
mv upstream upstream-broken-backup
./scripts/bootstrap.sh
./scripts/apply-local-config.sh
./scripts/flash.sh
```

Do not delete the backup until the rebuilt firmware has been verified.

## Verification

Check the bootstrap script before using it:

```bash
bash -n scripts/bootstrap.sh
```

For a clean upstream clone, verify patch application with:

```bash
git -C upstream apply --check patches/0001-*.patch
```

The normal verification is to run:

```bash
./scripts/bootstrap.sh
./scripts/apply-local-config.sh
./scripts/flash.sh
```

Keep secrets in `local/`; do not put Wi-Fi credentials or API keys into
patches or tracked example configuration files.

The `upstream/` directory is disposable. The patches, scripts, and documented
configuration are what must preserve the implementation.

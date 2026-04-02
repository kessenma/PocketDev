# Mobile Container UI

The mobile container screen is a standalone workspace reachable from Settings.

## What it does

- loads containers from `docker ps -a`
- shows running, restarting, exited, and paused counts
- lets you pick any container from the list
- loads log snapshots from either the beginning or the end
- filters logs down to likely errors only
- follows live logs over the existing PocketDev websocket connection

## Log controls

The log panel exposes three controls:

1. `Line Count`
   Use this to bound the initial log snapshot. The current implementation caps requests at 1000 lines.

2. `Read From`
   `From End` maps to the tail of the log stream.
   `From Start` maps to the beginning of the log stream.

3. `Filter`
   `All Lines` returns everything PocketDev reads.
   `Errors Only` returns stderr lines and lines that match common error patterns such as `error`, `fatal`, `exception`, `panic`, `failed`, `traceback`, `refused`, or `timeout`.

## Follow mode

`Follow Live` starts a websocket-backed log stream for the selected container.

- If `From End` is selected, follow mode starts from the latest tail window and continues with live output.
- If `From Start` is selected, PocketDev first sends the requested head snapshot and then follows only new output.

## Current limitations

- errors-only mode is heuristic, not perfect stderr classification for snapshot reads
- there is no container lifecycle control yet
- there is no AI-assisted inspect flow yet

## Planned next step

The next meaningful extension is an `Inspect with AI` action that launches a regular PocketDev task with:

- selected container metadata
- `docker inspect` output
- a bounded log excerpt

That keeps AI execution on the existing task runner instead of adding a second execution path.
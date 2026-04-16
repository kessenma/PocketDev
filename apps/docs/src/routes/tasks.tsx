import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
})

function TasksPage() {
  return (
    <>
      <h1>Tasks</h1>
      <p>
        Tasks are AI agent processes that run on your server and stream their output to your device
        in real time. You can start a task from anywhere, monitor it as the agent works, respond to
        questions and permission prompts, and continue a conversation after the task completes.
      </p>

      <h2>Providers</h2>
      <p>
        PocketDev supports four agent providers. Each provider has different capabilities and is
        suited to different kinds of work.
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Backing technology</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Claude</td>
            <td>tmux + hooks file (structured JSON events)</td>
            <td>Complex code tasks, multi-turn conversations, plan mode</td>
          </tr>
          <tr>
            <td>GitHub Copilot</td>
            <td>tmux + pane capture</td>
            <td>Quick edits, GitHub-aware tasks</td>
          </tr>
          <tr>
            <td>Codex</td>
            <td>stdio JSON-RPC</td>
            <td>OpenAI-backed coding tasks, multi-turn conversations</td>
          </tr>
          <tr>
            <td>Shell</td>
            <td>sh -c</td>
            <td>Arbitrary shell commands and scripts</td>
          </tr>
        </tbody>
      </table>
      <p>
        Provider and model are selected when creating a task. Tool paths for each CLI are configured
        during server setup.
      </p>

      <h2>Creating a Task</h2>
      <p>To start a new task:</p>
      <ol>
        <li>Tap the <strong>+</strong> button on the Tasks screen</li>
        <li>Write your prompt describing what the agent should do</li>
        <li>Select a provider (Claude, Codex, Copilot, or Shell) and optionally a model</li>
        <li>Optionally pin files from your repository for focused context</li>
        <li>Choose a task mode (see below)</li>
        <li>Tap <strong>Start Task</strong></li>
      </ol>

      <h3>Modes</h3>
      <p>
        <strong>Default mode</strong> gives the agent full execution permissions. It reads files,
        runs commands, and applies edits automatically as it works.
      </p>
      <p>
        <strong>Plan mode</strong> runs the agent with restricted permissions. Instead of making
        changes, the agent produces a proposed plan — a list of steps it would take — for you to
        review and approve before anything is executed.
      </p>

      <h2>Live Stream</h2>
      <p>
        While a task is running, output streams to your device over a WebSocket connection. The
        stream is organized into activity cards grouped by what the agent was doing at each step.
      </p>

      <h3>Activity Categories</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Activities included</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Researching</td>
            <td>File reads, code searches, glob patterns, web lookups</td>
          </tr>
          <tr>
            <td>Writing</td>
            <td>File edits and creations</td>
          </tr>
          <tr>
            <td>Planning</td>
            <td>Todo list updates, planning tool calls</td>
          </tr>
          <tr>
            <td>Running</td>
            <td>Shell command executions</td>
          </tr>
        </tbody>
      </table>
      <p>
        The result card appears when the agent produces final text output. Reasoning previews
        (thinking) are shown inline within activity cards.
      </p>

      <h3>Task Checklist</h3>
      <p>
        When an agent calls <code>TodoWrite</code> (Claude) or <code>update_plan</code> (Codex),
        the stream displays a collapsible <strong>Tasks</strong> card showing each to-do item with
        its current status — pending, in progress, or completed. A slim progress strip also appears
        below the status bar showing how many items are done out of the total. Both are only shown
        when the agent actually produces a checklist; tasks that don't use TodoWrite show neither.
      </p>

      <h3>Context Limit</h3>
      <p>
        When Claude's context window approaches capacity, PocketDev detects the warning in the
        terminal output and surfaces a prompt asking whether to run <code>/compact</code>. Choosing
        "Run /compact" sends the command to the Claude session, which summarises the conversation
        history to free context space and lets the task continue.
      </p>

      <h3>Raw Logs</h3>
      <p>
        Toggle the raw log view to see unprocessed output lines directly from the agent CLI. Raw
        logs are what gets stored for history — the structured activity view is rebuilt live from
        the current session.
      </p>

      <h2>Permissions and Questions</h2>
      <p>
        The agent may pause mid-task to ask for your approval or input. When this happens, a sheet
        slides up from the bottom of the task screen with the request.
      </p>

      <h3>Request Types</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>When it appears</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Permission</td>
            <td>Agent wants to run a command, edit a file, or take an elevated action</td>
          </tr>
          <tr>
            <td>Yes / No</td>
            <td>Simple confirmation prompt</td>
          </tr>
          <tr>
            <td>Multiple choice</td>
            <td>Agent needs you to pick one option from a list</td>
          </tr>
          <tr>
            <td>Free response</td>
            <td>Agent needs an open text answer</td>
          </tr>
          <tr>
            <td>Form</td>
            <td>Several questions asked together as a structured form</td>
          </tr>
        </tbody>
      </table>
      <p>
        Tap your answer and the agent resumes. If you're away from your device when a permission is
        needed, you'll receive a push notification so you can respond.
      </p>

      <h2>Steering a Running Task</h2>
      <p>
        While a task is running you can interact with it directly from the task detail screen without
        stopping or restarting it.
      </p>

      <h3>Quick Commands (Claude)</h3>
      <p>
        A row of one-tap command buttons appears at the bottom of the screen when a Claude task is
        active. Tapping a button sends the command directly to the Claude session:
      </p>
      <table>
        <thead>
          <tr>
            <th>Button</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>/compact</code></td>
            <td>Summarises the conversation history to free context space</td>
          </tr>
          <tr>
            <td><code>/clear</code></td>
            <td>Clears the current conversation context</td>
          </tr>
          <tr>
            <td><code>/init</code></td>
            <td>Re-reads the repo's CLAUDE.md and refreshes project context</td>
          </tr>
        </tbody>
      </table>

      <h3>Steering Input</h3>
      <p>
        A text field labelled <em>Steer the agent…</em> is shown for all running tasks. Type a
        message and tap send to inject it as raw input into the agent's session. Use this to redirect
        the agent mid-task — for example to refocus it on a different file or correct a
        misunderstanding — without killing and restarting.
      </p>

      <h2>Multi-Turn Conversations</h2>
      <p>
        Claude and Codex tasks support continuation. After a task completes, you can send a
        follow-up message and the agent will resume the same session, retaining full context from
        the previous exchange.
      </p>
      <p>
        When a task has more than one turn, the prompt card is replaced by a conversation view
        showing all turns — your messages and the assistant's responses — as a familiar chat thread.
        Each new turn is tracked and stored for history alongside the original task.
      </p>
      <p>
        Continuation is not available for Copilot or Shell tasks.
      </p>

      <h2>Debug Tools</h2>
      <p>
        When a task fails, a debug button appears in the task status bar. Tapping it opens the
        debug sheet, which inspects the task's output logs and your server's tool configuration to
        pre-select the most likely cause of failure.
      </p>

      <h3>Auth Repair</h3>
      <p>
        If the agent CLI is not authenticated — expired token, logged out, or revoked credentials —
        the debug sheet will pre-select the auth issue and walk you through re-authenticating
        without going through the full tool install wizard again.
      </p>

      <h2>Task History</h2>
      <p>
        Completed tasks are listed on the Tasks screen. Raw logs are cached locally on your device
        for fast access. If the local cache is missing (for example after reinstalling the app),
        logs are fetched from the server on demand.
      </p>
      <p>
        Structured activity data — activity cards, conversation history, result text — is only
        available for the current live session. Historical task viewing always uses the raw log
        feed.
      </p>

      <h2>Wire Protocol Reference</h2>
      <p>
        Tasks use a WebSocket connection between your device and the PocketDev agent. Commands are
        messages your device sends to the server; events are messages the server sends back.
      </p>

      <h3>Commands</h3>
      <table>
        <thead>
          <tr>
            <th>Command</th>
            <th>Payload</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>task.start</code></td>
            <td><code>{'{'} prompt, agentType, workingDirectory?, model?, mode? {'}'}</code></td>
            <td>Start a new task</td>
          </tr>
          <tr>
            <td><code>task.continue</code></td>
            <td><code>{'{'} taskId, prompt, model? {'}'}</code></td>
            <td>Continue a completed Claude or Codex task with a follow-up message</td>
          </tr>
          <tr>
            <td><code>task.kill</code></td>
            <td><code>{'{'} taskId {'}'}</code></td>
            <td>Kill a running task</td>
          </tr>
          <tr>
            <td><code>task.input</code></td>
            <td><code>{'{'} taskId, data {'}'}</code></td>
            <td>Send raw stdin to the process</td>
          </tr>
          <tr>
            <td><code>task.answer</code></td>
            <td><code>{'{'} taskId, questionId, answer {'}'}</code></td>
            <td>Answer an agent prompt or permission request</td>
          </tr>
          <tr>
            <td><code>task.list</code></td>
            <td>—</td>
            <td>Request the list of recent tasks</td>
          </tr>
        </tbody>
      </table>

      <h3>Events</h3>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Payload</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>task.output</code></td>
            <td><code>{'{'} taskId, stream, line {'}'}</code></td>
            <td>Raw log line from the agent process</td>
          </tr>
          <tr>
            <td><code>task.activity</code></td>
            <td><code>{'{'} taskId, activity, timestamp {'}'}</code></td>
            <td>Normalized activity (tool use, result, thinking, text, status)</td>
          </tr>
          <tr>
            <td><code>task.question</code></td>
            <td><code>{'{'} questionId, taskId, prompt, type, options?, fields? {'}'}</code></td>
            <td>Agent question requiring user input</td>
          </tr>
          <tr>
            <td><code>task.permission_request</code></td>
            <td><code>{'{'} taskId, denials[] {'}'}</code></td>
            <td>Permission denial details for approval</td>
          </tr>
          <tr>
            <td><code>task.status_changed</code></td>
            <td><code>{'{'} taskId, status {'}'}</code></td>
            <td>Task status transition</td>
          </tr>
          <tr>
            <td><code>task.completed</code></td>
            <td><code>{'{'} taskId, exitCode, status {'}'}</code></td>
            <td>Task finished (completed, failed, or killed)</td>
          </tr>
          <tr>
            <td><code>task.turn_started</code></td>
            <td><code>{'{'} taskId, turnNumber {'}'}</code></td>
            <td>New continuation turn is starting</td>
          </tr>
          <tr>
            <td><code>task.list</code></td>
            <td><code>{'{'} tasks[] {'}'}</code></td>
            <td>Response to a task.list command</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

import type { Command } from "commander";
import { listPairingChannels, notifyPairingApproved } from "../channels/plugins/pairing.js";
import { normalizeChannelId } from "../channels/plugins/index.js";
import { loadConfig } from "../config/config.js";
import { getI18n } from "../locale/index.js";
import { resolvePairingIdLabel } from "../pairing/pairing-labels.js";
import {
  approveChannelPairingCode,
  listChannelPairingRequests,
  type PairingChannel,
} from "../pairing/pairing-store.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { formatCliCommand } from "./command-format.js";

/** Parse channel, allowing extension channels not in core registry. */
function parseChannel(raw: unknown, channels: PairingChannel[]): PairingChannel {
  const value = (
    typeof raw === "string"
      ? raw
      : typeof raw === "number" || typeof raw === "boolean"
        ? String(raw)
        : ""
  )
    .trim()
    .toLowerCase();
  if (!value) throw new Error("Channel required");

  const normalized = normalizeChannelId(value);
  if (normalized) {
    if (!channels.includes(normalized as PairingChannel)) {
      throw new Error(`Channel ${normalized} does not support pairing`);
    }
    return normalized as PairingChannel;
  }

  // Allow extension channels: validate format but don't require registry
  if (/^[a-z][a-z0-9_-]{0,63}$/.test(value)) return value as PairingChannel;
  throw new Error(`Invalid channel: ${value}`);
}

async function notifyApproved(channel: PairingChannel, id: string) {
  const cfg = loadConfig();
  await notifyPairingApproved({ channelId: channel, id, cfg });
}

export function registerPairingCli(program: Command) {
  const i18n = getI18n();
  const channels = listPairingChannels();
  const pairing = program
    .command("pairing")
    .description(i18n.t("cli.commands.pairing"))
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/pairing", "docs.openclaw.ai/cli/pairing")}\n`,
    );

  pairing
    .command("list")
    .description(i18n.t("nodes.pairing.pending"))
    .option("--channel <channel>", `Channel (${channels.join(", ")})`)
    .argument("[channel]", `Channel (${channels.join(", ")})`)
    .option("--json", "Print JSON", false)
    .action(async (channelArg, opts) => {
      const channelRaw = opts.channel ?? channelArg;
      if (!channelRaw) {
        throw new Error(
          `Channel required. Use --channel <channel> or pass it as the first argument (expected one of: ${channels.join(", ")})`,
        );
      }
      const channel = parseChannel(channelRaw, channels);
      const requests = await listChannelPairingRequests(channel);
      if (opts.json) {
        defaultRuntime.log(JSON.stringify({ channel, requests }, null, 2));
        return;
      }
      if (requests.length === 0) {
        defaultRuntime.log(theme.muted(`${i18n.t("nodes.pairing.pending")} for ${channel}: none`));
        return;
      }
      const idLabel = resolvePairingIdLabel(channel);
      const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
      defaultRuntime.log(
        `${theme.heading(i18n.t("nodes.pairing.pending"))} ${theme.muted(`(${requests.length})`)}`,
      );
      defaultRuntime.log(
        renderTable({
          width: tableWidth,
          columns: [
            { key: "Code", header: "Code", minWidth: 10 },
            { key: "ID", header: idLabel, minWidth: 12, flex: true },
            { key: "Meta", header: "Meta", minWidth: 8, flex: true },
            { key: "Requested", header: "Requested", minWidth: 12 },
          ],
          rows: requests.map((r) => ({
            Code: r.code,
            ID: r.id,
            Meta: r.meta ? JSON.stringify(r.meta) : "",
            Requested: r.createdAt,
          })),
        }).trimEnd(),
      );
    });

  pairing
    .command("approve")
    .description(i18n.t("nodes.pairing.approved"))
    .option("--channel <channel>", `Channel (${channels.join(", ")})`)
    .argument("<codeOrChannel>", "Pairing code (or channel when using 2 args)")
    .argument("[code]", "Pairing code (when channel is passed as 1st arg)")
    .option("--notify", "Notify requester on same channel", false)
    .action(async (codeOrChannel, code, opts) => {
      const channelRaw = opts.channel ?? codeOrChannel;
      const resolvedCode = opts.channel ? codeOrChannel : code;
      if (!opts.channel && !code) {
        throw new Error(
          `Usage: ${formatCliCommand("openclaw pairing approve <channel> <code>")} (or: ${formatCliCommand("openclaw pairing approve --channel <channel> <code>")})`,
        );
      }
      if (opts.channel && code != null) {
        throw new Error(
          `Too many arguments. Use: ${formatCliCommand("openclaw pairing approve --channel <channel> <code>")}`,
        );
      }
      const channel = parseChannel(channelRaw, channels);
      const approved = await approveChannelPairingCode({
        channel,
        code: String(resolvedCode),
      });
      if (!approved) {
        throw new Error(`${i18n.t("nodes.pairing.timeout")}: ${String(resolvedCode)}`);
      }

      defaultRuntime.log(
        `${theme.success(i18n.t("nodes.pairing.approved"))} ${theme.muted(channel)} sender ${theme.command(approved.id)}.`,
      );

      if (!opts.notify) return;
      await notifyApproved(channel, approved.id).catch((err) => {
        defaultRuntime.log(theme.warn(`Failed to notify requester: ${String(err)}`));
      });
    });
}

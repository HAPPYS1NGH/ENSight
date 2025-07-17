import { ActionPanel, Action, Detail, showToast, Toast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

const TEXT_KEYS = [
  "avatar",
  "description",
  "email",
  "url",
  "com.twitter",
  "com.github",
  "com.discord",
  "notice",
  "keywords",
  "location",
  "website",
  "header",
];

export default function Command(props: LaunchProps<{ arguments: Arguments.LookupEnsName }>) {
  const name = props.arguments.name;
  const [address, setAddress] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string | null>>({});
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveENS() {
      try {
        await showToast({ style: Toast.Style.Animated, title: `Resolving ${name}...` });
        const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
        const resolved = await provider.resolveName(name);
        if (!resolved) {
          setError("No address found for this name.");
          setLoading(false);
          return;
        }
        setAddress(resolved);
        const resolver = await provider.getResolver(name);
        if (resolver) {
          const recs: Record<string, string | null> = {};
          for (const key of TEXT_KEYS) {
            try {
              recs[key] = await resolver.getText(key);
            } catch {
              recs[key] = null;
            }
          }
          setRecords(recs);
          try {
            const ch = await resolver.getContentHash();
            setContentHash(ch);
          } catch {
            setContentHash(null);
          }
        }
      } catch (e: unknown) {
        setError("Failed to resolve name.");
      }
      setLoading(false);
    }
    resolveENS();
  }, [name]);

  if (error) {
    return <Detail isLoading={false} markdown={`**${name}**\n\n${error}`} />;
  }

  if (address) {
    let markdown = `**${name}**\n\n**Address:**\n\`\`\`${address}\`\`\``;
    if (Object.values(records).some((v) => v)) {
      markdown += "\n\n**Text Records:**\n";
      for (const key of TEXT_KEYS) {
        if (records[key]) {
          if (key === "avatar") {
            markdown += `- **${key}:** ![](${records[key]}) (${records[key]})\n`;
          } else {
            markdown += `- **${key}:** ${records[key]}\n`;
          }
        }
      }
    }
    if (contentHash) {
      markdown += `\n**Content Hash:**\n\`${contentHash}\``;
    }
    return (
      <Detail
        isLoading={false}
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={address} title="Copy Address" />
            <Action.OpenInBrowser url={`https://etherscan.io/address/${address}`} title="View on Etherscan" />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={loading} markdown={`Resolving **${name}**...`} />;
}

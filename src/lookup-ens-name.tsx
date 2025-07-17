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
      let toast: Toast | undefined = undefined;
      try {
        toast = await showToast({ style: Toast.Style.Animated, title: `Looking up ENS details...` });
        const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
        const resolved = await provider.resolveName(name);
        if (!resolved) {
          setError("No address found for this name.");
          if (toast) {
            toast.style = Toast.Style.Failure;
            toast.title = "No address found";
            toast.message = `No address is associated with ${name}.`;
          }
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
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "ENS details found";
          toast.message = `Details for ${name} loaded successfully.`;
        }
      } catch (e: unknown) {
        setError("Failed to resolve name.");
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Something went wrong";
          toast.message = `Couldn't load details for ${name}.`;
        }
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
    const hasRecords = Object.values(records).some((v) => v);
    const avatarUrl = records["avatar"];
    if (avatarUrl) {
      markdown += `\n\n**Avatar:**\n<img src="${avatarUrl}" alt="avatar" width="80" height="80" />\n(${avatarUrl})`;
    }
    if (hasRecords) {
      markdown += "\n\n**Text Records:**\n";
      markdown += `| Key | Value |\n| --- | ----- |\n`;
      for (const key of TEXT_KEYS) {
        if (records[key] && key !== "avatar") {
          markdown += `| ${key} | ${records[key]} |\n`;
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

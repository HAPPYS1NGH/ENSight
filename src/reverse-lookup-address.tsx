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

export default function Command(props: LaunchProps<{ arguments: Arguments.ReverseLookupAddress }>) {
  const ethAddress = props.arguments.ethAddress;
  const [ensName, setEnsName] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string | null>>({});
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleLookup() {
      let toast: Toast | undefined = undefined;
      try {
        if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
          setError("Invalid Ethereum address.");
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid address",
            message: "Please enter a valid Ethereum address.",
          });
          setLoading(false);
          return;
        }
        toast = await showToast({ style: Toast.Style.Animated, title: "Looking up ENS details..." });
        const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
        const name = await provider.lookupAddress(ethAddress);
        if (!name) {
          setError("No ENS name found for this address.");
          if (toast) {
            toast.style = Toast.Style.Failure;
            toast.title = "No ENS name found";
            toast.message = `No ENS name is associated with this address.`;
          }
          setLoading(false);
          return;
        }
        setEnsName(name);
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
        setError("Failed to lookup ENS name.");
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Something went wrong";
          toast.message = `Couldn't load details for this address.`;
        }
      } finally {
        setLoading(false);
      }
    }
    handleLookup();
  }, [ethAddress]);

  if (error) {
    return <Detail isLoading={false} markdown={`**${ethAddress}**\n\n${error}`} />;
  }

  if (ensName) {
    let markdown = `**${ethAddress}**\n\n**ENS Name:**\n\`\`\`${ensName}\`\`\``;
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
            <Action.CopyToClipboard content={ensName} title="Copy ENS Name" />
            <Action.OpenInBrowser url={`https://app.ens.domains/${ensName}`} title="View on ENS" />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={loading} markdown={`Looking up ENS details for **${ethAddress}**...`} />;
}

import { ActionPanel, Action, Detail, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
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
        const provider = new ethers.JsonRpcProvider(
          "https://eth-mainnet.g.alchemy.com/v2/pH0wx1rqHjA0KvL2k8K3gqiziBFRwLKE",
        );
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
    const avatarUrl = records["avatar"];
    const twitter = records["com.twitter"];
    const github = records["com.github"];
    const website = records["website"] || records["url"];
    const discord = records["com.discord"];

    let markdown = "";
    if (avatarUrl) {
      markdown += `\n<img src="${avatarUrl}" alt="avatar" width="100" height="100" />\n\n---\n`;
    }
    markdown += `# ${name}\n`;
    markdown += `**Address:** \`${address}\`\n\n`;
    if (contentHash) {
      markdown += `**Content Hash:** \`${contentHash}\`\n`;
    }
    // Social links row
    if (twitter || github || website || discord) {
      markdown += "\n**Links:** ";
      if (twitter) markdown += `[🐦 Twitter](https://twitter.com/${twitter.replace(/^@/, "")}) `;
      if (github) markdown += `[💻 GitHub](https://github.com/${github.replace(/^@/, "")}) `;
      if (discord) markdown += `[💬 Discord](https://discord.com/users/${discord}) `;
      if (website) markdown += `[🌐 Website](${website}) `;
      markdown += "\n";
    }
    // Description
    if (records["description"]) {
      markdown += `\n> ${records["description"]}\n`;
    }

    // Only secondary fields in metadata
    const secondaryKeys = TEXT_KEYS.filter(
      (key) => !["avatar", "com.twitter", "com.github", "com.discord", "website", "url", "description"].includes(key),
    );

    return (
      <Detail
        isLoading={false}
        navigationTitle={name}
        markdown={markdown}
        metadata={
          secondaryKeys.filter((key) => records[key]).length > 0 ? (
            <Detail.Metadata>
              <Detail.Metadata.Label title="Other Details" />
              {secondaryKeys
                .filter((key) => records[key])
                .map((key) => (
                  <Detail.Metadata.Label key={key} title={key} text={records[key] || "-"} />
                ))}
            </Detail.Metadata>
          ) : undefined
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={address} title="Copy Address" />
            <Action.CopyToClipboard content={name} title="Copy ENS Name" />
            <Action.OpenInBrowser url={`https://etherscan.io/address/${address}`} title="View on Etherscan" />
            {twitter && (
              <Action.OpenInBrowser
                url={`https://twitter.com/${twitter.replace(/^@/, "")}`}
                title="Open Twitter"
                icon={Icon.TwoArrowsClockwise}
              />
            )}
            {github && (
              <Action.OpenInBrowser
                url={`https://github.com/${github.replace(/^@/, "")}`}
                title="Open GitHub"
                icon={Icon.TwoArrowsClockwise}
              />
            )}
            {discord && (
              <Action.OpenInBrowser
                url={`https://discord.com/users/${discord}`}
                title="Open Discord"
                icon={Icon.TwoArrowsClockwise}
              />
            )}
            {website && <Action.OpenInBrowser url={website} title="Open Website" icon={Icon.Globe} />}
            {Object.entries(records).map(([key, value]) =>
              value &&
              !["avatar", "com.twitter", "com.github", "com.discord", "website", "url", "description"].includes(key) ? (
                <Action.CopyToClipboard key={key} content={value} title={`Copy ${key}`} />
              ) : null,
            )}
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={loading} markdown={`Resolving **${name}**...`} />;
}

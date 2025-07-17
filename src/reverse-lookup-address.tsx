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
    const avatarUrl = records["avatar"];
    const twitter = records["com.twitter"];
    const github = records["com.github"];
    const website = records["website"] || records["url"];
    const discord = records["com.discord"];

    let markdown = "";
    if (avatarUrl) {
      markdown += `\n<img src="${avatarUrl}" alt="avatar" width="100" height="100" />\n\n---\n`;
    }
    markdown += `# ${ensName}\n`;
    markdown += `**Address:** \`${ethAddress}\`\n\n`;
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
        navigationTitle={ensName}
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
            <Action.CopyToClipboard content={ensName} title="Copy ENS Name" />
            <Action.CopyToClipboard content={ethAddress} title="Copy Address" />
            <Action.OpenInBrowser url={`https://app.ens.domains/${ensName}`} title="View on ENS" />
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

  return <Detail isLoading={loading} markdown={`Looking up ENS details for **${ethAddress}**...`} />;
}

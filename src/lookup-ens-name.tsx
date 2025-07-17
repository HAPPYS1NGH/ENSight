import { ActionPanel, Action, Detail, showToast, Toast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function Command(props: LaunchProps<{ arguments: Arguments.LookupEnsName }>) {
  const name = props.arguments.name;
  const [address, setAddress] = useState<string | null>(null);
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
        } else {
          setAddress(resolved);
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
    return (
      <Detail
        isLoading={false}
        markdown={`**${name}**\n\n\`\`\`${address}\`\`\``}
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

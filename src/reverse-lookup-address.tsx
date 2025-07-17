import { ActionPanel, Action, Detail, showToast, Toast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function Command(props: LaunchProps<{ arguments: Arguments.ReverseLookupAddress }>) {
  const ethAddress = props.arguments.ethAddress;
  const [ensName, setEnsName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleLookup() {
      try {
        if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
          setError("Invalid Ethereum address.");
          await showToast({ style: Toast.Style.Failure, title: "Invalid address" });
          setLoading(false);
          return;
        }
        await showToast({ style: Toast.Style.Animated, title: "Looking up ENS name (ethers.js)..." });
        const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
        const name = await provider.lookupAddress(ethAddress);
        if (!name) {
          setError("No ENS name found for this address.");
          await showToast({ style: Toast.Style.Failure, title: "No ENS name found." });
        } else {
          setEnsName(name);
          await showToast({ style: Toast.Style.Success, title: "ENS name found!" });
        }
      } catch (e: unknown) {
        setError("Failed to lookup ENS name.");
        const message = e instanceof Error ? e.message : String(e);
        await showToast({ style: Toast.Style.Failure, title: "Error", message });
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
    return (
      <Detail
        isLoading={false}
        markdown={`**${ethAddress}**\n\n\`\`\`${ensName}\`\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={ensName} title="Copy ENS Name" />
            <Action.OpenInBrowser url={`https://app.ens.domains/${ensName}`} title="View on ENS" />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={loading} markdown={`Looking up ENS name for **${ethAddress}**...`} />;
}

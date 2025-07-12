import { ActionPanel, Action, Form, showToast, Toast, Detail } from "@raycast/api";
import { useState } from "react";
import { ethers } from "ethers";

export default function Command() {
  const [ethAddress, setEthAddress] = useState("");
  const [ensName, setEnsName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(values: { ethAddress: string }) {
    setLoading(true);
    setError(null);
    setEnsName(null);
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(values.ethAddress)) {
        setError("Invalid Ethereum address.");
        await showToast({ style: Toast.Style.Failure, title: "Invalid address" });
        setLoading(false);
        return;
      }
      await showToast({ style: Toast.Style.Animated, title: "Looking up ENS name (ethers.js)..." });
      const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
      const name = await provider.lookupAddress(values.ethAddress);
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

  if (ensName) {
    return (
      <Detail
        isLoading={loading}
        markdown={`**${ethAddress}**\n\n\`\`${ensName}\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={ensName} title="Copy ENS Name" />
            <Action.OpenInBrowser url={`https://app.ens.domains/${ensName}`} title="View on ENS" />
            <Action
              title="Lookup Another"
              onAction={() => {
                setEnsName(null);
                setEthAddress("");
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reverse Lookup Address" onSubmit={handleLookup} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ethAddress"
        title="Ethereum Address"
        placeholder="0x..."
        value={ethAddress}
        onChange={setEthAddress}
        error={error ? error : undefined}
      />
    </Form>
  );
}

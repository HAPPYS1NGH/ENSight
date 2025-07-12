import { ActionPanel, Action, Form, showToast, Toast, Detail } from "@raycast/api";
import { useState } from "react";
import { ethers } from "ethers";

export default function Command() {
  const [ensName, setEnsName] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(values: { ensName: string }) {
    setLoading(true);
    setError(null);
    setAddress(null);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Testing ethers.js ENS..." });
      const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
      const ethersAddress = await provider.resolveName(values.ensName);
      if (!ethersAddress) {
        setError("ethers.js: No address found for this ENS name.");
        await showToast({ style: Toast.Style.Failure, title: "ethers.js: No address found." });
        setLoading(false);
        return;
      }
      setAddress(ethersAddress);
      await showToast({ style: Toast.Style.Success, title: "ethers.js: Address found!", message: ethersAddress });
      setLoading(false);
      return;
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to resolve ENS name.");
      const message = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setLoading(false);
    }
  }

  if (address) {
    return (
      <Detail
        isLoading={loading}
        markdown={`**${ensName}**\n\n\`\`${address}\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={address} title="Copy Address" />
            <Action.OpenInBrowser url={`https://etherscan.io/address/${address}`} title="View on Etherscan" />
            <Action
              title="Lookup Another"
              onAction={() => {
                setAddress(null);
                setEnsName("");
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
          <Action.SubmitForm title="Lookup ENS Name" onSubmit={handleLookup} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ensName"
        title="ENS Name"
        placeholder="vitalik.eth"
        value={ensName}
        onChange={setEnsName}
        error={error ? error : undefined}
      />
    </Form>
  );
}

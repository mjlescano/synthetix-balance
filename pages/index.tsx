"use client";

import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { Input, Container, Spacer, Text, Table } from "@nextui-org/react";
import { getAddress, isAddress } from "viem";
import { useDebounce } from "use-debounce";
import { getWalletBalances } from "../hooks/get-balances";

interface Params extends BaseParams {
  params: {
    address?: string;
  };
}

export default function Page({ params }: BaseProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState("default");
  const [validAddress, setValidAddress] = useState("");
  const [address] = useDebounce(validAddress, 600);
  const walletBalances = getWalletBalances(address);

  useEffect(() => {
    if (!walletAddress) {
      setValidAddress("");
      setWalletStatus("default");
      return;
    }

    if (isAddress(walletAddress)) {
      const address = getAddress(walletAddress);
      setWalletAddress(address);
      setValidAddress(address);
      setWalletStatus("default");
    } else {
      setWalletStatus("error");
      setValidAddress("");
    }
  }, [walletAddress]);

  return (
    <>
      <Head>
        <title>Synthetix Balance</title>
        <meta name="description" content="Get the wallet's debt on Synthetix" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container xs>
        <Text
          h1
          css={{
            textGradient: "90deg, #ed1eff -10%, #00d1ff 80%",
            textAlign: "center",
          }}
          weight="bold"
        >
          Synthetix Governance
        </Text>
        <Text h3>Ecosystem Voting Power</Text>
        <Text>
          Here is the total voting power present on both L1 and L2 for the whole
          ecosystem.
        </Text>
        <Table
          compact
          aria-label="Users balances on all the networks"
          css={{ height: "auto", minWidth: "100%", fontFamily: "monospace" }}
        >
          <Table.Header>
            <Table.Column>Network</Table.Column>
            <Table.Column>Value (Gwei)</Table.Column>
          </Table.Header>
          <Table.Body>
            <Table.Row key="1">
              <Table.Cell>L1</Table.Cell>
              <Table.Cell>{50}</Table.Cell>
            </Table.Row>
            <Table.Row key="2">
              <Table.Cell>L2</Table.Cell>
              <Table.Cell>{50}</Table.Cell>
            </Table.Row>
            <Table.Row key="2">
              <Table.Cell>
                <Text b>Total</Text>
              </Table.Cell>
              <Table.Cell>
                <Text b>{100}</Text>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
        <Spacer />
        <Text h3>Wallet Voting Power</Text>
        <Text>
          Complete the wallet address that you want to get the current voting
          power, and its total percentages in the global context:
        </Text>
        <Spacer />
        <Input
          aria-label="Wallet Address"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          clearable
          fullWidth
          id="walletAddress"
          labelLeft="Address:"
          onChange={(evt) => setWalletAddress(evt.target.value)}
          placeholder="0x0000000000000000000000000000000000000000"
          spellCheck="false"
          status={walletStatus}
          value={walletAddress}
        />
        <Spacer />
        {address && (
          <Table
            compact
            aria-label="Users balances on all the networks"
            css={{ height: "auto", minWidth: "100%", fontFamily: "monospace" }}
          >
            <Table.Header>
              <Table.Column></Table.Column>
              <Table.Column>Value (Gwei)</Table.Column>
            </Table.Header>
            <Table.Body>
              <Table.Row key="1">
                <Table.Cell>Balance L1</Table.Cell>
                <Table.Cell>{walletBalances.l1.toString()}</Table.Cell>
              </Table.Row>
              <Table.Row key="2">
                <Table.Cell>Balance L2</Table.Cell>
                <Table.Cell>{walletBalances.l2.toString()}</Table.Cell>
              </Table.Row>
              <Table.Row key="3">
                <Table.Cell>
                  <Text b>Linear Voting Power</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text b>{walletBalances.linearTotal.toString()}</Text>
                </Table.Cell>
              </Table.Row>
              <Table.Row key="4">
                <Table.Cell>
                  <Text b>Sqrt Voting Power</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text b>{walletBalances.sqrtTotal.toString()}</Text>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        )}
      </Container>
    </>
  );
}

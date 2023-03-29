import { useState, useEffect, useMemo } from "react";
import snx from "synthetix";
import { mainnet, optimism } from "viem/chains";
import {
  isAddress,
  createPublicClient,
  http,
  PublicClient,
  HttpTransport,
} from "viem";
import { SynthetixDebtShare } from "../abis";

type Contracts = [PublicClient<HttpTransport, any, true>, `0x${string}`][];

interface EcosystemBalance {
  l1: [bigint, number];
  l2: [bigint, number];
  linearTotal: [bigint, number];
  sqrtTotal: [bigint, number];
}

interface WalletBalance {
  l1: [bigint, number];
  l2: [bigint, number];
  linearTotal: [bigint, number];
  sqrtTotal: [bigint, number];
}

const DEFAULT_ECOSYSTEM_BALANCE = {
  l1: [0n, 0],
  l2: [0n, 0],
  linearTotal: [0n, 0],
  sqrtTotal: [0n, 0],
} satisfies EcosystemBalance;

const DEFAULT_WALLET_BALANCE = {
  l1: [0n, 0],
  l2: [0n, 0],
  linearTotal: [0n, 0],
  sqrtTotal: [0n, 0],
} satisfies WalletBalance;

export function getEcosystemBalances() {
  const contracts = _useDebtShareContracts();
  const [balances, setBalances] = useState<EcosystemBalance>(
    DEFAULT_ECOSYSTEM_BALANCE
  );

  useEffect(() => {
    if (!contracts) return;

    async function readBalances() {
      const [[L1Client, L1Address], [L2Client, L2Address]] = contracts;

      const [totalL1, totalL2] = await Promise.all([
        L1Client.readContract({
          address: L1Address,
          abi: SynthetixDebtShare,
          functionName: "totalSupply",
        }),
        L2Client.readContract({
          address: L2Address,
          abi: SynthetixDebtShare,
          functionName: "totalSupply",
        }),
      ]);

      const linearTotal = totalL1 + totalL2;
      const sqrtTotal = linearTotal <= 0 ? 0n : _sqrt(linearTotal);

      setBalances({
        l1: [totalL1, _percentOf(totalL1, linearTotal)],
        l2: [totalL2, _percentOf(totalL2, linearTotal)],
        linearTotal: [linearTotal, 100],
        sqrtTotal: [sqrtTotal, 100],
      });
    }

    readBalances();
  }, [contracts]);

  return balances;
}

export function getWalletBalances(
  address: `0x${string}`,
  ecosystem: EcosystemBalance
) {
  const contracts = _useDebtShareContracts();
  const [balances, setBalances] = useState<WalletBalance>(
    DEFAULT_WALLET_BALANCE
  );

  useEffect(() => {
    if (!contracts || ecosystem.linearTotal[0] === 0n || !isAddress(address)) {
      return setBalances(DEFAULT_WALLET_BALANCE);
    }

    async function readBalances() {
      const [[L1Client, L1Address], [L2Client, L2Address]] = contracts;

      const [totalL1, totalL2] = await Promise.all([
        L1Client.readContract({
          address: L1Address,
          abi: SynthetixDebtShare,
          functionName: "balanceOf",
          args: [address],
        }),
        L2Client.readContract({
          address: L2Address,
          abi: SynthetixDebtShare,
          functionName: "balanceOf",
          args: [address],
        }),
      ]);

      const linearTotal = totalL1 + totalL2;
      const sqrtTotal = linearTotal <= 0 ? 0n : _sqrt(linearTotal);

      setBalances({
        l1: [totalL1, _percentOf(totalL1, ecosystem.l1[0])],
        l2: [totalL2, _percentOf(totalL2, ecosystem.l2[0])],
        linearTotal: [
          linearTotal,
          _percentOf(linearTotal, ecosystem.linearTotal[0]),
        ],
        sqrtTotal: [sqrtTotal, _percentOf(sqrtTotal, ecosystem.sqrtTotal[0])],
      });
    }

    readBalances();
  }, [address, ecosystem, contracts]);

  return balances;
}

function _useDebtShareContracts() {
  return useMemo(() => {
    const L1Client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
    const L2Client = createPublicClient({
      chain: optimism,
      transport: http(),
    });
    const L1Address = snx.getTarget({
      network: "mainnet",
      contract: "SynthetixDebtShare",
    }).address;
    const L2Address = snx.getTarget({
      network: "mainnet-ovm",
      contract: "SynthetixDebtShare",
    }).address;

    return [
      [L1Client, L1Address],
      [L2Client, L2Address],
    ] satisfies Contracts;
  }, []);
}

function _sqrt(value: bigint) {
  if (value < 0n) throw "square root of negative numbers is not supported";
  if (value < 2n) return value;

  function newtonIteration(n: bigint, x0: bigint): bigint {
    const x1 = (n / x0 + x0) >> 1n;
    if (x0 === x1 || x0 === x1 - 1n) return x0;
    return newtonIteration(n, x1);
  }

  return newtonIteration(value, 1n);
}

function _percentOf(n1: bigint, n2: bigint) {
  return Number((n1 * 100000n) / n2) / 1000;
}

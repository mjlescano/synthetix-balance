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

interface WalletBalance {
  l1: [bigint, bigint];
  l2: [bigint, bigint];
  linearTotal: [bigint, bigint];
  sqrtTotal: [bigint, bigint];
}

const DEFAULT_WALLET_BALANCE = {
  l1: [0n, 0n],
  l2: [0n, 0n],
  linearTotal: [0n, 0n],
  sqrtTotal: [0n, 0n],
} satisfies WalletBalance;

export function getWalletBalances(address: `0x${string}`) {
  const contracts = _useDebtShareContracts();
  const [balances, setBalances] = useState<WalletBalance>(
    DEFAULT_WALLET_BALANCE
  );

  useEffect(() => {
    if (!contracts || !isAddress(address)) {
      return setBalances(DEFAULT_WALLET_BALANCE);
    }

    async function readBalances() {
      const [[L1Client, L1Address], [L2Client, L2Address]] = contracts;

      const [totalL1, totalL2, percentL1, percentl2] = await Promise.all([
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
        L1Client.readContract({
          address: L1Address,
          abi: SynthetixDebtShare,
          functionName: "sharePercent",
          args: [address],
        }),
        L2Client.readContract({
          address: L2Address,
          abi: SynthetixDebtShare,
          functionName: "sharePercent",
          args: [address],
        }),
      ]);

      const linearTotal = totalL1 + totalL2;
      const sqrtTotal = linearTotal <= 0 ? 0n : _sqrt(linearTotal);

      setBalances({
        l1: [totalL1, percentL1],
        l2: [totalL2, percentl2],
        linearTotal: [linearTotal, 0n],
        sqrtTotal: [sqrtTotal, 0n],
      });
    }

    readBalances();
  }, [address, contracts]);

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
    });
    const L2Address = snx.getTarget({
      network: "mainnet-ovm",
      contract: "SynthetixDebtShare",
    });

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

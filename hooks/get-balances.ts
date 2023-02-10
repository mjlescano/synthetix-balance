import { useState, useEffect } from "react";
import snx from "synthetix";
import { mainnet, optimism, Chain } from "viem/chains";
import {
  isAddress,
  createPublicClient,
  http,
  PublicClient,
  HttpTransport,
} from "viem";

type Contracts = [PublicClient<HttpTransport, any, true>, `0x${string}`][];

interface WalletBalance {
  l1: [BigInt, BigInt];
  l2: [BigInt, BigInt];
  linearTotal: [BigInt, BigInt];
  sqrtTotal: [BigInt, BigInt];
}

const DEFAULT_WALLET_BALANCE = {
  l1: [0n, 0n],
  l2: [0n, 0n],
  linearTotal: [0n, 0n],
  sqrtTotal: [0n, 0n],
} satisfies WalletBalance;

export function getWalletBalances(address: string) {
  const contracts = _useDebtShareContracts();
  const [balances, setBalances] = useState<WalletBalance>(
    DEFAULT_WALLET_BALANCE
  );

  useEffect(() => {
    if (!contracts || !isAddress(address)) {
      return setBalances(DEFAULT_WALLET_BALANCE);
    }

    async function readBalances(contracts: Contracts) {
      const SynthetixDebtShareAbi = snx.getSource().SynthetixDebtShare.abi;

      const [[totall1, totall2], [percentL1, percentl2]] = await Promise.all([
        _call(contracts, {
          abi: SynthetixDebtShareAbi,
          functionName: "balanceOf",
          args: [address],
        }),
        _call(contracts, {
          abi: SynthetixDebtShareAbi,
          functionName: "sharePercent",
          args: [address],
        }),
      ]);

      const linearTotal = l1 + l2;
      const sqrtTotal = linearTotal <= 0 ? 0n : _sqrt(linearTotal);

      setBalances({
        l1,
        l2,
        linearTotal,
        sqrtTotal,
      });
    }

    readBalances(contracts);
  }, [address, contracts]);

  return balances;
}

function _useDebtShareContracts() {
  const [contracts, setContracts] = useState<Contracts>();

  useEffect(() => {
    const L1Client = _createClient(mainnet);
    const L2Client = _createClient(optimism);
    const L1Address = snx.getTarget({
      network: "mainnet",
      contract: "SynthetixDebtShare",
    });
    const L2Address = snx.getTarget({
      network: "mainnet-ovm",
      contract: "SynthetixDebtShare",
    });

    setContracts([
      [L1Client, L1Address],
      [L2Client, L2Address],
    ]);
  }, []);

  return contracts;
}

function _createClient(chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(),
  });
}

async function _call(targets: Contracts, params: unknown[]) {
  return await Promise.all(
    targets.map(([client, address]) =>
      client.readContract({
        address,
        ...params,
      })
    )
  );
}

function _sqrt(value: BigInt) {
  if (value < 0n) throw "square root of negative numbers is not supported";
  if (value < 2n) return value;

  function newtonIteration(n: BigInt, x0: BigInt) {
    const x1 = (n / x0 + x0) >> 1n;
    if (x0 === x1 || x0 === x1 - 1n) return x0;
    return newtonIteration(n, x1) as BigInt;
  }

  return newtonIteration(value, 1n);
}

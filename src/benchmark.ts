import { status as GrpcStatus } from "@grpc/grpc-js";
import { SubscribeUpdateTransaction as GeyserTrx } from "@triton-one/yellowstone-grpc";
import { GeyserClient } from "./geyser";
import { DeezStreamClient, SubscribeOptions, SubscribeTransactionsResponse as DeezStreamTrx } from "@deezstream/grpc-client";
import bs58 from "bs58";

type TrxTimestamp = {
  deezStreamTimestamp?: number;
  geyserTimestamp?: number;
};

// --- 添加了 export ---
export class Benchmark {
  private signatureMap = new Map<string, TrxTimestamp>();
  constructor(
    private readonly geyserClient: GeyserClient,
    private readonly deezStreamClient: DeezStreamClient,
    private readonly filters: SubscribeOptions
  ) {}

  public async perform(timeSeconds: number) {
    this.geyserClient.onTransaction((trx) => this.onGeyserTransaction(trx));
    this.deezStreamClient.on("transaction", (trx) => this.onDeezStreamTransaction(trx));
    this.deezStreamClient.on("error", (err) => {
      // We expect a CANCELLED error when we stop the stream, so we can ignore it.
      if (err.code !== GrpcStatus.CANCELLED) {
        console.error("DeezStreamClient error:", err);
      }
    });

    console.log("Starting geyser...");
    this.geyserClient.start();
    
    console.log("Starting deezstream...");
    // subscribeTransactions returns a stream that we can cancel later
    const deezStream = this.deezStreamClient.subscribeTransactions(this.filters);

    await new Promise<void>((res) =>
      setTimeout(() => {
        this.geyserClient.stop();
        deezStream.cancel(); // Stop the deezstream
        console.log("Benchmark finished. Stopping clients...");
        res();
      }, timeSeconds * 1000)
    );
  }

  public printReport() {
    let totalTimeDiff = 0;
    let matchedTransactions = 0;
    let deezStreamOnlyCount = 0;
    let geyserOnlyCount = 0;
    let deezStreamWins = 0;
    let geyserWins = 0;

    this.signatureMap.forEach((time) => {
      if (time.geyserTimestamp && time.deezStreamTimestamp) {
        const diff = time.geyserTimestamp - time.deezStreamTimestamp;
        if (diff > 0) {
          deezStreamWins++;
        } else if (diff < 0) {
          geyserWins++;
        }
        totalTimeDiff += diff;
        matchedTransactions++;
      } else if (time.deezStreamTimestamp) {
        deezStreamOnlyCount++;
      } else if (time.geyserTimestamp) {
        geyserOnlyCount++;
      }
    });

    const totalDeezStream = matchedTransactions + deezStreamOnlyCount;
    const totalGeyser = matchedTransactions + geyserOnlyCount;

    if (matchedTransactions > 0) {
      const avgDiff = totalTimeDiff / matchedTransactions;
      const winner = avgDiff > 0 ? "DeezStream" : "Geyser";
      const absAvgDiff = Math.abs(avgDiff);

      console.log("\n⏱️ --- Performance Analysis (on matched transactions) ---");
      console.log(`\n🏆 Winner: ${winner}`);
      
      if (avgDiff > 0) {
        console.log(`DeezStream was FASTER than Geyser by an average of ${absAvgDiff.toFixed(2)} ms.`);
      } else if (avgDiff < 0) {
        console.log(`Geyser was FASTER than DeezStream by an average of ${absAvgDiff.toFixed(2)} ms.`);
      } else {
        console.log("DeezStream and Geyser performed identically.");
      }
      
      console.log("\n📊 --- Lead Analysis (Priority Rate) ---");
      const deezStreamWinRate = (deezStreamWins / matchedTransactions) * 100;
      const geyserWinRate = (geyserWins / matchedTransactions) * 100;
      console.log(`DeezStream First: ${deezStreamWins} times (${deezStreamWinRate.toFixed(2)}%)`);
      console.log(`Geyser First:     ${geyserWins} times (${geyserWinRate.toFixed(2)}%)`);

    } else {
      console.log("\n⏱️ --- Performance Analysis ---");
      console.log("No transactions were matched by both services, cannot compare latency.");
    }

    console.log("\n===============================================\n");
  }

  private onGeyserTransaction(trx: GeyserTrx) {
    if (!trx.transaction) {
      return;
    }
    const timestamp = Date.now();
    const signature = bs58.encode(trx.transaction.signature);
    // console.log("Geyser got trx: ", signature);
    if (this.signatureMap.has(signature)) {
      const trxTimestamp = this.signatureMap.get(signature)!;
      if (trxTimestamp.geyserTimestamp) {
        // already tracked
        return;
      }
      trxTimestamp.geyserTimestamp = timestamp;
      console.log(`Transaction matched: ${signature}`);
    } else {
      this.signatureMap.set(signature, {
        geyserTimestamp: timestamp,
      });
    }
  }

  private onDeezStreamTransaction(trx: DeezStreamTrx) {
    if (!trx.transaction?.transaction?.signatures.length) {
      return;
    }
    const timestamp = Date.now();
    const signature = bs58.encode(trx.transaction.transaction.signatures[0]);
    if (this.signatureMap.has(signature)) {
      const trxTimestamp = this.signatureMap.get(signature)!;
      if (trxTimestamp.deezStreamTimestamp) {
        // already tracked
        return;
      }
      trxTimestamp.deezStreamTimestamp = timestamp;
      console.log(`Transaction matched: ${signature}`);
    } else {
      this.signatureMap.set(signature, {
        deezStreamTimestamp: timestamp,
      });
    }
  }
}
